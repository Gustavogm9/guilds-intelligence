#!/usr/bin/env python3

import json
import os
import re
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

try:
    from anthropic import Anthropic
except Exception:  # pragma: no cover - dependency is optional at runtime
    Anthropic = None


def _normalize_text(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", " ", str(value).lower())
    return " ".join(normalized.split())


def _estimate_token_count(*values: str) -> int:
    combined = " ".join(str(value or "") for value in values)
    normalized = re.sub(r"\s+", " ", combined).strip()
    if not normalized:
        return 0
    return max(1, len(normalized) // 4)


def _tokenize(*values: str) -> set[str]:
    tokens: set[str] = set()
    for value in values:
        for token in _normalize_text(value).split():
            if len(token) >= 4:
                tokens.add(token)
    return tokens


def _extract_client_keywords(client: dict[str, Any]) -> set[str]:
    tokens = _tokenize(
        client.get("nome_empresa", ""),
        client.get("setor", ""),
        client.get("resumo_negocio", ""),
    )

    for niche in client.get("nichos_mapeados_pelo_agente") or []:
        tokens.update(_tokenize(str(niche)))

    for goal in client.get("objetivos") or []:
        tokens.update(_tokenize(str(goal)))

    for pain in client.get("dores") or []:
        tokens.update(_tokenize(str(pain)))

    for product in client.get("produtos_servicos") or []:
        if isinstance(product, dict):
            tokens.update(_tokenize(product.get("nome", ""), product.get("descricao", "")))
        else:
            tokens.update(_tokenize(str(product)))

    return tokens


def _extract_objective_keywords(client: dict[str, Any]) -> set[str]:
    tokens: set[str] = set()
    for goal in client.get("objetivos") or []:
        tokens.update(_tokenize(str(goal)))
    return tokens


def _classify_signal_theme(item: dict[str, Any]) -> tuple[str, float]:
    title = str(item.get("title") or "")
    summary = str(item.get("summary") or "")
    tokens = _tokenize(title, summary)

    theme_rules = {
        "demanda": {"mercado", "cliente", "demanda", "consumo", "procura", "growth", "pipeline"},
        "concorrencia": {"compet", "marketshare", "player", "rival", "benchmark", "disputa"},
        "tecnologia": {"ia", "ai", "tecnologia", "software", "plataforma", "automacao", "dados"},
        "regulacao": {"lei", "regul", "compliance", "tribut", "governo", "policy", "norma"},
        "marca": {"brand", "marca", "posicion", "reput", "campanha", "mensagem"},
        "operacao": {"operacao", "logistica", "processo", "eficiencia", "produtiv", "time"},
    }

    best_theme = "mercado"
    best_score = 0.0

    for theme, markers in theme_rules.items():
        score = 0.0
        for marker in markers:
            if any(marker in token for token in tokens):
                score += 1.0
        if score > best_score:
            best_theme = theme
            best_score = score

    normalized_score = round(min(1.0, best_score / 3.0), 2)
    return best_theme, normalized_score


def _configured_feed_urls() -> list[str]:
    raw_urls = os.getenv("GUILDS_EXTERNAL_FEED_URLS", "")
    return [item.strip() for item in raw_urls.split(",") if item.strip()]


def _configured_feed_map() -> dict[str, list[str]]:
    raw_mapping = os.getenv("GUILDS_EXTERNAL_FEED_MAP", "").strip()
    if not raw_mapping:
        return {}

    try:
        parsed = json.loads(raw_mapping)
    except json.JSONDecodeError:
        return {}

    if not isinstance(parsed, dict):
        return {}

    mapping: dict[str, list[str]] = {}
    for key, value in parsed.items():
        if isinstance(value, list):
            mapping[_normalize_text(str(key))] = [str(item).strip() for item in value if str(item).strip()]
    return mapping


def _select_feed_urls_for_client(client: dict[str, Any]) -> list[str]:
    base_urls = _configured_feed_urls()
    mapped_urls: list[str] = []
    feed_map = _configured_feed_map()

    client_segments = [
        str(client.get("setor") or ""),
        *[str(item) for item in (client.get("nichos_mapeados_pelo_agente") or [])],
    ]

    for segment in client_segments:
        normalized = _normalize_text(segment)
        for key, urls in feed_map.items():
            if key and key in normalized:
                mapped_urls.extend(urls)

    deduped_urls: list[str] = []
    seen: set[str] = set()
    for url in [*mapped_urls, *base_urls]:
        if url and url not in seen:
            deduped_urls.append(url)
            seen.add(url)

    return deduped_urls


def _fetch_feed(url: str) -> list[dict[str, Any]]:
    request = Request(
        url,
        headers={
            "User-Agent": "GuildsIntelligenceBot/1.0 (+https://guilds.com.br)",
            "Accept": "application/rss+xml, application/xml, text/xml",
        },
    )
    with urlopen(request, timeout=8) as response:
        body = response.read()

    root = ET.fromstring(body)
    items: list[dict[str, Any]] = []

    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        description = (item.findtext("description") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        source_name = urlparse(link or url).netloc.replace("www.", "") or urlparse(url).netloc.replace("www.", "")

        published_at = None
        if pub_date:
            try:
                published_at = parsedate_to_datetime(pub_date).isoformat()
            except (TypeError, ValueError, IndexError):
                published_at = None

        items.append(
            {
                "title": title,
                "summary": re.sub(r"<[^>]+>", "", description)[:400],
                "url": link or url,
                "source_name": source_name,
                "published_at": published_at,
            }
        )

    return items


def _dedupe_signals(signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for signal in signals:
        dedupe_key = "|".join(
            [
                _normalize_text(signal.get("title") or ""),
                _normalize_text(signal.get("source_name") or ""),
            ]
        )
        if not dedupe_key.strip("|") or dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        deduped.append(signal)

    return deduped


def _theme_key(signal: dict[str, Any]) -> str:
    matched_keywords = signal.get("matched_keywords") or []
    if matched_keywords:
        return "|".join(sorted(str(keyword) for keyword in matched_keywords[:2]))
    return _normalize_text(signal.get("title") or "")


def _dedupe_signals_by_theme(signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen_themes: set[str] = set()

    for signal in signals:
        theme = _theme_key(signal)
        if not theme or theme in seen_themes:
            continue
        seen_themes.add(theme)
        deduped.append(signal)

    return deduped


def _heuristic_signal_summary(client: dict[str, Any], signals: list[dict[str, Any]]) -> str | None:
    if not signals:
        return None

    top_sources = ", ".join(sorted({signal.get("source_name", "fonte externa") for signal in signals[:3]}))
    keywords: list[str] = []
    for signal in signals:
        for keyword in signal.get("matched_keywords") or []:
            if keyword not in keywords:
                keywords.append(keyword)
            if len(keywords) == 4:
                break
        if len(keywords) == 4:
            break

    keyword_text = ", ".join(keywords) if keywords else "sinais de mercado"
    objective = str((client.get("objetivos") or ["prioridade executiva"])[0]).lower()
    return (
        f"As fontes {top_sources} reforcam temas ligados a {keyword_text}, "
        f"com potencial de impactar {objective} nas proximas semanas."
    )


def _llm_enabled() -> bool:
    return os.getenv("GUILDS_EXTERNAL_LLM_ENABLED", "").lower() in {"1", "true", "yes"}


def _llm_signal_summary(client: dict[str, Any], signals: list[dict[str, Any]]) -> str | None:
    if not signals or not _llm_enabled() or not Anthropic or not os.getenv("ANTHROPIC_API_KEY"):
        return None

    client_name = client.get("nome_empresa", "cliente")
    objective = str((client.get("objetivos") or ["prioridade executiva"])[0])
    signal_lines = []
    for signal in signals[:4]:
        signal_lines.append(
            f"- fonte: {signal.get('source_name')}; titulo: {signal.get('title')}; "
            f"keywords: {', '.join(signal.get('matched_keywords') or [])}; "
            f"resumo: {signal.get('summary')}"
        )

    prompt = (
        "Voce esta resumindo sinais externos para um relatorio executivo B2B.\n"
        f"Cliente: {client_name}\n"
        f"Objetivo principal: {objective}\n"
        "Sinais externos:\n"
        + "\n".join(signal_lines)
        + "\nGere uma sintese curta em portugues, com no maximo 2 frases, "
        "focada no que muda prioridade ou narrativa comercial."
    )

    try:
        response = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY")).messages.create(
            model=os.getenv("GUILDS_EXTERNAL_LLM_MODEL", "claude-3-5-haiku-latest"),
            max_tokens=140,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        blocks = getattr(response, "content", []) or []
        text_parts = [getattr(block, "text", "") for block in blocks if getattr(block, "type", "") == "text"]
        summary = " ".join(part.strip() for part in text_parts if part.strip()).strip()
        return summary[:500] if summary else None
    except Exception:
        return None


RSS_ENRICHMENT_PROMPT = """Você é um analista de inteligência de mercado de nível McKinsey.
Recebeu sinais de mercado extraídos de feeds RSS para a empresa "{company_name}" (setor: {sector}).
Objetivos do cliente: {objectives}

SINAIS RSS:
{signals_json}

Para CADA sinal, avalie e retorne um JSON enriquecido com:
{{
  "index": <índice original do sinal (0-based)>,
  "predictive_score": 0-100 (quanto mais preditivo de tendência futura, maior. 80+ = forte sinal de tendência),
  "is_trend": true/false (verdadeiro se aponta para algo que SERÁ grande no futuro),
  "theme": "tecnologia|regulacao|concorrencia|demanda|marca|operacao|mercado|inovacao",
  "matched_keywords": ["keyword1", "keyword2", "keyword3"] (até 6 termos-chave relevantes),
  "enhanced_summary": "Resumo executivo do insight com implicações para o cliente (máx 200 chars)"
}}

CRITÉRIOS:
- predictive_score 80-100: Inovação disruptiva, mudança regulatória iminente, novo paradigma
- predictive_score 60-79: Tendência em formação, movimentação de grandes players
- predictive_score 40-59: Notícia relevante mas sem caráter preditivo forte
- predictive_score 0-39: Informação contextual, não preditiva

Responda APENAS com um array JSON válido. Sem texto adicional."""


def _llm_structured_enrichment(
    client: dict[str, Any],
    signals: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], float]:
    """
    Usa o Claude para enriquecer sinais RSS com dados estruturados
    (predictive_score, is_trend, theme, matched_keywords) nos mesmos
    moldes do Motor Global de Inteligência.

    Retorna (sinais_enriquecidos, custo_estimado_usd).
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not Anthropic or not signals:
        return signals, 0.0

    company_name = client.get("nome_empresa", "cliente")
    sector = (client.get("perfil_negocio") or {}).get("setor", "") or client.get("setor", "")
    objectives = ", ".join(str(o) for o in (client.get("objetivos") or ["crescimento"])[:3])

    signals_for_prompt = []
    for i, signal in enumerate(signals):
        signals_for_prompt.append({
            "index": i,
            "title": signal.get("title", ""),
            "summary": signal.get("summary", "")[:400],
            "source_name": signal.get("source_name", ""),
            "url": signal.get("url", ""),
        })

    prompt = RSS_ENRICHMENT_PROMPT.format(
        company_name=company_name,
        sector=sector,
        objectives=objectives,
        signals_json=json.dumps(signals_for_prompt, ensure_ascii=False, indent=2),
    )

    try:
        anthropic = Anthropic(api_key=api_key)
        response = anthropic.messages.create(
            model=os.getenv("GUILDS_EXTERNAL_LLM_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=2000,
            temperature=0.1,
            messages=[{"role": "user", "content": prompt}],
        )

        text = ""
        for block in getattr(response, "content", []) or []:
            if getattr(block, "type", "") == "text":
                text += getattr(block, "text", "")

        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)

        enrichments = json.loads(text)
        if not isinstance(enrichments, list):
            return signals, 0.0

        # Mapear enrichments por índice
        enrichment_map: dict[int, dict[str, Any]] = {}
        for item in enrichments:
            idx = item.get("index")
            if isinstance(idx, int) and 0 <= idx < len(signals):
                enrichment_map[idx] = item

        # Aplicar enriquecimentos aos sinais
        enriched_signals = []
        for i, signal in enumerate(signals):
            enriched = {**signal}
            if i in enrichment_map:
                e = enrichment_map[i]
                enriched["predictive_score"] = max(0, min(100, int(e.get("predictive_score", 50))))
                enriched["relevance_score"] = round(enriched["predictive_score"] / 100, 2)
                enriched["is_trend"] = bool(e.get("is_trend", False))
                if e.get("theme"):
                    enriched["theme"] = e["theme"]
                    enriched["theme_confidence"] = 0.90
                if e.get("matched_keywords"):
                    enriched["matched_keywords"] = e["matched_keywords"][:6]
                if e.get("enhanced_summary"):
                    enriched["summary"] = e["enhanced_summary"]
            else:
                # Manter valores padrão com campo predictive_score para compat
                enriched.setdefault("predictive_score", int((enriched.get("relevance_score", 0.5)) * 100))
                enriched.setdefault("is_trend", False)
                enriched.setdefault("theme_confidence", enriched.get("theme_confidence", 0.5))

            enriched_signals.append(enriched)

        # Re-ordenar por predictive_score
        enriched_signals.sort(key=lambda x: x.get("predictive_score", 0), reverse=True)

        # Estimar custo
        prompt_tokens = _estimate_token_count(prompt)
        output_tokens = _estimate_token_count(text)
        cost = round((prompt_tokens * 3.0 + output_tokens * 15.0) / 1_000_000, 4)

        return enriched_signals, cost
    except Exception as exc:
        print(f"[external_intelligence] LLM enrichment failed: {exc}")
        # Adicionar campos mínimos de compatibilidade
        for signal in signals:
            signal.setdefault("predictive_score", int((signal.get("relevance_score", 0.5)) * 100))
            signal.setdefault("is_trend", False)
        return signals, 0.0


def load_external_intelligence(client: dict[str, Any]) -> dict[str, Any]:
    feed_urls = _select_feed_urls_for_client(client)
    if not feed_urls:
        return {
            "signals": [],
            "summary": None,
            "provider": "rss_feeds",
            "fetched_at": datetime.utcnow().isoformat(),
            "mode": "disabled",
        }

    client_keywords = _extract_client_keywords(client)
    objective_keywords = _extract_objective_keywords(client)
    matches: list[dict[str, Any]] = []
    feeds_considered = 0

    for feed_url in feed_urls[:8]:
        try:
            feeds_considered += 1
            for item in _fetch_feed(feed_url):
                item_tokens = _tokenize(item.get("title", ""), item.get("summary", ""))
                overlap = sorted(client_keywords & item_tokens)
                if len(overlap) < 2:
                    continue

                objective_overlap = sorted(objective_keywords & item_tokens)
                relevance_score = min(1.0, len(overlap) / 6.0)
                objective_boost = min(0.35, len(objective_overlap) * 0.1)
                freshness_boost = 0.0
                published_at = item.get("published_at")
                if isinstance(published_at, str) and published_at:
                    freshness_boost = 0.05

                final_score = round(min(1.0, relevance_score + objective_boost + freshness_boost), 2)
                theme, theme_confidence = _classify_signal_theme(item)
                matches.append(
                    {
                        **item,
                        "matched_keywords": overlap[:6],
                        "objective_keywords": objective_overlap[:4],
                        "relevance_score": final_score,
                        "objective_alignment_score": round(min(1.0, objective_boost), 2),
                        "theme": theme,
                        "theme_confidence": theme_confidence,
                    }
                )
        except Exception:
            continue

    ranked = sorted(
        matches,
        key=lambda item: (
            item.get("relevance_score") or 0.0,
            item.get("objective_alignment_score") or 0.0,
            item.get("published_at") or "",
        ),
        reverse=True,
    )
    deduped_ranked = _dedupe_signals(ranked)
    themed_ranked = _dedupe_signals_by_theme(deduped_ranked)
    signals = themed_ranked[:8]  # Pegar mais sinais para o Claude filtrar melhor

    summary = None
    summary_mode = "none"
    llm_used = False
    estimated_cost_usd = 0.0

    if signals:
        # Fase 4: Enriquecer sinais com Claude (síntese estruturada)
        signals, enrichment_cost = _llm_structured_enrichment(client, signals)
        estimated_cost_usd += enrichment_cost
        if enrichment_cost > 0:
            llm_used = True

        # Limitar a 5 melhores após enriquecimento
        signals = signals[:5]

        # Gerar resumo executivo
        summary = _llm_signal_summary(client, signals)
        if summary:
            summary_mode = "llm_enriched"
            llm_used = True
            prompt_tokens = _estimate_token_count(
                client.get("nome_empresa", ""),
                client.get("setor", ""),
                *[
                    f"{signal.get('title', '')} {signal.get('summary', '')}"
                    for signal in signals[:4]
                ],
            )
            output_tokens = _estimate_token_count(summary)
            estimated_cost_usd += round((prompt_tokens * 0.8 + output_tokens * 4.0) / 1_000_000, 4)
        else:
            summary = _heuristic_signal_summary(client, signals)
            summary_mode = "heuristic"

    return {
        "signals": signals,
        "summary": summary,
        "provider": "rss_feeds_enriched",
        "fetched_at": datetime.utcnow().isoformat(),
        "mode": "active_enriched" if llm_used else ("active" if signals else "no_matches"),
        "feeds_considered": feeds_considered,
        "summary_mode": summary_mode,
        "llm_used": llm_used,
        "estimated_cost_usd": round(estimated_cost_usd, 4),
    }
