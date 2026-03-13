#!/usr/bin/env python3
"""
Motor Global de Inteligência Preditiva — Guilds Intelligence Engine

Este módulo implementa:
1. Normalização de nichos de cliente → tópicos globais
2. Busca ativa multi-região via Tavily AI
3. Síntese e persistência de Nós de Inteligência (Intelligence Nodes)
4. Cache inteligente para reuso entre clientes
"""

import json
import os
import re
import unicodedata
from datetime import datetime, timezone, timedelta
from typing import Any

try:
    from tavily import TavilyClient
except ImportError:
    TavilyClient = None

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

from supabase import Client


# ─────────────────────────────────────────────────────────────
# 1. NORMALIZAÇÃO DE NICHOS → TÓPICOS GLOBAIS
# ─────────────────────────────────────────────────────────────

def _normalize_key(text: str) -> str:
    """Normaliza texto para chave de comparação: sem acentos, lowercase, sem pontuação."""
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ASCII", "ignore").decode("ASCII")
    cleaned = re.sub(r"[^a-z0-9]+", "_", ascii_text.lower()).strip("_")
    return cleaned


def ensure_global_topic(supabase: Client, niche_name: str) -> dict[str, Any]:
    """
    Garante que um tópico global normalizado exista para o nome do nicho.
    Retorna o registro existente ou cria um novo.
    """
    normalized = _normalize_key(niche_name)

    existing = (
        supabase.table("global_niche_topics")
        .select("*")
        .eq("normalized_key", normalized)
        .maybeSingle()
        .execute()
    )

    if existing.data:
        return existing.data

    new_topic = (
        supabase.table("global_niche_topics")
        .insert({
            "name": niche_name.strip(),
            "normalized_key": normalized,
        })
        .execute()
    )
    return new_topic.data[0] if new_topic.data else {"id": None, "name": niche_name, "normalized_key": normalized}


def link_client_niche_to_topic(supabase: Client, client_niche_id: str, topic_id: str) -> None:
    """Liga um nicho de cliente a um tópico global (idempotente)."""
    try:
        supabase.table("client_niche_topic_map").upsert(
            {
                "client_niche_id": client_niche_id,
                "topic_id": topic_id,
            },
            on_conflict="client_niche_id,topic_id",
        ).execute()
    except Exception:
        pass


def sync_client_niches_to_topics(supabase: Client, client_id: str) -> list[dict[str, Any]]:
    """
    Para cada nicho ativo do cliente, garante que um tópico global exista
    e cria a ligação. Retorna a lista de tópicos vinculados.
    """
    niches_res = (
        supabase.table("client_niches")
        .select("id, niche_name, relevance")
        .eq("client_id", client_id)
        .eq("is_active", True)
        .execute()
    )
    niches = niches_res.data or []
    topics = []

    for niche in niches:
        topic = ensure_global_topic(supabase, niche["niche_name"])
        if topic.get("id"):
            link_client_niche_to_topic(supabase, niche["id"], topic["id"])
            topics.append({
                "client_niche_id": niche["id"],
                "niche_name": niche["niche_name"],
                "relevance": niche["relevance"],
                "topic_id": topic["id"],
                "topic_name": topic["name"],
            })

    return topics


# ─────────────────────────────────────────────────────────────
# 2. BUSCA ATIVA MULTI-REGIÃO VIA TAVILY AI
# ─────────────────────────────────────────────────────────────

REGION_QUERY_TEMPLATES = {
    "BR": [
        "últimas tendências e notícias sobre {niche} no Brasil {year}",
        "{niche} mercado brasileiro oportunidades desafios {year}",
    ],
    "US": [
        "{niche} latest trends innovation United States {year}",
        "{niche} market analysis growth opportunities USA {year}",
    ],
    "EU": [
        "{niche} European market regulation trends {year}",
        "{niche} Europe innovation policy updates {year}",
    ],
    "CN": [
        "{niche} China market supply chain technology {year}",
        "{niche} Asia Pacific growth trends {year}",
    ],
}


def _build_search_queries(niche_name: str, industry: str = "") -> list[dict[str, str]]:
    """Gera queries de busca direcionadas por região para um nicho."""
    year = str(datetime.now().year)
    niche_with_industry = f"{niche_name} {industry}".strip() if industry else niche_name
    queries = []

    for region, templates in REGION_QUERY_TEMPLATES.items():
        for template in templates:
            query = template.format(niche=niche_with_industry, year=year)
            queries.append({"query": query, "region": region})

    return queries


def _search_tavily(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """Executa uma busca via Tavily AI."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key or not TavilyClient:
        return []

    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=query,
            search_depth="advanced",
            max_results=max_results,
            include_answer=False,
        )
        results = []
        for item in response.get("results", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", "")[:600],
                "score": item.get("score", 0),
            })
        return results
    except Exception as exc:
        print(f"[global_intelligence] Tavily search failed: {exc}")
        return []


def gather_raw_signals(niche_name: str, industry: str = "") -> list[dict[str, Any]]:
    """
    Executa buscas multi-região para um nicho e retorna todos os sinais brutos.
    """
    queries = _build_search_queries(niche_name, industry)
    all_signals: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for q in queries:
        results = _search_tavily(q["query"], max_results=5)
        for result in results:
            url = result.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_signals.append({
                    **result,
                    "region": q["region"],
                    "search_query": q["query"],
                })

    return all_signals


# ─────────────────────────────────────────────────────────────
# 3. SÍNTESE VIA CLAUDE (TRANSFORMAR SINAIS → NÓS DE INTELIGÊNCIA)
# ─────────────────────────────────────────────────────────────

NODE_SYNTHESIS_PROMPT = """Você é um analista de inteligência de mercado de nível McKinsey.
Analise os seguintes resultados de busca sobre o nicho "{niche_name}" e transforme cada um
em um "Nó de Inteligência" (Intelligence Node) com avaliação preditiva.

RESULTADOS DE BUSCA:
{raw_signals_json}

Para CADA resultado relevante (descarte lixo, propagandas e conteúdo irrelevante), gere um JSON:
{{
  "title": "Título conciso e informativo do insight (máx 120 chars)",
  "summary": "Resumo executivo do insight com implicações para empresas no nicho (máx 300 chars)",
  "url": "URL original",
  "source_name": "Nome do veículo/fonte",
  "region": "BR|US|EU|CN|LATAM|ASIA|GLOBAL",
  "predictive_score": 0-100 (quanto maior, mais preditivo de tendência futura. 80+ = forte sinal de tendência),
  "is_trend": true/false (verdadeiro se o sinal aponta para algo que SERÁ grande no futuro, não apenas notícia atual),
  "theme": "tecnologia|regulacao|concorrencia|demanda|marca|operacao|mercado|inovacao",
  "matched_keywords": ["keyword1", "keyword2", "keyword3"]
}}

CRITÉRIOS DE AVALIAÇÃO:
- predictive_score 80-100: Inovação disruptiva, mudança regulatória iminente, novo paradigma tecnológico
- predictive_score 60-79: Tendência em formação, cases de sucesso emergentes, movimentação de grandes players
- predictive_score 40-59: Notícia relevante mas sem caráter preditivo forte
- predictive_score 0-39: Informação contextual, não preditiva

IMPORTANTE:
- Foque em QUALIDADE, não quantidade. Descarte resultados genéricos.
- Priorize sinais que um CEO ou fundador de startup precisa saber HOJE.
- Identifique conexões entre regiões (ex: algo que já aconteceu nos EUA e pode chegar ao Brasil).

Responda APENAS com um array JSON válido. Sem texto adicional."""


def synthesize_intelligence_nodes(
    niche_name: str,
    raw_signals: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Usa o Claude para transformar sinais brutos em Nós de Inteligência qualificados."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not Anthropic or not raw_signals:
        return []

    try:
        anthropic = Anthropic(api_key=api_key)
        prompt = NODE_SYNTHESIS_PROMPT.format(
            niche_name=niche_name,
            raw_signals_json=json.dumps(raw_signals[:30], ensure_ascii=False, indent=2),
        )

        response = anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            temperature=0.1,
            messages=[{"role": "user", "content": prompt}],
        )

        text = ""
        for block in getattr(response, "content", []) or []:
            if getattr(block, "type", "") == "text":
                text += getattr(block, "text", "")

        # Extrair o JSON do response
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)

        nodes = json.loads(text)
        if isinstance(nodes, list):
            return nodes
        return []
    except Exception as exc:
        print(f"[global_intelligence] Claude synthesis failed: {exc}")
        return []


# ─────────────────────────────────────────────────────────────
# 4. PERSISTÊNCIA E CACHE INTELIGENTE
# ─────────────────────────────────────────────────────────────

def get_cached_nodes(
    supabase: Client,
    topic_id: str,
    max_age_days: int = 3,
    min_count: int = 5,
) -> list[dict[str, Any]]:
    """Busca nós de inteligência em cache recente para um tópico."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=max_age_days)).isoformat()

    result = (
        supabase.table("niche_intelligence_nodes")
        .select("*")
        .eq("topic_id", topic_id)
        .gte("created_at", cutoff)
        .order("predictive_score", desc=True)
        .limit(30)
        .execute()
    )

    nodes = result.data or []
    if len(nodes) >= min_count:
        return nodes
    return []


def save_intelligence_nodes(
    supabase: Client,
    topic_id: str,
    nodes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Salva nós de inteligência no banco global, deduplicando por URL."""
    saved: list[dict[str, Any]] = []

    for node in nodes:
        url = node.get("url", "")

        # Verifica duplicata por URL
        if url:
            existing = (
                supabase.table("niche_intelligence_nodes")
                .select("id")
                .eq("url", url)
                .eq("topic_id", topic_id)
                .maybeSingle()
                .execute()
            )
            if existing.data:
                saved.append(existing.data)
                continue

        try:
            row = {
                "topic_id": topic_id,
                "title": (node.get("title") or "")[:500],
                "url": url or None,
                "summary": (node.get("summary") or "")[:2000],
                "source_name": (node.get("source_name") or "")[:200],
                "region": node.get("region", "GLOBAL"),
                "language": "pt" if node.get("region") == "BR" else "en",
                "predictive_score": max(0, min(100, int(node.get("predictive_score", 50)))),
                "is_trend": bool(node.get("is_trend", False)),
                "theme": node.get("theme"),
                "matched_keywords": node.get("matched_keywords", [])[:10],
            }

            if node.get("published_at"):
                row["published_at"] = node["published_at"]

            result = supabase.table("niche_intelligence_nodes").insert(row).execute()
            if result.data:
                saved.append(result.data[0])
        except Exception as exc:
            print(f"[global_intelligence] Failed to save node: {exc}")

    return saved


def record_client_signals(
    supabase: Client,
    client_niche_id: str,
    node_ids: list[str],
    report_id: str | None = None,
) -> None:
    """Registra quais nós foram entregues ao cliente."""
    for node_id in node_ids:
        try:
            row: dict[str, Any] = {
                "client_niche_id": client_niche_id,
                "node_id": node_id,
            }
            if report_id:
                row["report_id"] = report_id

            supabase.table("client_niche_signals").upsert(
                row,
                on_conflict="client_niche_id,node_id",
            ).execute()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────
# 5. PIPELINE PRINCIPAL: GlobalIntelligenceGatherer
# ─────────────────────────────────────────────────────────────

def gather_intelligence_for_client(
    supabase: Client,
    client_id: str,
    industry: str = "",
    report_id: str | None = None,
) -> dict[str, Any]:
    """
    Pipeline completo: para cada nicho ativo do cliente:
    1. Normaliza para tópico global
    2. Verifica cache
    3. Se cache vazio/velho → busca ativa + síntese
    4. Salva nós no banco global
    5. Registra entrega ao cliente
    
    Retorna dicionário com os nós organizados por nicho.
    """
    topics = sync_client_niches_to_topics(supabase, client_id)
    result: dict[str, Any] = {
        "niches_processed": 0,
        "nodes_from_cache": 0,
        "nodes_from_search": 0,
        "nodes_total": 0,
        "niche_intelligence": {},
    }

    for topic_info in topics:
        topic_id = topic_info["topic_id"]
        niche_name = topic_info["niche_name"]
        client_niche_id = topic_info["client_niche_id"]

        # Tentar cache primeiro
        cached = get_cached_nodes(supabase, topic_id)
        if cached:
            node_ids = [n["id"] for n in cached]
            record_client_signals(supabase, client_niche_id, node_ids, report_id)
            result["nodes_from_cache"] += len(cached)
            result["nodes_total"] += len(cached)
            result["niche_intelligence"][niche_name] = cached
            result["niches_processed"] += 1
            continue

        # Busca ativa
        raw_signals = gather_raw_signals(niche_name, industry)
        if not raw_signals:
            result["niches_processed"] += 1
            result["niche_intelligence"][niche_name] = []
            continue

        # Síntese via Claude
        synthesized = synthesize_intelligence_nodes(niche_name, raw_signals)
        if not synthesized:
            result["niches_processed"] += 1
            result["niche_intelligence"][niche_name] = []
            continue

        # Persistir
        saved = save_intelligence_nodes(supabase, topic_id, synthesized)
        node_ids = [n["id"] for n in saved if n.get("id")]
        record_client_signals(supabase, client_niche_id, node_ids, report_id)

        result["nodes_from_search"] += len(saved)
        result["nodes_total"] += len(saved)
        result["niche_intelligence"][niche_name] = saved
        result["niches_processed"] += 1

    return result


def get_intelligence_for_report(
    supabase: Client,
    client_id: str,
    industry: str = "",
    report_id: str | None = None,
) -> dict[str, Any]:
    """
    Versão otimizada para uso durante a geração de relatórios.
    Retorna um dicionário formatado para injeção no prompt do Claude.
    """
    intelligence = gather_intelligence_for_client(supabase, client_id, industry, report_id)

    # Formatar para o prompt do relatório
    formatted_signals: list[dict[str, Any]] = []
    for niche_name, nodes in intelligence.get("niche_intelligence", {}).items():
        for node in nodes:
            formatted_signals.append({
                "niche": niche_name,
                "title": node.get("title", ""),
                "summary": node.get("summary", ""),
                "source_name": node.get("source_name", ""),
                "region": node.get("region", "GLOBAL"),
                "predictive_score": node.get("predictive_score", 50),
                "relevance_score": round(node.get("predictive_score", 50) / 100, 2),
                "is_trend": node.get("is_trend", False),
                "theme": node.get("theme", "mercado"),
                "theme_confidence": 0.85 if node.get("theme") else 0.5,
                "matched_keywords": node.get("matched_keywords", []),
                "url": node.get("url", ""),
            })

    # Ordenar por score preditivo (mais relevantes primeiro)
    formatted_signals.sort(key=lambda x: x.get("predictive_score", 0), reverse=True)

    # Gerar resumo heurístico
    trend_count = sum(1 for s in formatted_signals if s.get("is_trend"))
    regions_covered = list({s.get("region", "GLOBAL") for s in formatted_signals})

    summary = None
    if formatted_signals:
        top_sources = ", ".join(
            sorted({s.get("source_name", "fonte") for s in formatted_signals[:5]})
        )
        summary = (
            f"Análise de mercado global cobrindo {len(formatted_signals)} sinais "
            f"de {len(regions_covered)} regiões ({', '.join(regions_covered)}). "
            f"{trend_count} sinais identificados como tendências futuras. "
            f"Fontes incluem: {top_sources}."
        )

    return {
        "signals": formatted_signals[:25],
        "summary": summary,
        "provider": "guilds_global_intelligence",
        "mode": "active_search" if intelligence.get("nodes_from_search", 0) > 0 else "cached",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "nodes_from_cache": intelligence.get("nodes_from_cache", 0),
        "nodes_from_search": intelligence.get("nodes_from_search", 0),
        "niches_processed": intelligence.get("niches_processed", 0),
        "feeds_considered": 0,
        "llm_used": intelligence.get("nodes_from_search", 0) > 0,
        "estimated_cost_usd": round(intelligence.get("nodes_from_search", 0) * 0.015, 4),
        "summary_mode": "global_synthesis" if summary else "none",
    }
