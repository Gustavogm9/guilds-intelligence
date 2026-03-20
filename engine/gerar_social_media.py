#!/usr/bin/env python3
"""
Guilds Social Media Generator v2 — Satori/Vercel OG Edition
============================================================
Este módulo NÃO desenha imagens — ele delega a renderização visual
para a rota `/api/og/social-card` do painel Next.js que usa Vercel
Satori (React → PNG). O Python cuida apenas da lógica de negócios,
orquestração e persistência.
"""

from __future__ import annotations
import os
import json
import ssl
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode

# ── Config ───────────────────────────────────────────────────────────

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
OG_BASE = f"{FRONTEND_URL}/api/og/social-card"
TIMEOUT = 30  # segundos

DATE_STR = datetime.now().strftime("%d/%m/%Y")

# ── i18n helpers ─────────────────────────────────────────────────────

def get_client_locale(client: dict) -> str:
    idioma = (
        client.get("preferencias_conteudo", {}).get("idioma")
        or client.get("preferred_language")
        or "pt-BR"
    )
    idioma_str = str(idioma).lower()
    if idioma_str.startswith("en"): return "en-US"
    if idioma_str.startswith("es"): return "es-ES"
    if idioma_str.startswith("fr"): return "fr-FR"
    return "pt-BR"

def is_english_client(client: dict) -> bool:
    return get_client_locale(client) == "en-US"

def tr(client: dict, pt: str, en: str) -> str:
    return pt if get_client_locale(client) == "pt-BR" else en

def build_social_copy(client: dict) -> dict[str, str]:
    return {
        "greeting": "GUILDS INTELLIGENCE",
        "action_label": tr(client, "AÇÃO:", "ACTION:"),
        "source_label": tr(client, "Fonte", "Source"),
        "for_label": tr(client, "Para", "For"),
        "report_for": tr(client, "Relatório estratégico para", "Strategic report for"),
        "market_title": tr(client, "Inteligência de Mercado", "Market Intelligence"),
        "story_title": tr(client, "Insights do Dia", "Today's Insights"),
        "cover_subtitle": tr(client, "Panorama preditivo para", "Predictive overview for"),
        "opportunity_type": tr(client, "Oportunidade Estratégica", "Strategic Opportunity"),
        "alert_type": tr(client, "Alerta Crítico", "Critical Alert"),
        "copies_title": tr(client, "COPIES PARA SOCIAL MEDIA", "SOCIAL MEDIA COPY"),
        "client_label": tr(client, "Cliente", "Client"),
        "date_label": tr(client, "Data", "Date"),
        "feed_cover_title": tr(client, "INSTAGRAM FEED - CAPA DO CARROSSEL", "INSTAGRAM FEED - CAROUSEL COVER"),
        "feed_card_title": tr(client, "INSTAGRAM FEED - CARD", "INSTAGRAM FEED - CARD"),
        "cover_caption_label": tr(client, "LEGENDA DA CAPA:", "COVER CAPTION:"),
        "caption_label": tr(client, "LEGENDA:", "CAPTION:"),
        "cover_caption_line_1": tr(client, "Inteligência de mercado do dia", "Today's market intelligence"),
        "cover_caption_line_2": tr(client, "o que está impactando", "what is impacting"),
        "cover_caption_line_3": tr(client, "o mercado hoje para o setor de", "the market today for the sector of"),
        "drag_hint": tr(client, "Arraste para ver os principais movimentos", "Swipe to see the main movements"),
        "what_to_do": tr(client, "Ação recomendada", "Recommended action"),
        "opportunity_caption": tr(client, "Oportunidade mapeada hoje para", "Opportunity mapped today for"),
        "opportunity_cta": tr(client, "Precisa agir rápido? A Guilds te ajuda a executar.", "Need to act fast? Guilds helps you execute."),
        "alert_caption": tr(client, "Radar de risco para", "Risk radar for"),
        "alert_cta": tr(client, "Mitigue riscos com a inteligência da Guilds.", "Mitigate risks with Guilds intelligence."),
        "stories_title": tr(client, "INSTAGRAM STORIES", "INSTAGRAM STORIES"),
        "stories_copy_label": tr(client, "COPY DO STORIES", "STORY COPY"),
        "stories_header": tr(client, "Radar do dia", "Daily Radar"),
        "stories_link": tr(client, "Leia o relatório completo no link da bio", "Read the full report at the link in bio"),
        "whatsapp_title": tr(client, "WHATSAPP STATUS / MENSAGEM", "WHATSAPP STATUS / MESSAGE"),
        "followup_label": tr(client, "MENSAGEM DE ACOMPANHAMENTO:", "FOLLOW-UP MESSAGE:"),
        "briefing_ready": tr(client, "Seu briefing preditivo está pronto", "Your predictive briefing is ready"),
        "top3_today": tr(client, "Principais destaques do seu radar:", "Main highlights from your radar:"),
        "attachment_line": tr(client, "PDF Executivo anexado.", "Executive PDF attached."),
        "reply_line_1": tr(client, "Quer fazer um deep dive em algum desses tópicos?", "Want to do a deep dive into any of these topics?"),
        "reply_line_2": tr(client, "Só chamar por aqui.", "Just reply here."),
        "generated_message": tr(client, "Social media pack premium gerado", "Premium social media pack generated"),
        "feed_cards": tr(client, "Feed cards", "Feed cards"),
        "stories_label": tr(client, "Stories", "Stories"),
        "copy_label": tr(client, "Copies", "Copy files"),
    }

# ── HTTP Image Fetcher ───────────────────────────────────────────────

def _fetch_card(params: dict, output_path: Path) -> Path:
    """Faz GET na rota OG e salva o PNG retornado."""
    url = f"{OG_BASE}?{urlencode(params)}"
    print(f"    GET {url[:120]}...")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = Request(url)
    with urlopen(req, timeout=TIMEOUT, context=ctx) as resp:
        data = resp.read()
    output_path.write_bytes(data)
    size_kb = len(data) / 1024
    print(f"    OK → {output_path.name} ({size_kb:.0f}KB)")
    return output_path

# ── Image Generation (delegating to Satori) ─────────────────────────

def generate_cover(client_name: str, copy: dict, setor: str, num_insights: int, output_dir: Path, date_file: str) -> Path:
    return _fetch_card({
        "template": "cover",
        "title": copy["market_title"],
        "subtitle": f"{copy['cover_subtitle']} {setor}",
        "clientName": client_name,
        "numInsights": str(num_insights),
        "date": DATE_STR,
    }, output_dir / f"00_cover_{date_file}.png")

def generate_insight(i: int, ins: dict, category: str, client_name: str, copy: dict, output_dir: Path, date_file: str) -> Path:
    return _fetch_card({
        "template": "insight",
        "number": str(i),
        "title": ins.get("titulo", ""),
        "description": ins.get("desc", ""),
        "action": ins.get("acao", ""),
        "category": category,
        "clientName": client_name,
        "date": DATE_STR,
    }, output_dir / f"{i:02d}_insight_{i}_{date_file}.png")

def generate_alert_opportunity(tipo: str, titulo: str, descricao: str, client_name: str, output_dir: Path, date_file: str, idx: int = 6) -> Path:
    return _fetch_card({
        "template": "alert",
        "type": tipo,
        "title": titulo,
        "description": descricao[:300],
        "clientName": client_name,
        "date": DATE_STR,
    }, output_dir / f"{idx:02d}_{tipo.split()[0].lower()}_{date_file}.png")

def generate_story(top3: list, client_name: str, copy: dict, setor: str, output_dir: Path, date_file: str) -> Path:
    items_json = json.dumps([
        {"titulo": it.get("titulo", ""), "desc": it.get("desc", ""), "acao": it.get("acao", "")}
        for it in top3[:3]
    ], ensure_ascii=False)
    return _fetch_card({
        "template": "story",
        "title": f"{copy['story_title']} - {setor[:30]}",
        "clientName": client_name,
        "date": DATE_STR,
        "items": items_json,
    }, output_dir / f"story_{date_file}.png")

# ── Text Copy Generation (unchanged logic) ──────────────────────────

def generate_copies(client: dict, report_data: dict, output_dir: Path) -> Path:
    copy = build_social_copy(client)
    client_name = client["nome_empresa"]
    top5 = report_data.get("top5_insights", [])
    alertas = report_data.get("alertas", [])
    oportunidades = report_data.get("oportunidades", [])
    setor = client.get("perfil_negocio", {}).get("setor", "")

    lines = [
        "=" * 60,
        f"GUILDS INTELLIGENCE - {copy['copies_title']}",
        f"{copy['client_label']}: {client_name}",
        f"{copy['date_label']}: {DATE_STR}",
        "=" * 60, "",
        copy["feed_cover_title"], "-" * 40,
        f"[Image: cover.png]", "",
        copy["cover_caption_label"],
        f"{copy['cover_caption_line_1']} - {copy['cover_caption_line_2']} {setor}",
        f"{copy['cover_caption_line_3']} {client_name}.", "",
        copy["drag_hint"], "",
        "#MarketIntelligence #Business #Strategy", "", "-" * 40, "",
    ]

    for i, ins in enumerate(top5[:5], 1):
        lines += [
            f"{copy['feed_card_title']} {i}: {ins.get('titulo', '')[:40]}", "-" * 40,
            f"[Image: insight_{i}.png]", "",
            copy["caption_label"],
            f"#{i} {tr(client, 'dos 5 insights preditivos para', 'of 5 predictive insights for')} {client_name}", "",
            f"⚡ {ins.get('titulo', '')}", "",
            ins.get("desc", "")[:250], "",
        ]
        if ins.get("acao"):
            lines += [f"🎯 {copy['what_to_do']}: {ins['acao']}", ""]
        lines += ["#MarketIntelligence #Insights #Business", "", "-" * 40, ""]

    if oportunidades:
        lines += [
            f"{copy['feed_card_title']} {copy['opportunity_type'].upper()}", "-" * 40,
            "[Image: opportunity.png]", "",
            copy["caption_label"],
            f"💡 {copy['opportunity_caption']} {client_name}:", "",
            oportunidades[0][:250], "",
            copy["opportunity_cta"], "guilds.com.br", "",
            "#Opportunity #Market #Strategy", "", "-" * 40, "",
        ]

    if alertas:
        lines += [
            f"{copy['feed_card_title']} {copy['alert_type'].upper()}", "-" * 40,
            "[Image: alert.png]", "",
            copy["caption_label"],
            f"⚠️ {copy['alert_caption']} {client_name}:", "",
            alertas[0][:250], "",
            copy["alert_cta"], "",
            "#Alert #Market #BusinessRisk", "", "=" * 60, "",
        ]

    lines += [
        copy["stories_title"], "-" * 40, "[Image: story.png]", "",
        f"{copy['stories_copy_label']}:", "",
        f"{copy['stories_header']} | {DATE_STR}",
        f"3 insights for {client_name}" if is_english_client(client) else f"3 insights rápidos para {client_name}", "",
    ]
    for i, ins in enumerate(top5[:3], 1):
        lines.append(f"{i}. {ins.get('titulo', '')}")
    lines += ["", copy["stories_link"], "guilds.com.br", "", "=" * 60, ""]

    lines += [
        copy["whatsapp_title"], "-" * 40, "", copy["followup_label"], "",
        f"*Guilds Intelligence - {DATE_STR}*",
        f"{copy['briefing_ready']}, {client_name.split()[0]}!", "",
        copy["top3_today"],
    ]
    for i, ins in enumerate(top5[:3], 1):
        lines.append(f"• {ins.get('titulo', '')}")
    lines += [
        "", copy["attachment_line"], "",
        copy["reply_line_1"], copy["reply_line_2"], "",
        "_Guilds Intelligence Engine_", "_guilds.com.br_", "", "=" * 60,
    ]

    txt_path = output_dir / f"Guilds_SocialCopy_{client_name.replace(' ', '_')}_{DATE_STR.replace('/', '')}.txt"
    with open(txt_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    print(f"    OK Copies → {txt_path.name}")
    return txt_path

# ── Main Orchestrator ────────────────────────────────────────────────

def generate_social_media_pack(client: dict, report_data: dict, base_output_dir: Path) -> dict:
    """
    Gera o pacote completo de social media delegando a renderização
    de imagens para a rota Satori/OG do Next.js.
    
    Mantém a mesma assinatura e retorno da versão anterior para
    compatibilidade com o worker (supabase_worker.py).
    """
    client_name = client["nome_empresa"]
    date_file = datetime.now().strftime("%d%m%Y")
    copy = build_social_copy(client)

    sm_dir = base_output_dir / "social_media"
    feed_dir = sm_dir / "feed"
    story_dir = sm_dir / "stories"
    copy_dir = sm_dir / "copy"
    for directory in [feed_dir, story_dir, copy_dir]:
        directory.mkdir(parents=True, exist_ok=True)

    top5 = report_data.get("top5_insights", [])
    alertas = report_data.get("alertas", [])
    oportunidades = report_data.get("oportunidades", [])
    setor = client.get("perfil_negocio", {}).get("setor", "")

    generated = {"feed": [], "stories": [], "copy": []}

    print("  [Satori] Generating carousel cover...")
    cover_path = generate_cover(client_name, copy, setor, len(top5), feed_dir, date_file)
    generated["feed"].append(cover_path)

    category_map = (
        ["technology", "business", "trend", "market", "education"]
        if is_english_client(client)
        else ["tecnologia", "negocios", "tendencia", "mercado", "educacao"]
    )
    for i, ins in enumerate(top5[:5], 1):
        print(f"  [Satori] Generating insight card {i}/5...")
        card_path = generate_insight(i, ins, category_map[i - 1], client_name, copy, feed_dir, date_file)
        generated["feed"].append(card_path)

    if oportunidades:
        print("  [Satori] Generating opportunity card...")
        opp_path = generate_alert_opportunity(copy["opportunity_type"], copy["opportunity_type"], oportunidades[0][:280], client_name, feed_dir, date_file, idx=6)
        generated["feed"].append(opp_path)

    if alertas:
        print("  [Satori] Generating alert card...")
        alert_path = generate_alert_opportunity(copy["alert_type"], copy["alert_type"], alertas[0][:280], client_name, feed_dir, date_file, idx=7)
        generated["feed"].append(alert_path)

    print("  [Satori] Generating story...")
    story_path = generate_story(top3=top5[:3], client_name=client_name, copy=copy, setor=setor, output_dir=story_dir, date_file=date_file)
    generated["stories"].append(story_path)

    print("  [Copy] Generating text copies...")
    copy_path = generate_copies(client, report_data, copy_dir)
    generated["copy"].append(copy_path)

    total = len(generated["feed"]) + len(generated["stories"]) + len(generated["copy"])
    print(f"\n  ✅ {copy['generated_message']}: {total} files in {sm_dir}")
    print(f"     {copy['feed_cards']}: {len(generated['feed'])}")
    print(f"     {copy['stories_label']}: {len(generated['stories'])}")
    print(f"     {copy['copy_label']}: {len(generated['copy'])}")
    return generated
