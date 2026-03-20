#!/usr/bin/env python3
"""
Guilds Client Intelligence Engine
Gerador de relatórios personalizados por cliente.

Uso:
  python gerar_relatorio_cliente.py --cliente <client_id>
  python gerar_relatorio_cliente.py --cliente exemplo-cliente

O script:
  1. Lê o perfil do cliente em clients/{client_id}/profile.json
  2. Lê o portfólio da Guilds em guilds_portfolio.json
  3. Gera PDF completo personalizado + PDF one page + TXT WhatsApp + MP3 áudio
  4. Salva tudo em clients/{client_id}/reports/{data}/
"""

import json, os, sys, textwrap, argparse, re
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, BaseDocTemplate, Frame, PageTemplate
)

# ─── CAMINHOS BASE ────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
PORTFOLIO_PATH = BASE_DIR / "guilds_portfolio.json"
CLIENTS_DIR = BASE_DIR / "clients"

# ─── CORES GUILDS ─────────────────────────────────────────────────────────────
PRETO    = colors.HexColor('#0D0D0D')
LARANJA  = colors.HexColor('#FF6B00')
CINZA_CL = colors.HexColor('#F5F5F5')
CINZA_MD = colors.HexColor('#CCCCCC')
BRANCO   = colors.white
VERMELHO = colors.HexColor('#CC0000')
VERDE    = colors.HexColor('#006633')
AZUL     = colors.HexColor('#003399')


# ─── HELPERS ─────────────────────────────────────────────────────────────────
def sanitize_filename(name: str) -> str:
    """Remove caracteres inválidos para nomes de arquivo."""
    # Substitui espaços por underscore e remove caracteres especiais
    name = name.replace(' ', '_')
    name = re.sub(r'[^\w\-.]', '', name)
    return name


def get_client_locale(client: dict) -> str:
    idioma = (
        client.get("preferencias_conteudo", {}).get("idioma")
        or client.get("preferred_language")
        or "pt-BR"
    )
    normalizado = str(idioma).lower()
    if normalizado.startswith("en"):
        return "en-US"
    if normalizado.startswith("es"):
        return "es-ES"
    if normalizado.startswith("fr"):
        return "fr-FR"
    return "pt-BR"


def is_english_client(client: dict) -> bool:
    return get_client_locale(client) == "en-US"


def tr(client: dict, pt_text: str, en_text: str) -> str:
    return pt_text if get_client_locale(client) == "pt-BR" else en_text


def audio_language_code(client: dict) -> str:
    return "en" if is_english_client(client) else "pt"


def _normalize_topic_key(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", " ", str(value).lower())
    return " ".join(normalized.split())


def _build_topic_tokens(*values: str) -> set[str]:
    tokens: set[str] = set()
    for value in values:
        normalized = _normalize_topic_key(value)
        for token in normalized.split():
            if len(token) >= 4:
                tokens.add(token)
    return tokens


def _coerce_numeric_score(value: object) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _find_historical_signal(
    insight_title: str,
    insight_theme: str,
    previous_reports: list[dict] | None,
) -> dict | None:
    previous_reports = previous_reports or []
    target_key = _normalize_topic_key(insight_title)
    target_tokens = _build_topic_tokens(insight_title, insight_theme)
    best_match: dict | None = None

    for report in previous_reports:
        report_created_at = report.get("created_at")
        for source_name in ("hypotheses", "retrospective_items"):
            for item in report.get(source_name) or []:
                item_title = str(item.get("title") or "")
                item_theme = str(item.get("theme") or "")
                item_key = _normalize_topic_key(item_title)
                item_tokens = _build_topic_tokens(item_title, item_theme)
                shared_tokens = len(target_tokens & item_tokens)
                exact_match = item_key == target_key and item_key

                if not exact_match and shared_tokens < 2:
                    continue

                confidence = _coerce_numeric_score(item.get("confidence"))
                retrospective_score = _coerce_numeric_score(report.get("retrospective_score"))
                candidate = {
                    "title": item_title,
                    "theme": item_theme,
                    "status": item.get("status"),
                    "source": source_name,
                    "created_at": report_created_at,
                    "score": retrospective_score,
                    "confidence": confidence,
                    "exact_match": bool(exact_match),
                    "shared_tokens": shared_tokens,
                }

                if not best_match:
                    best_match = candidate
                    continue

                candidate_rank = (
                    1 if candidate["exact_match"] else 0,
                    candidate["shared_tokens"],
                    candidate["score"] or 0.0,
                    candidate["confidence"] or 0.0,
                    candidate["created_at"] or "",
                )
                best_rank = (
                    1 if best_match["exact_match"] else 0,
                    best_match["shared_tokens"],
                    best_match["score"] or 0.0,
                    best_match["confidence"] or 0.0,
                    best_match["created_at"] or "",
                )
                if candidate_rank > best_rank:
                    best_match = candidate

    return best_match


def _find_operational_signal(
    insight_title: str,
    insight_theme: str,
    operational_signals: dict | None,
) -> dict:
    operational_signals = operational_signals or {}
    target_tokens = _build_topic_tokens(insight_title, insight_theme)
    matched_social: list[dict] = []
    matched_deep_dives: list[dict] = []

    for publication in operational_signals.get("social_publications") or []:
        caption = str(publication.get("post_caption") or "")
        social_tokens = _build_topic_tokens(caption, publication.get("platform") or "")
        if len(target_tokens & social_tokens) >= 2:
            matched_social.append(publication)

    for request in operational_signals.get("deep_dive_requests") or []:
        deep_dive_text = f"{request.get('topic') or ''} {request.get('context') or ''}"
        request_tokens = _build_topic_tokens(deep_dive_text)
        if len(target_tokens & request_tokens) >= 2:
            matched_deep_dives.append(request)

    social_scores = [
        _coerce_numeric_score(item.get("performance_score")) or 0.0
        for item in matched_social
        if str(item.get("status") or "").lower() == "published"
    ]
    delivered_deep_dives = [
        item for item in matched_deep_dives if str(item.get("status") or "").lower() == "delivered"
    ]

    evidence_strength = 0.0
    if social_scores:
        evidence_strength += min(0.45, (sum(social_scores) / len(social_scores)) / 220.0)
    if matched_deep_dives:
        evidence_strength += min(0.35, len(matched_deep_dives) * 0.12)
    if delivered_deep_dives:
        evidence_strength += min(0.20, len(delivered_deep_dives) * 0.08)

    return {
        "matched_social_count": len(matched_social),
        "matched_deep_dive_count": len(matched_deep_dives),
        "delivered_deep_dive_count": len(delivered_deep_dives),
        "average_social_score": round(sum(social_scores) / len(social_scores), 1) if social_scores else None,
        "evidence_strength": round(min(1.0, evidence_strength), 2),
    }


def _derive_retrospective_status(
    index: int,
    historical_signal: dict | None,
    operational_signal: dict | None = None,
) -> str:
    if not historical_signal:
        evidence_strength = _coerce_numeric_score((operational_signal or {}).get("evidence_strength")) or 0.0
        if evidence_strength >= 0.55:
            return "confirmed"
        if evidence_strength >= 0.22:
            return "watching"
        return "watching" if index == 1 else "pending"

    historical_status = str(historical_signal.get("status") or "").lower()
    historical_score = _coerce_numeric_score(historical_signal.get("score")) or 0.0
    historical_confidence = _coerce_numeric_score(historical_signal.get("confidence")) or 0.0
    evidence_strength = _coerce_numeric_score((operational_signal or {}).get("evidence_strength")) or 0.0

    if historical_status in {"confirmed", "validated"}:
        return "confirmed"
    if historical_status in {"rejected", "dismissed"}:
        return "rejected"
    if evidence_strength >= 0.6:
        return "confirmed"
    if historical_score >= 72 or historical_confidence >= 0.75:
        return "confirmed"
    if historical_score >= 45 or historical_confidence >= 0.55 or evidence_strength >= 0.25:
        return "watching"
    return "pending"


def _derive_hypothesis_confidence(
    index: int,
    historical_signal: dict | None,
    retrospective_status: str,
    operational_signal: dict | None = None,
) -> tuple[float, str]:
    base_by_index = {1: 0.66, 2: 0.62, 3: 0.58}
    confidence = base_by_index.get(index, 0.56)
    reason = "baseline"

    if historical_signal:
        reason = "history_match"
        historical_score = (_coerce_numeric_score(historical_signal.get("score")) or 55.0) / 100.0
        historical_confidence = _coerce_numeric_score(historical_signal.get("confidence")) or confidence
        confidence = (confidence * 0.35) + (historical_score * 0.35) + (historical_confidence * 0.30)

        if retrospective_status == "confirmed":
            confidence += 0.08
            reason = "confirmed_history"
        elif retrospective_status == "watching":
            confidence += 0.02
            reason = "watching_history"
        elif retrospective_status == "rejected":
            confidence -= 0.18
            reason = "rejected_history"
    elif retrospective_status == "watching":
        confidence += 0.01

    evidence_strength = _coerce_numeric_score((operational_signal or {}).get("evidence_strength")) or 0.0
    if evidence_strength:
        confidence += evidence_strength * 0.14
        if evidence_strength >= 0.45:
            reason = "operational_signal_strong"
        elif reason == "baseline":
            reason = "operational_signal"

    confidence = max(0.35, min(0.92, confidence))
    return round(confidence, 2), reason


def _classify_hypothesis_sensitivity(
    confidence: float,
    retrospective_status: str,
    recommended_action: str,
) -> tuple[str, bool]:
    action_text = str(recommended_action or "").lower()
    strategic_markers = [
        "reposicion",
        "pricing",
        "contrat",
        "invest",
        "brand",
        "marca",
        "expans",
        "segment",
    ]
    touches_strategic_area = any(marker in action_text for marker in strategic_markers)

    if confidence < 0.55 or retrospective_status in {"pending", "rejected"}:
        return "high", True
    if confidence < 0.68 or touches_strategic_area:
        return "medium", True
    return "low", False


def _score_retrospective_items(items: list[dict]) -> float:
    if not items:
        return 0.0

    status_weights = {
        "confirmed": 1.0,
        "watching": 0.65,
        "pending": 0.35,
        "rejected": 0.0,
    }
    total = 0.0
    for item in items:
        total += status_weights.get(str(item.get("status") or "").lower(), 0.3)

    return round((total / len(items)) * 100.0, 1)


def pdf_copy(client: dict) -> dict[str, str]:
    return {
        "header_title": tr(client, "GUILDS CLIENT INTELLIGENCE", "GUILDS CLIENT INTELLIGENCE"),
        "header_subtitle": tr(client, "Relatorio Personalizado", "Custom Report"),
        "footer_confidential": tr(client, "Confidencial", "Confidential"),
        "page_label": tr(client, "Pag.", "Page"),
        "cover_for": tr(client, "Relatorio Personalizado para", "Custom report for"),
        "date_label": tr(client, "Data", "Date"),
        "sector_label": tr(client, "Setor", "Sector"),
        "monitored_niches": tr(client, "Nichos monitorados", "Monitored niches"),
        "generated_by": tr(client, "Gerado pela Guilds Intelligence Engine", "Generated by Guilds Intelligence Engine"),
        "client_profile": tr(client, "PERFIL DO CLIENTE", "CLIENT PROFILE"),
        "company_label": tr(client, "Empresa", "Company"),
        "location_label": tr(client, "Localizacao", "Location"),
        "size_label": tr(client, "Tamanho", "Size"),
        "model_label": tr(client, "Modelo", "Model"),
        "clients_label": tr(client, "Clientes", "Clients"),
        "ticket_label": tr(client, "Ticket medio", "Average ticket"),
        "products_label": tr(client, "Produtos/Servicos do Cliente", "Client Products/Services"),
        "goals_label": tr(client, "OBJETIVOS", "GOALS"),
        "pains_label": tr(client, "DORES ATUAIS", "CURRENT PAINS"),
        "niches_title": tr(client, "NICHOS MONITORADOS", "MONITORED NICHES"),
        "relevant_areas": tr(client, "AREAS RELEVANTES", "RELEVANT AREAS"),
        "niches_intro": tr(client, "Com base no perfil de", "Based on the profile of"),
        "niches_intro_end": tr(client, "o agente identificou e monitorou os seguintes nichos estrategicos, que impactam direta ou indiretamente o negocio:", "the system identified and monitored the following strategic niches, which directly or indirectly affect the business:"),
        "daily_intelligence": tr(client, "INTELIGENCIA DO DIA", "TODAY'S INTELLIGENCE"),
        "source_label": tr(client, "Fonte", "Source"),
        "direct_impact": tr(client, "IMPACTO DIRETO PARA", "DIRECT IMPACT FOR"),
        "recommended_actions": tr(client, "ACOES RECOMENDADAS", "RECOMMENDED ACTIONS"),
        "guilds_help": tr(client, "COMO A GUILDS PODE AJUDAR", "HOW GUILDS CAN HELP"),
        "guilds_recommendations": tr(client, "RECOMENDACOES GUILDS PARA", "GUILDS RECOMMENDATIONS FOR"),
        "product_label": tr(client, "PRODUTO", "PRODUCT"),
        "relevance_label": tr(client, "RELEVANCIA", "RELEVANCE"),
        "reason_label": tr(client, "MOTIVO", "REASON"),
        "suggested_action_label": tr(client, "ACAO SUGERIDA", "SUGGESTED ACTION"),
        "calibrating_message": tr(client, "Analise personalizada de produtos sendo calibrada para este perfil.", "Custom product analysis is being calibrated for this profile."),
        "top5_title": tr(client, "TOP 5 INSIGHTS E PROXIMOS PASSOS", "TOP 5 INSIGHTS AND NEXT STEPS"),
        "action_prefix": tr(client, "ACAO", "ACTION"),
        "briefing_title": tr(client, "GUILDS CLIENT BRIEFING", "GUILDS CLIENT BRIEFING"),
        "top5_day": tr(client, "TOP 5 INSIGHTS DO DIA", "TOP 5 INSIGHTS OF THE DAY"),
        "insight_label": tr(client, "INSIGHT", "INSIGHT"),
        "alerts_for": tr(client, "ALERTAS PARA", "ALERTS FOR"),
        "opportunities": tr(client, "OPORTUNIDADES IDENTIFICADAS", "OPPORTUNITIES IDENTIFIED"),
        "guilds_for": tr(client, "GUILDS PARA", "GUILDS FOR"),
    }


# ─── CARREGAR DADOS ──────────────────────────────────────────────────────────
def load_portfolio():
    with open(PORTFOLIO_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_client(client_id):
    profile_path = CLIENTS_DIR / client_id / "profile.json"
    if not profile_path.exists():
        raise FileNotFoundError(f"Perfil do cliente '{client_id}' não encontrado em {profile_path}")
    with open(profile_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_client(client_id, profile):
    profile_path = CLIENTS_DIR / client_id / "profile.json"
    with open(profile_path, 'w', encoding='utf-8') as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)


# ─── CRIAR NOVO PERFIL A PARTIR DE TEXTO LIVRE ───────────────────────────────
def create_client_profile_from_text(client_id: str, raw_text: str) -> dict:
    """
    Cria um profile.json estruturado a partir de qualquer texto livre
    sobre o cliente. Usa heurística simples — para versão com LLM,
    substituir esta função por chamada à API Claude.
    """
    profile = {
        "_gerado_em": datetime.now().strftime("%d/%m/%Y"),
        "_versao": 1,
        "id": client_id,
        "nome_empresa": client_id.replace("-", " ").title(),
        "contato": {"nome": "", "email": "", "whatsapp": ""},
        "perfil_negocio": {
            "setor": "",
            "subsetor": "",
            "localizacao": "",
            "tamanho": "",
            "tempo_mercado": "",
            "modelo_negocio": "",
            "clientes_atuais": "",
            "ticket_medio_cliente": ""
        },
        "produtos_e_servicos": [],
        "objetivos_2026": [],
        "dores_atuais": [],
        "nichos_mapeados_pelo_agente": [],
        "historico_relatorios": [],
        "preferencias_conteudo": {
            "tom": "Executivo",
            "profundidade": "Alta",
            "foco_principal": "Oportunidades de mercado",
            "idioma": "Português Brasil"
        },
        "_texto_original": raw_text
    }

    # Salvar perfil base
    client_dir = CLIENTS_DIR / client_id
    client_dir.mkdir(parents=True, exist_ok=True)
    (client_dir / "reports").mkdir(exist_ok=True)
    save_client(client_id, profile)
    print(f"✅ Perfil base criado para '{client_id}'. Edite {CLIENTS_DIR / client_id / 'profile.json'} para completar.")
    return profile


# ─── MAPEAR NICHOS RELEVANTES ────────────────────────────────────────────────
def map_relevant_niches(client: dict) -> list:
    """
    Retorna lista de nichos relevantes para o cliente.
    Usa os nichos já mapeados no perfil + inferência por setor.
    """
    niches = list(client.get("nichos_mapeados_pelo_agente", []))

    # Nichos sempre incluídos (macro context)
    always_include = ["Brasil", "Startups", "IA", "Tendencias Mundo"]
    for n in always_include:
        if n not in niches:
            niches.append(n)

    return niches


# ─── RECOMENDAR PRODUTOS GUILDS ──────────────────────────────────────────────
def recommend_guilds_products(client: dict, portfolio: dict, insights: list) -> list:
    """
    Com base no perfil do cliente e nos insights do dia,
    retorna lista de recomendações de produtos Guilds relevantes.
    """
    recommendations = []
    produtos = [p for p in portfolio.get("produtos_e_servicos", []) if p.get("ativo", True)]
    setor = client.get("perfil_negocio", {}).get("setor", "").lower()
    dores = " ".join(client.get("dores_atuais", [])).lower()
    objetivos = " ".join(client.get("objetivos_2026", [])).lower()

    for produto in produtos:
        score = 0
        motivos = []

        # Scoring por relevância
        desc_lower = produto["descricao"].lower()
        nome_lower = produto["nome"].lower()
        casos = " ".join(produto.get("casos_de_uso", [])).lower()
        publico = " ".join(produto.get("publico_alvo", [])).lower()

        # Verifica sobreposição com dores e objetivos
        keywords_cliente = dores + " " + objetivos + " " + setor
        for keyword in ["automação", "ia", "desenvolvimento", "equipe", "treinamento",
                        "capacitação", "produto", "software", "digital", "inovação",
                        "escalar", "expandir", "eficiência", "reduzir", "tecnologia"]:
            if keyword in keywords_cliente and keyword in (desc_lower + casos + publico):
                score += 1
                motivos.append(keyword)

        if score >= 2:
            recommendations.append({
                "produto": produto["nome"],
                "categoria": produto["categoria"],
                "relevancia": "Alta" if score >= 4 else "Média",
                "motivo": f"Alinhado com {', '.join(set(motivos[:3]))} — área de prioridade para {client['nome_empresa']}",
                "acao_sugerida": f"Apresentar {produto['nome']} como solução para {produto['casos_de_uso'][0] if produto['casos_de_uso'] else 'suas necessidades atuais'}"
            })

    return recommendations


# ─── ESTILOS PDF ─────────────────────────────────────────────────────────────
def make_styles():
    styles = getSampleStyleSheet()
    defs = [
        ('CapaTitulo',   {'fontName':'Helvetica-Bold','fontSize':36,'leading':44,'textColor':LARANJA,'alignment':TA_CENTER}),
        ('CapaSub',      {'fontName':'Helvetica','fontSize':14,'leading':20,'textColor':BRANCO,'alignment':TA_CENTER}),
        ('CapaData',     {'fontName':'Helvetica','fontSize':11,'leading':16,'textColor':CINZA_MD,'alignment':TA_CENTER}),
        ('NichoTitle',   {'fontName':'Helvetica-Bold','fontSize':16,'leading':22,'textColor':LARANJA,'spaceBefore':8,'spaceAfter':4}),
        ('SecTitle',     {'fontName':'Helvetica-Bold','fontSize':12,'leading':16,'textColor':PRETO,'spaceBefore':5,'spaceAfter':3}),
        ('Body',         {'fontName':'Helvetica','fontSize':10,'leading':14,'textColor':PRETO,'spaceAfter':4,'alignment':TA_JUSTIFY}),
        ('Small',        {'fontName':'Helvetica','fontSize':8,'leading':11,'textColor':colors.HexColor('#666666'),'spaceAfter':2}),
        ('SmallBold',    {'fontName':'Helvetica-Bold','fontSize':9,'leading':12,'textColor':PRETO,'spaceAfter':2}),
        ('OrangeSmall',  {'fontName':'Helvetica-Bold','fontSize':8,'leading':11,'textColor':LARANJA}),
        ('BoxBody',      {'fontName':'Helvetica','fontSize':10,'leading':14,'textColor':PRETO,'spaceAfter':3,'alignment':TA_JUSTIFY,'leftIndent':6,'rightIndent':6}),
        ('BigNum',       {'fontName':'Helvetica-Bold','fontSize':20,'leading':26,'textColor':LARANJA,'alignment':TA_CENTER}),
        ('ClientName',   {'fontName':'Helvetica-Bold','fontSize':11,'leading':15,'textColor':BRANCO,'alignment':TA_CENTER}),
    ]
    for name, kwargs in defs:
        styles.add(ParagraphStyle(name, parent=styles['Normal'], **kwargs))
    return styles


def make_header_footer(canvas_obj, doc, client_name="", labels=None):
    labels = labels or {}
    canvas_obj.saveState()
    w, h = A4
    canvas_obj.setFillColor(PRETO)
    canvas_obj.rect(0, h-22*mm, w, 22*mm, fill=1, stroke=0)
    canvas_obj.setFillColor(LARANJA)
    canvas_obj.setFont('Helvetica-Bold', 10)
    canvas_obj.drawString(15*mm, h-14*mm, labels.get("header_title", 'GUILDS CLIENT INTELLIGENCE'))
    canvas_obj.setFillColor(CINZA_MD)
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawRightString(w-15*mm, h-14*mm, f"{labels.get('header_subtitle', 'Custom Report')} | {client_name} | {datetime.now().strftime('%d/%m/%Y')}")
    canvas_obj.setFillColor(PRETO)
    canvas_obj.rect(0, 0, w, 11*mm, fill=1, stroke=0)
    canvas_obj.setFillColor(CINZA_MD)
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawString(15*mm, 4*mm, f"Guilds Intelligence Engine  |  guilds.com.br  |  {labels.get('footer_confidential', 'Confidential')}")
    canvas_obj.setFillColor(LARANJA)
    canvas_obj.drawRightString(w-15*mm, 4*mm, f"{labels.get('page_label', 'Page')} {doc.page}")
    canvas_obj.restoreState()


def orange_box(text, styles):
    t = Table([[Paragraph(text, styles['BoxBody'])]], colWidths=[165*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), colors.HexColor('#FFF3E0')),
        ('BOX',(0,0),(-1,-1),1.5,LARANJA),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
    ]))
    return t

def dark_box(text, styles):
    t = Table([[Paragraph(text, ParagraphStyle('dbx',parent=styles['BoxBody'],textColor=BRANCO))]],
              colWidths=[165*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), PRETO),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
    ]))
    return t


# ─── GERAR PDF COMPLETO ───────────────────────────────────────────────────────
def build_pdf_completo(client: dict, portfolio: dict, report_data: dict, output_dir: Path) -> Path:
    date_str = datetime.now().strftime("%d/%m/%Y")
    date_file = datetime.now().strftime("%d%m%Y")
    client_name = client["nome_empresa"]
    safe_name = sanitize_filename(client_name)
    styles = make_styles()
    labels = pdf_copy(client)
    empty_value = "-"

    filename = output_dir / f"Guilds_Intelligence_{safe_name}_{date_file}.pdf"

    story = []
    w, h = A4

    # ── CAPA ──
    story.append(Spacer(1, 50*mm))
    story.append(Paragraph('GUILDS CLIENT<br/>INTELLIGENCE REPORT', styles['CapaTitulo']))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph(f"{labels['cover_for']}<br/><b>{client_name}</b>", styles['CapaSub']))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(f"{labels['date_label']}: {date_str}  |  {labels['footer_confidential']}", styles['CapaData']))
    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width='100%', thickness=2, color=LARANJA))
    story.append(Spacer(1, 4*mm))

    setor = client.get("perfil_negocio", {}).get("setor", "")
    loc   = client.get("perfil_negocio", {}).get("localizacao", "")
    story.append(Paragraph(f"{labels['sector_label']}: {setor}  |  {loc}", ParagraphStyle(
        'cap2', parent=styles['CapaData'], textColor=LARANJA, fontSize=11)))
    story.append(Spacer(1, 3*mm))

    nichos = client.get("nichos_mapeados_pelo_agente", [])
    story.append(Paragraph(f"{labels['monitored_niches']}: {len(nichos)}  |  {labels['generated_by']}",
        ParagraphStyle('cap3', parent=styles['CapaData'])))

    story.append(PageBreak())

    # ── PERFIL DO CLIENTE ──
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(labels['client_profile'], styles['NichoTitle']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=LARANJA))
    story.append(Spacer(1, 3*mm))

    pn = client.get("perfil_negocio", {})
    perfil_rows = [
        [labels['company_label'], client_name],
        [labels['sector_label'], pn.get('setor','-')],
        [labels['location_label'], pn.get('localizacao','-')],
        [labels['size_label'], pn.get('tamanho','-')],
        [labels['model_label'], pn.get('modelo_negocio','-')],
        [labels['clients_label'], pn.get('clientes_atuais','-')],
        [labels['ticket_label'], pn.get('ticket_medio_cliente','-')],
    ]
    perfil_table = Table(
        [[Paragraph(f'<b>{k}</b>', styles['SmallBold']),
          Paragraph(v, styles['Body'])] for k,v in perfil_rows],
        colWidths=[40*mm, 125*mm])
    perfil_table.setStyle(TableStyle([
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[CINZA_CL, BRANCO]),
        ('GRID',(0,0),(-1,-1),0.3,CINZA_MD),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LEFTPADDING',(0,0),(-1,-1),6),('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(perfil_table)
    story.append(Spacer(1, 4*mm))

    # Produtos do cliente
    produtos_cliente = client.get("produtos_e_servicos", [])
    if produtos_cliente:
        story.append(Paragraph(labels['products_label'], styles['SecTitle']))
        for p in produtos_cliente:
            story.append(Paragraph(f"<b>{p['nome']}</b> ({p.get('tipo','')}) — {p.get('descricao','')}", styles['Body']))
        story.append(Spacer(1, 3*mm))

    # Objetivos e Dores
    col1 = Paragraph(
        f"<b>{labels['goals_label']} 2026</b><br/>" +
        "<br/>".join(f"- {o}" for o in client.get("objetivos_2026", [])),
        ParagraphStyle('c1', parent=styles['Body'], textColor=PRETO))
    col2 = Paragraph(
        f"<b>{labels['pains_label']}</b><br/>" +
        "<br/>".join(f"- {d}" for d in client.get("dores_atuais", [])),
        ParagraphStyle('c2', parent=styles['Body'], textColor=PRETO))
    od_table = Table([[col1, col2]], colWidths=[80*mm, 80*mm])
    od_table.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(0,0),colors.HexColor('#F0FFF4')),
        ('BACKGROUND',(1,0),(1,0),colors.HexColor('#FFF0F0')),
        ('BOX',(0,0),(0,0),1,VERDE),('BOX',(1,0),(1,0),1,VERMELHO),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(od_table)
    story.append(PageBreak())

    # ── NICHOS MONITORADOS ──
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(f"{labels['niches_title']} - {len(nichos)} {labels['relevant_areas']}", styles['NichoTitle']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=LARANJA))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        f"{labels['niches_intro']} <b>{client_name}</b>, {labels['niches_intro_end']}", styles['Body']))
    story.append(Spacer(1, 3*mm))

    nichos_rows = [[
        Paragraph(f"<b>{i+1}.</b>", styles['SmallBold']),
        Paragraph(f"<b>{n}</b>", styles['Body'])
    ] for i, n in enumerate(nichos)]
    nt = Table(nichos_rows, colWidths=[10*mm, 155*mm])
    nt.setStyle(TableStyle([
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[CINZA_CL,BRANCO]),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LEFTPADDING',(0,0),(-1,-1),6),('GRID',(0,0),(-1,-1),0.3,CINZA_MD),
    ]))
    story.append(nt)
    story.append(PageBreak())

    # ── INTELIGÊNCIA POR NICHO ──
    nicho_data = report_data.get("nichos", {})
    for nicho_nome, nicho_info in nicho_data.items():
        story.append(Spacer(1, 4*mm))
        # Header do nicho
        nh = Table([[Paragraph(f"{nicho_info.get('emoji','📌')}  {nicho_nome.upper()}",
            ParagraphStyle('nht', parent=styles['NichoTitle'],
                textColor=BRANCO, spaceBefore=0, spaceAfter=0))]],
            colWidths=[165*mm])
        nh.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),PRETO),
            ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
            ('LEFTPADDING',(0,0),(-1,-1),10),
        ]))
        story.append(nh)
        story.append(Spacer(1, 3*mm))

        # Fatos
        story.append(Paragraph(labels['daily_intelligence'], styles['SecTitle']))
        for fato in nicho_info.get("fatos", []):
            story.append(Paragraph(f"<b>{fato['titulo']}</b>", styles['SmallBold']))
            story.append(Paragraph(fato['desc'], styles['Body']))
            story.append(Paragraph(f"<i>{labels['source_label']}: {fato['fonte']}</i>", styles['Small']))
            story.append(Spacer(1, 2*mm))

        # Impacto personalizado no cliente
        story.append(Paragraph(labels['direct_impact'] + ' ' + client_name.upper(), styles['SecTitle']))
        story.append(orange_box(nicho_info.get('impacto_cliente', '-'), styles))
        story.append(Spacer(1, 2*mm))

        # Ações recomendadas
        acoes = nicho_info.get("acoes_recomendadas", [])
        if acoes:
            story.append(Paragraph(labels['recommended_actions'], styles['SecTitle']))
            for acao in acoes:
                story.append(Paragraph(f"→ {acao}", ParagraphStyle(
                    'ar', parent=styles['Body'], leftIndent=8)))
        story.append(Spacer(1, 2*mm))

        # Guilds pode ajudar
        guilds_rec = nicho_info.get("guilds_pode_ajudar", "")
        if guilds_rec:
            story.append(Paragraph(labels['guilds_help'], styles['SecTitle']))
            story.append(dark_box(guilds_rec, styles))

        story.append(Spacer(1, 3*mm))
        story.append(HRFlowable(width='100%', thickness=0.5, color=CINZA_MD))
        story.append(PageBreak())

    # ── RECOMENDAÇÕES GUILDS ──
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(labels['guilds_recommendations'] + ' ' + client_name.upper(), styles['NichoTitle']))
    story.append(HRFlowable(width='100%', thickness=2, color=LARANJA))
    story.append(Spacer(1, 3*mm))

    guilds_recs = recommend_guilds_products(client, portfolio, [])
    if guilds_recs:
        rec_data_rows = [[labels['product_label'], labels['relevance_label'], labels['reason_label'], labels['suggested_action_label']]]
        for r in guilds_recs:
            rec_data_rows.append([r['produto'], r['relevancia'], r['motivo'], r['acao_sugerida']])
        rec_t = Table(rec_data_rows, colWidths=[35*mm, 18*mm, 60*mm, 52*mm])
        rec_t.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),PRETO),
            ('TEXTCOLOR',(0,0),(-1,0),LARANJA),
            ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
            ('FONTSIZE',(0,0),(-1,-1),8),
            ('FONTNAME',(0,1),(-1,-1),'Helvetica'),
            ('ROWBACKGROUNDS',(0,1),(-1,-1),[CINZA_CL,BRANCO]),
            ('GRID',(0,0),(-1,-1),0.3,CINZA_MD),
            ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
            ('LEFTPADDING',(0,0),(-1,-1),5),('VALIGN',(0,0),(-1,-1),'TOP'),
        ]))
        story.append(rec_t)
    else:
        story.append(Paragraph(labels['calibrating_message'], styles['Body']))

    story.append(PageBreak())

    # ── TOP 5 INSIGHTS + PRÓXIMOS PASSOS ──
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(labels['top5_title'], styles['NichoTitle']))
    story.append(HRFlowable(width='100%', thickness=2, color=LARANJA))
    story.append(Spacer(1, 3*mm))

    for i, insight in enumerate(report_data.get("top5_insights", []), 1):
        story.append(Paragraph(f"<b>{i}. {insight['titulo']}</b>", styles['SecTitle']))
        story.append(Paragraph(insight['desc'], styles['Body']))
        if insight.get('acao'):
            story.append(orange_box(f"{labels['action_prefix']}: {insight['acao']}", styles))
        story.append(Spacer(1, 3*mm))

    # Build
    doc = BaseDocTemplate(str(filename), pagesize=A4,
                          leftMargin=15*mm, rightMargin=15*mm,
                          topMargin=28*mm, bottomMargin=16*mm)
    frame = Frame(15*mm, 16*mm, 180*mm, 243*mm, id='main')
    pt = PageTemplate(id='Main', frames=[frame],
                      onPage=lambda c, d: make_header_footer(c, d, client_name, labels))
    doc.addPageTemplates([pt])
    doc.build(story)
    print(f'✅ PDF Completo: {filename}')
    return filename


# ─── GERAR PDF ONE PAGE ───────────────────────────────────────────────────────
def build_pdf_onepage(client: dict, report_data: dict, output_dir: Path) -> Path:
    date_str  = datetime.now().strftime("%d/%m/%Y")
    date_file = datetime.now().strftime("%d%m%Y")
    client_name = client["nome_empresa"]
    styles = make_styles()
    labels = pdf_copy(client)

    safe_name = sanitize_filename(client_name)
    filename = output_dir / f"Guilds_Briefing_{safe_name}_{date_file}.pdf"
    story = []

    # Header
    story.append(Spacer(1, 2*mm))
    hdr = Table([[
        Paragraph(labels['briefing_title'], ParagraphStyle(
            'hh', parent=styles['NichoTitle'], fontSize=18, textColor=BRANCO, spaceBefore=0, spaceAfter=0)),
        Paragraph(f'<b>{client_name}</b><br/>{date_str}', ParagraphStyle(
            'hd', parent=styles['Small'], textColor=CINZA_MD, alignment=TA_RIGHT))
    ]], colWidths=[115*mm, 50*mm])
    hdr.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),PRETO),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    story.append(hdr)
    story.append(Spacer(1, 3*mm))

    # Top 5
    story.append(Paragraph(labels['top5_day'], styles['SecTitle']))
    top5 = report_data.get("top5_insights", [])
    t5_rows = [['#', labels['insight_label'], labels['action_prefix']]]
    emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣']
    for i, ins in enumerate(top5[:5]):
        t5_rows.append([
            Paragraph(emojis[i], styles['SmallBold']),
            Paragraph(f"<b>{ins['titulo']}</b><br/>{ins['desc'][:80]}...", styles['Small']),
            Paragraph(ins.get('acao','-')[:60], styles['Small']),
        ])
    t5 = Table(t5_rows, colWidths=[8*mm, 95*mm, 62*mm])
    t5.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),PRETO),('TEXTCOLOR',(0,0),(-1,0),LARANJA),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),
        ('FONTNAME',(0,1),(-1,-1),'Helvetica'),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[CINZA_CL,BRANCO]),
        ('GRID',(0,0),(-1,-1),0.3,CINZA_MD),
        ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
        ('LEFTPADDING',(0,0),(-1,-1),4),('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t5)
    story.append(Spacer(1, 3*mm))

    # Alertas + Oportunidades
    story.append(HRFlowable(width='100%', thickness=1, color=LARANJA))
    alertas = report_data.get("alertas", [])
    oportunidades = report_data.get("oportunidades", [])
    al_txt = "<b>" + labels['alerts_for'] + " " + client_name.upper() + "</b><br/>" + \
             "<br/>".join(f"- {a}" for a in alertas[:3])
    op_txt = "<b>" + labels['opportunities'] + "</b><br/>" + \
             "<br/>".join(f"- {o}" for o in oportunidades[:3])
    ao = Table([
        [Paragraph(al_txt, ParagraphStyle('al',parent=styles['Body'],fontSize=9)),
         Paragraph(op_txt, ParagraphStyle('op',parent=styles['Body'],fontSize=9))]
    ], colWidths=[80*mm, 80*mm])
    ao.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(0,0),colors.HexColor('#FFF0F0')),
        ('BACKGROUND',(1,0),(1,0),colors.HexColor('#F0FFF4')),
        ('BOX',(0,0),(0,0),1,VERMELHO),('BOX',(1,0),(1,0),1,VERDE),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(ao)
    story.append(Spacer(1, 3*mm))

    # Guilds reccomendation box
    story.append(HRFlowable(width='100%', thickness=1.5, color=LARANJA))
    guilds_msg = report_data.get("guilds_mensagem_cliente", "")
    story.append(orange_box(f"{labels['guilds_for']} {client_name.upper()}: {guilds_msg}", styles))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(f"Guilds Intelligence Engine  |  guilds.com.br  |  {date_str}  |  {labels['footer_confidential']}",
        ParagraphStyle('ft', parent=styles['Small'], alignment=TA_CENTER)))

    doc = SimpleDocTemplate(str(filename), pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=8*mm, bottomMargin=8*mm)
    doc.build(story)
    print(f'✅ PDF One Page: {filename}')
    return filename


# ─── GERAR TXT WHATSAPP ───────────────────────────────────────────────────────
def build_whatsapp_txt(client: dict, report_data: dict, output_dir: Path) -> Path:
    date_str  = datetime.now().strftime("%d/%m/%Y")
    date_file = datetime.now().strftime("%d%m%Y")
    client_name = client["nome_empresa"]

    top5     = report_data.get("top5_insights", [])
    alertas  = report_data.get("alertas", [])
    opport   = report_data.get("oportunidades", [])
    guilds_m = report_data.get("guilds_mensagem_cliente", "")

    lines = [
        f"🔍 *GUILDS CLIENT INTELLIGENCE — {date_str}*",
        f"📌 Relatório personalizado para: *{client_name}*",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "🔥 *TOP 5 INSIGHTS DO DIA:*",
        "",
    ]

    emojis = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"]
    for i, ins in enumerate(top5[:5]):
        lines += [
            f"{emojis[i]} *{ins['titulo']}*",
            ins['desc'][:120],
            f"→ Ação: {ins.get('acao','—')}",
            "",
        ]

    lines += [
        "━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "⚠️ *ALERTAS:*",
    ]
    for a in alertas[:3]:
        lines.append(f"• {a}")

    lines += [
        "",
        "💡 *OPORTUNIDADES:*",
    ]
    for o in opport[:3]:
        lines.append(f"• {o}")

    lines += [
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "",
        f"🏆 *GUILDS PARA VOCÊS:*",
        guilds_m,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"_Guilds Intelligence Engine | {date_str}_",
        "_guilds.com.br_",
    ]

    safe_name = sanitize_filename(client_name)
    filename = output_dir / f"Guilds_WhatsApp_{safe_name}_{date_file}.txt"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))
    print(f'✅ WhatsApp TXT: {filename}')
    return filename


# ─── GERAR ÁUDIO MP3 ─────────────────────────────────────────────────────────
def build_audio(client: dict, report_data: dict, output_dir: Path) -> Path:
    try:
        from gtts import gTTS
    except ImportError:
        print('❌ gTTS não instalado. Execute: pip install -r requirements.txt')
        raise

    date_str    = datetime.now().strftime("%d/%m/%Y")
    date_file   = datetime.now().strftime("%d%m%Y")
    client_name = client["nome_empresa"]
    top5        = report_data.get("top5_insights", [])
    alertas     = report_data.get("alertas", [])
    opport      = report_data.get("oportunidades", [])
    guilds_m    = report_data.get("guilds_mensagem_cliente", "")

    roteiro = f"""
Guilds Client Intelligence. Relatório personalizado para {client_name}. Data: {date_str}.

Bom dia! Aqui é a Guilds Intelligence Engine com seu briefing de mercado personalizado.

Hoje identificamos 5 insights estratégicos relevantes para o seu negócio.

"""
    for i, ins in enumerate(top5[:5], 1):
        roteiro += f"Número {i}: {ins['titulo']}. {ins['desc']} Ação recomendada: {ins.get('acao','sem ação definida')}. "

    roteiro += f"""

Alertas importantes para ficar de olho: """
    for a in alertas[:2]:
        roteiro += f"{a}. "

    roteiro += f"""

E as principais oportunidades identificadas: """
    for o in opport[:2]:
        roteiro += f"{o}. "

    roteiro += f"""

Mensagem da Guilds para vocês: {guilds_m}

Esse foi o briefing de hoje. Até amanhã com mais inteligência de mercado personalizada para {client_name}.
Guilds — Tecnologia de Elite para Empresas.
"""

    safe_name = sanitize_filename(client_name)
    filename = output_dir / f"Guilds_Audio_{safe_name}_{date_file}.mp3"
    tts = gTTS(text=roteiro, lang='pt', slow=False)
    tts.save(str(filename))
    print(f'✅ Áudio MP3: {filename}')
    return filename


# ─── MONTAR REPORT DATA (TEMPLATE) ───────────────────────────────────────────
def build_report_data_template(client: dict) -> dict:
    """
    Template de estrutura de dados do relatório.
    Em produção, este dicionário é preenchido pelo agente de pesquisa
    após executar as buscas web para os nichos do cliente.
    """
    client_name = client["nome_empresa"]
    nichos = client.get("nichos_mapeados_pelo_agente", [])

    nicho_data = {}
    for nicho in nichos:
        nicho_data[nicho] = {
            "emoji": "📌",
            "fatos": [
                {
                    "titulo": f"[PESQUISAR] Principais movimentos em {nicho} — {datetime.now().strftime('%d/%m/%Y')}",
                    "desc": f"Dados a serem preenchidos pelo agente de pesquisa para o nicho '{nicho}'.",
                    "fonte": "A ser pesquisado"
                }
            ],
            "impacto_cliente": f"Análise de impacto de '{nicho}' para {client_name} a ser preenchida pelo agente.",
            "acoes_recomendadas": [f"Ação a ser definida com base na pesquisa de '{nicho}'"],
            "guilds_pode_ajudar": f"Recomendação Guilds para '{nicho}' a ser personalizada."
        }

    return {
        "nichos": nicho_data,
        "top5_insights": [
            {"titulo": f"Insight {i+1} — a ser preenchido", "desc": "Descrição a ser preenchida.", "acao": ""}
            for i in range(5)
        ],
        "alertas": ["Alerta a ser identificado na pesquisa"],
        "oportunidades": ["Oportunidade a ser identificada na pesquisa"],
        "guilds_mensagem_cliente": f"Mensagem personalizada da Guilds para {client_name} a ser gerada."
    }


# ─── MAIN ─────────────────────────────────────────────────────────────────────
NICHO_EMOJI = {
    "Brasil": "🇧🇷",
    "Startups": "🚀",
    "IA": "🤖",
    "Tendencias Mundo": "🌍",
    "Financeiro": "💰",
    "Saude": "🩺",
    "Educacao": "🎓",
    "Varejo": "🛍️",
    "Industria": "🏭",
    "Marketing": "📣",
    "Dados": "📊",
    "Operacoes": "⚙️",
    "RH": "👥",
    "Tecnologia": "💻",
}

FOCUS_VECTORS = {
    "crescimento": {
        "keywords": ["cres", "receita", "venda", "lead", "pipeline", "expand", "mercado", "novo cliente"],
        "label": "crescimento comercial",
    },
    "eficiencia": {
        "keywords": ["eficien", "processo", "custo", "operac", "produtiv", "tempo", "gargalo", "autom"],
        "label": "eficiencia operacional",
    },
    "posicionamento": {
        "keywords": ["marca", "diferenc", "premium", "posicion", "autoridade", "percepcao"],
        "label": "posicionamento competitivo",
    },
    "inovacao": {
        "keywords": ["ia", "digital", "produto", "software", "dados", "tecnolog", "mvp"],
        "label": "inovacao aplicada",
    },
    "retencao": {
        "keywords": ["reten", "churn", "atendimento", "experiencia", "sucesso do cliente", "engaj"],
        "label": "retencao e experiencia",
    },
    "governanca": {
        "keywords": ["compliance", "risco", "govern", "segur", "controle", "auditoria"],
        "label": "governanca e risco",
    },
}


def _safe_join(values) -> str:
    if isinstance(values, list):
        return " ".join(str(value) for value in values if value)
    return str(values or "")


def _client_context_blob(client: dict) -> str:
    perfil = client.get("perfil_negocio", {})
    produtos = client.get("produtos_e_servicos", [])
    product_text = " ".join(
        f"{item.get('nome', '')} {item.get('descricao', '')}" for item in produtos if isinstance(item, dict)
    )
    parts = [
        client.get("nome_empresa", ""),
        _safe_join(client.get("objetivos_2026")),
        _safe_join(client.get("dores_atuais")),
        _safe_join(client.get("nichos_mapeados_pelo_agente")),
        product_text,
        _safe_join(perfil.values()),
        client.get("_texto_original", ""),
        client.get("website_url", ""),
        " ".join(client.get("social_media_urls") or []),
    ]
    return " ".join(part for part in parts if part).lower()


def _top_focus_vectors(client: dict, nicho: str) -> list[str]:
    context = f"{_client_context_blob(client)} {nicho.lower()}"
    scored = []
    for vector in FOCUS_VECTORS.values():
        score = sum(1 for keyword in vector["keywords"] if keyword in context)
        scored.append((score, vector["label"]))

    ranked = [label for score, label in sorted(scored, reverse=True) if score > 0]
    if not ranked:
        return ["eficiencia operacional", "crescimento comercial"]
    if len(ranked) == 1:
        ranked.append("inovacao aplicada")
    return ranked[:2]


def _top_objectives(client: dict, limit: int = 2) -> list[str]:
    objetivos = [str(item).strip() for item in client.get("objetivos_2026", []) if str(item).strip()]
    return objetivos[:limit] or ["ganhar velocidade de execucao"]


def _top_pains(client: dict, limit: int = 2) -> list[str]:
    dores = [str(item).strip() for item in client.get("dores_atuais", []) if str(item).strip()]
    return dores[:limit] or ["falta de previsibilidade operacional"]


def _niche_fact_blueprints(client: dict, nicho: str) -> list[dict]:
    company = client["nome_empresa"]
    setor = client.get("perfil_negocio", {}).get("setor", "seu setor")
    objectives = _top_objectives(client)
    pains = _top_pains(client)
    focus = _top_focus_vectors(client, nicho)
    source = tr(
        client,
        "Sintese Guilds baseada no onboarding, dores, objetivos e nichos mapeados",
        "Guilds synthesis based on onboarding, pain points, goals, and mapped niches",
    )

    return [
        {
            "titulo": tr(client, f"{nicho}: movimento com maior aderencia a {focus[0]}", f"{nicho}: strongest movement aligned with {focus[0]}"),
            "desc": tr(
                client,
                f"O nicho {nicho} ganhou prioridade porque conversa diretamente com o contexto de {company}. "
                f"Ele pode acelerar {objectives[0].lower()} enquanto reduz a friccao ligada a {pains[0].lower()}.",
                f"The niche {nicho} gained priority because it directly matches {company}'s context. "
                f"It can accelerate {objectives[0].lower()} while reducing friction around {pains[0].lower()}.",
            ),
            "fonte": source,
        },
        {
            "titulo": tr(client, f"{nicho}: oportunidade de diferenciar {company} no contexto de {setor}", f"{nicho}: opportunity to differentiate {company} in the context of {setor}"),
            "desc": tr(
                client,
                f"A leitura do perfil sugere usar {nicho} como alavanca de {focus[1]} para criar uma resposta "
                f"mais clara ao mercado, com narrativa, oferta e operacao mais alinhadas ao momento do cliente.",
                f"The profile suggests using {nicho} as a {focus[1]} lever to create a clearer market response, "
                f"with narrative, offer, and operations better aligned to the client's moment.",
            ),
            "fonte": source,
        },
    ]


def _niche_actions(client: dict, nicho: str) -> list[str]:
    objectives = _top_objectives(client)
    pains = _top_pains(client)
    return [
        tr(client, f"Priorizar um experimento de 2 semanas em {nicho} conectado ao objetivo '{objectives[0]}'", f"Prioritize a 2-week experiment in {nicho} linked to the goal '{objectives[0]}'"),
        tr(client, f"Traduzir sinais de {nicho} em uma rotina quinzenal de decisao para atacar '{pains[0]}'", f"Translate signals from {nicho} into a biweekly decision routine to address '{pains[0]}'"),
        tr(client, f"Definir dono, indicador e proxima oferta associada ao nicho {nicho} para sair de analise para execucao", f"Define owner, metric, and next offer tied to the niche {nicho} to move from analysis to execution"),
    ]


def _guilds_support_for_niche(client: dict, portfolio: dict, nicho: str) -> str:
    focus = _top_focus_vectors(client, nicho)
    recommendations = recommend_guilds_products(client, portfolio, [])
    if recommendations:
        top = recommendations[0]
        return tr(
            client,
            f"A Guilds pode apoiar com {top['produto']} para transformar {nicho} em frente de {focus[0]}, "
            f"criando execucao pratica em vez de apenas diagnostico.",
            f"Guilds can support with {top['produto']} to turn {nicho} into a {focus[0]} execution front, "
            f"creating practical execution instead of just diagnosis.",
        )
    return tr(
        client,
        f"A Guilds pode estruturar uma trilha de validacao para {nicho}, conectando descoberta, priorizacao "
        f"e implementacao em torno de {focus[0]}.",
        f"Guilds can structure a validation path for {nicho}, connecting discovery, prioritization "
        f"and implementation around {focus[0]}.",
    )


def _build_niche_intelligence(client: dict, portfolio: dict, nicho: str) -> dict:
    company = client["nome_empresa"]
    focus = _top_focus_vectors(client, nicho)
    pains = _top_pains(client)
    objectives = _top_objectives(client)

    return {
        "emoji": NICHO_EMOJI.get(nicho, "📌"),
        "fatos": _niche_fact_blueprints(client, nicho),
        "impacto_cliente": tr(
            client,
            f"Para {company}, {nicho} merece acompanhamento porque pode combinar {focus[0]} e {focus[1]} "
            f"num momento em que o negocio busca {objectives[0].lower()} e ainda sofre com {pains[0].lower()}.",
            f"For {company}, {nicho} deserves close monitoring because it can combine {focus[0]} and {focus[1]} "
            f"at a moment when the business is pursuing {objectives[0].lower()} while still struggling with {pains[0].lower()}.",
        ),
        "acoes_recomendadas": _niche_actions(client, nicho),
        "guilds_pode_ajudar": _guilds_support_for_niche(client, portfolio, nicho),
    }


def _build_external_source_insights(client: dict, external_intelligence: dict | None = None) -> list[dict]:
    external_intelligence = external_intelligence or {}
    signals = external_intelligence.get("signals") or []
    if not signals:
        return []

    insights = []
    objectives = _top_objectives(client, limit=2)

    for signal in signals[:2]:
        title = str(signal.get("title") or "").strip()
        if not title:
            continue
        source_name = str(signal.get("source_name") or "fonte externa")
        matched_keywords = signal.get("matched_keywords") or []
        keyword_text = ", ".join(matched_keywords[:3]) if matched_keywords else tr(client, "sinais do nicho", "market signals")
        insights.append(
            {
                "titulo": tr(
                    client,
                    f"Sinal externo: {title[:90]}",
                    f"External signal: {title[:90]}",
                ),
                "desc": tr(
                    client,
                    f"A fonte {source_name} trouxe um sinal conectado a {keyword_text}, com potencial de impactar {objectives[0].lower()}.",
                    f"The source {source_name} surfaced a signal connected to {keyword_text}, with potential impact on {objectives[0].lower()}.",
                ),
                "acao": tr(
                    client,
                    f"Validar em 48h se esse sinal altera prioridade comercial, oferta ou narrativa para {client['nome_empresa']}.",
                    f"Validate within 48 hours whether this signal changes commercial priority, offer, or narrative for {client['nome_empresa']}.",
                ),
                "fonte": tr(client, f"Fonte externa: {source_name}", f"External source: {source_name}"),
                "source_type": "external",
                "source_name": source_name,
                "source_url": signal.get("url"),
                "source_relevance": signal.get("relevance_score"),
                "source_theme": signal.get("theme"),
                "source_theme_confidence": signal.get("theme_confidence"),
            }
        )

    return insights


def _build_top_insights(client: dict, niche_data: dict, external_intelligence: dict | None = None) -> list[dict]:
    objectives = _top_objectives(client, limit=3)
    pains = _top_pains(client, limit=3)
    insights = _build_external_source_insights(client, external_intelligence)

    for nicho, info in niche_data.items():
        focus = _top_focus_vectors(client, nicho)
        insights.append(
            {
                "titulo": tr(client, f"{nicho} deve entrar no radar executivo imediatamente", f"{nicho} should enter the executive radar immediately"),
                "desc": tr(
                    client,
                    f"{nicho} aparece como vetor de {focus[0]} para apoiar {objectives[0].lower()} "
                    f"sem repetir os gargalos atuais de {pains[0].lower()}.",
                    f"{nicho} emerges as a {focus[0]} vector to support {objectives[0].lower()} "
                    f"without repeating the current bottlenecks around {pains[0].lower()}.",
                ),
                "acao": info["acoes_recomendadas"][0],
                "fonte": info["fatos"][0]["fonte"],
                "source_type": "internal",
                "source_name": tr(client, "Guilds", "Guilds"),
                "source_url": None,
                "source_relevance": None,
            }
        )
        if len(insights) == 5:
            break

    fallback_topics = [
        (tr(client, "Operacao comercial", "Commercial operation"), tr(client, f"Revisar mensagens, funil e proposta em torno de {objectives[0].lower()}.", f"Review messaging, funnel, and offer around {objectives[0].lower()}.")),
        (tr(client, "Prioridade de execucao", "Execution priority"), tr(client, f"Trocar iniciativas paralelas por uma fila clara ligada a {pains[0].lower()}.", f"Replace parallel initiatives with a clear queue linked to {pains[0].lower()}.")),
        (tr(client, "Oferta Guilds", "Guilds offer"), tr(client, "Conectar o proximo ciclo do cliente a um servico executavel e mensuravel.", "Connect the client's next cycle to an executable and measurable service.")),
    ]
    for title, desc in fallback_topics:
        if len(insights) == 5:
            break
        insights.append(
            {
                "titulo": title,
                "desc": desc,
                "acao": tr(client, f"Agendar uma revisao executiva de 30 minutos focada em {title.lower()}", f"Schedule a 30-minute executive review focused on {title.lower()}"),
                "fonte": tr(client, "Sintese interna Guilds", "Internal Guilds synthesis"),
                "source_type": "internal",
                "source_name": tr(client, "Guilds", "Guilds"),
                "source_url": None,
                "source_relevance": None,
            }
        )

    return insights[:5]


def _build_alerts(client: dict, niche_data: dict) -> list[str]:
    pains = _top_pains(client, limit=2)
    objectives = _top_objectives(client, limit=2)
    niche_names = list(niche_data.keys())
    return [
          tr(client, f"Sem uma rotina de decisao, o volume de sinais pode aumentar a sensacao de urgencia sem melhorar {objectives[0].lower()}.", f"Without a decision routine, the volume of signals can increase urgency without improving {objectives[0].lower()}."),
          tr(client, f"As dores atuais de {pains[0].lower()} tendem a crescer se os nichos {', '.join(niche_names[:2])} nao forem traduzidos em plano de execucao.", f"The current pain points around {pains[0].lower()} may worsen if the niches {', '.join(niche_names[:2])} are not translated into an execution plan."),
          tr(client, "Existe risco de consumir informacao demais e acao de menos se cada insight nao tiver dono, indicador e prazo.", "There is a risk of consuming too much information and taking too little action if each insight lacks an owner, metric, and deadline."),
    ]


def _build_opportunities(client: dict, niche_data: dict) -> list[str]:
    objectives = _top_objectives(client, limit=2)
    niche_names = list(niche_data.keys())
    first_niche = niche_names[0] if niche_names else "o nicho prioritario"
    second_niche = niche_names[1] if len(niche_names) > 1 else "os sinais adjacentes"
    return [
          tr(client, f"Usar {first_niche} como frente de teste para acelerar {objectives[0].lower()} com um piloto pequeno e mensuravel.", f"Use {first_niche} as a test front to accelerate {objectives[0].lower()} with a small measurable pilot."),
          tr(client, f"Combinar {first_niche} com {second_niche} para montar uma oferta mais clara, com narrativa comercial e prova de execucao.", f"Combine {first_niche} with {second_niche} to build a clearer offer with commercial narrative and proof of execution."),
          tr(client, "Transformar os achados do relatorio em um ritual recorrente de priorizacao pode reduzir retrabalho e aumentar velocidade de resposta.", "Turning report findings into a recurring prioritization ritual can reduce rework and increase response speed."),
    ]


def _build_guilds_message(client: dict, portfolio: dict, top5_insights: list[dict]) -> str:
    company = client["nome_empresa"]
    objectives = _top_objectives(client)
    recommendations = recommend_guilds_products(client, portfolio, top5_insights)
    if recommendations:
        top = recommendations[0]
        return tr(
            client,
            f"{company} ja tem sinais suficientes para sair de observacao e entrar em execucao. "
            f"A recomendacao mais aderente da Guilds hoje e {top['produto']}, porque ela ajuda a acelerar "
            f"{objectives[0].lower()} com entregas praticas e ritmo de implementacao.",
            f"{company} already has enough signals to move from observation into execution. "
            f"Guilds' strongest recommendation today is {top['produto']}, because it helps accelerate "
            f"{objectives[0].lower()} with practical delivery and implementation rhythm.",
        )
    return tr(
        client,
        f"{company} esta num ponto em que contexto ja nao falta; falta transformar prioridade em sequencia de execucao. "
        f"A Guilds pode assumir esse papel com uma frente curta de diagnostico aplicado, desenho de iniciativa e implementacao assistida.",
        f"{company} is at a point where context is no longer the problem; the gap is turning priority into an execution sequence. "
        f"Guilds can take that role with a short applied diagnosis, initiative design, and assisted implementation front.",
    )


def _build_hypotheses(
    client: dict,
    top5_insights: list[dict],
    niche_data: dict,
    previous_reports: list[dict] | None = None,
    operational_signals: dict | None = None,
) -> list[dict]:
    niche_names = list(niche_data.keys())
    hypotheses = []
    previous_reports = previous_reports or []

    for index, insight in enumerate(top5_insights[:3], 1):
        theme = niche_names[index - 1] if index - 1 < len(niche_names) else "core"
        historical_signal = _find_historical_signal(insight["titulo"], theme, previous_reports)
        operational_signal = _find_operational_signal(insight["titulo"], theme, operational_signals)
        retrospective_status = _derive_retrospective_status(index, historical_signal, operational_signal)
        confidence, confidence_reason = _derive_hypothesis_confidence(
            index,
            historical_signal,
            retrospective_status,
            operational_signal,
        )
        recommended_action = insight.get("acao") or ""
        sensitivity_level, review_required = _classify_hypothesis_sensitivity(
            confidence,
            retrospective_status,
            recommended_action,
        )
        hypotheses.append(
            {
                "title": insight["titulo"],
                "theme": theme,
                "prediction": tr(
                    client,
                    f"Se a equipe agir sobre '{insight['titulo']}', a tendencia e ganhar mais clareza e velocidade nas proximas semanas.",
                    f"If the team acts on '{insight['titulo']}', clarity and execution speed should improve over the next few weeks.",
                ),
                "recommended_action": recommended_action,
                "confidence": confidence,
                "confidence_reason": confidence_reason,
                "retrospective_status": retrospective_status,
                "history_reference_title": historical_signal.get("title") if historical_signal else None,
                "operational_evidence_strength": operational_signal.get("evidence_strength"),
                "sensitivity_level": sensitivity_level,
                "review_required": review_required,
                "review_status": "pending_review" if review_required else "auto_ok",
                "review_notes": None,
                "source_type": insight.get("source_type", "internal"),
                "source_name": insight.get("source_name") or insight.get("fonte"),
                "source_url": insight.get("source_url"),
                "source_relevance": insight.get("source_relevance"),
                "source_theme": insight.get("source_theme"),
                "source_theme_confidence": insight.get("source_theme_confidence"),
            }
        )

    return hypotheses


def _build_retrospective(
    client: dict,
    top5_insights: list[dict],
    niche_data: dict,
    previous_reports: list[dict] | None = None,
    operational_signals: dict | None = None,
) -> dict:
    niche_names = list(niche_data.keys())
    items = []
    previous_reports = previous_reports or []

    for index, insight in enumerate(top5_insights[:3], 1):
        theme = niche_names[index - 1] if index - 1 < len(niche_names) else "core"
        historical_signal = _find_historical_signal(insight["titulo"], theme, previous_reports)
        operational_signal = _find_operational_signal(insight["titulo"], theme, operational_signals)
        status = _derive_retrospective_status(index, historical_signal, operational_signal)
        historical_source = historical_signal.get("source") if historical_signal else None
        items.append(
            {
                "title": insight["titulo"],
                "theme": theme,
                "status": status,
                "assessment": tr(
                    client,
                    (
                        f"O tema '{insight['titulo']}' foi comparado com relatorios anteriores e sinais operacionais recentes, mantendo consistencia suficiente para permanecer em {status}."
                        if historical_signal
                        else f"O tema '{insight['titulo']}' ainda e recente e precisa de mais historico ou sinais operacionais para sair de observacao."
                    ),
                    (
                        f"The topic '{insight['titulo']}' was compared with previous reports and recent operational signals, remaining consistent enough to stay {status}."
                        if historical_signal
                        else f"The topic '{insight['titulo']}' is still recent and needs more history or operational signals before moving out of observation."
                    ),
                ),
                "next_step": insight.get("acao")
                or tr(
                    client,
                    "Definir dono, indicador e prazo para validar a hipotese.",
                    "Define owner, metric, and timeline to validate the hypothesis.",
                ),
                "history_source": historical_source,
                "history_reference_title": historical_signal.get("title") if historical_signal else None,
                "operational_evidence_strength": operational_signal.get("evidence_strength"),
                "operational_evidence_summary": {
                    "matched_social_count": operational_signal.get("matched_social_count"),
                    "matched_deep_dive_count": operational_signal.get("matched_deep_dive_count"),
                    "delivered_deep_dive_count": operational_signal.get("delivered_deep_dive_count"),
                    "average_social_score": operational_signal.get("average_social_score"),
                },
            }
        )

    score = _score_retrospective_items(items)
    confirmed_count = sum(1 for item in items if item.get("status") == "confirmed")
    watched_count = sum(1 for item in items if item.get("status") == "watching")
    return {
        "summary": tr(
            client,
            (
                f"A retrospectiva comparou {len(items)} temas com {len(previous_reports)} relatorios anteriores: {confirmed_count} ganharam consistencia e {watched_count} seguem em observacao."
                if previous_reports
                else "Ainda ha pouco historico para comparacao real, entao a retrospectiva permanece como leitura inicial contextual."
            ),
            (
                f"The retrospective compared {len(items)} themes against {len(previous_reports)} previous reports: {confirmed_count} gained consistency and {watched_count} remain under observation."
                if previous_reports
                else "There is still limited history for real comparison, so the retrospective remains an initial contextual reading."
            ),
        ),
        "score": score,
        "items": items,
    }


def run_intelligence_engine(
    client: dict,
    portfolio: dict,
    previous_reports: list[dict] | None = None,
    operational_signals: dict | None = None,
    external_intelligence: dict | None = None,
) -> dict:
    """
    Gera uma camada de inteligencia baseada no contexto do cliente.
    Nesta fase, a saida ainda e heuristica e orientada por onboarding,
    mas ja deixa de ser placeholder estatico.
    """
    niches = map_relevant_niches(client)
    niche_data = {nicho: _build_niche_intelligence(client, portfolio, nicho) for nicho in niches}
    top5_insights = _build_top_insights(client, niche_data, external_intelligence)
    hypotheses = _build_hypotheses(client, top5_insights, niche_data, previous_reports, operational_signals)
    retrospective = _build_retrospective(client, top5_insights, niche_data, previous_reports, operational_signals)
    external_signals = (external_intelligence or {}).get("signals") or []

    return {
        "nichos": niche_data,
        "top5_insights": top5_insights,
        "alertas": _build_alerts(client, niche_data),
        "oportunidades": _build_opportunities(client, niche_data),
        "guilds_mensagem_cliente": _build_guilds_message(client, portfolio, top5_insights),
        "hypotheses": hypotheses,
        "retrospective": retrospective,
        "external_signals": external_signals,
        "external_signal_summary": (external_intelligence or {}).get("summary"),
        "engine_metadata": {
            "version": "phase-14-external-rss-foundation",
            "generated_at": datetime.now().isoformat(),
            "niches_count": len(niche_data),
            "mode": "contextual_synthesis",
            "confidence_mode": "history_calibrated",
            "signal_mode": "history_plus_operational",
            "external_mode": (external_intelligence or {}).get("mode", "disabled"),
            "external_provider": (external_intelligence or {}).get("provider", "none"),
            "external_signal_count": len(external_signals),
            "external_summary_mode": (external_intelligence or {}).get("summary_mode", "none"),
            "external_feeds_considered": (external_intelligence or {}).get("feeds_considered", 0),
            "external_llm_used": (external_intelligence or {}).get("llm_used", False),
            "external_estimated_cost_usd": (external_intelligence or {}).get("estimated_cost_usd", 0),
        },
    }


def build_report_data_template(client: dict) -> dict:
    """
    Mantido por compatibilidade com chamadas legadas.
    Agora delega para o motor de inteligencia contextual da Fase 2.
    """
    return run_intelligence_engine(client, load_portfolio())


def main():
    parser = argparse.ArgumentParser(description='Guilds Client Intelligence Report Generator')
    parser.add_argument('--cliente', required=True, help='ID do cliente (pasta em clients/)')
    parser.add_argument('--novo', action='store_true', help='Criar novo perfil de cliente')
    parser.add_argument('--texto', type=str, help='Texto livre para criar novo perfil', default='')
    args = parser.parse_args()

    print(f'\n🚀 Guilds Client Intelligence Engine')
    print(f'📋 Cliente: {args.cliente}')
    print('─' * 50)

    portfolio = load_portfolio()

    if args.novo:
        client = create_client_profile_from_text(args.cliente, args.texto)
        print(f'\n⚠️  Perfil base criado. Complete o arquivo profile.json e execute novamente sem --novo')
        return

    client = load_client(args.cliente)
    print(f'✅ Perfil carregado: {client["nome_empresa"]}')

    # Criar pasta de relatório do dia
    date_file = datetime.now().strftime("%d%m%Y")
    report_dir = CLIENTS_DIR / args.cliente / "reports" / date_file
    report_dir.mkdir(parents=True, exist_ok=True)

    # Montar dados do relatório (em produção: executar pesquisa web aqui)
    report_data = run_intelligence_engine(client, portfolio)

    # Gerar artefatos com tratamento de erros
    generated = []
    errors = []

    print('\n📄 Gerando artefatos...')

    try:
        p1 = build_pdf_completo(client, portfolio, report_data, report_dir)
        generated.append(('PDF Completo', p1))
    except Exception as e:
        errors.append(('PDF Completo', str(e)))
        print(f'❌ Erro ao gerar PDF Completo: {e}')

    try:
        p2 = build_pdf_onepage(client, report_data, report_dir)
        generated.append(('PDF One Page', p2))
    except Exception as e:
        errors.append(('PDF One Page', str(e)))
        print(f'❌ Erro ao gerar PDF One Page: {e}')

    try:
        p3 = build_whatsapp_txt(client, report_data, report_dir)
        generated.append(('WhatsApp TXT', p3))
    except Exception as e:
        errors.append(('WhatsApp TXT', str(e)))
        print(f'❌ Erro ao gerar WhatsApp TXT: {e}')

    try:
        p4 = build_audio(client, report_data, report_dir)
        generated.append(('Áudio MP3', p4))
    except Exception as e:
        errors.append(('Áudio MP3', str(e)))
        print(f'❌ Erro ao gerar Áudio MP3: {e}')

    # Gerar pack de social media
    sm_files = {}
    try:
        print('\n📱 Gerando pack de social media...')
        from gerar_social_media import generate_social_media_pack
        sm_files = generate_social_media_pack(client, report_data, report_dir)
    except Exception as e:
        errors.append(('Social Media Pack', str(e)))
        print(f'❌ Erro ao gerar Social Media Pack: {e}')

    # Atualizar histórico do cliente
    client.setdefault("historico_relatorios", []).append({
        "data": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "pasta": str(report_dir),
        "nichos_pesquisados": client.get("nichos_mapeados_pelo_agente", []),
        "arquivos": [str(p) for _, p in generated],
        "social_media": {k: [str(f) for f in v] for k, v in sm_files.items()},
        "erros": [f"{name}: {err}" for name, err in errors] if errors else None
    })
    save_client(args.cliente, client)

    # Resumo final
    print(f'\n{"✅" if not errors else "⚠️"} RELATÓRIO GERADO EM: {report_dir}')
    for name, path in generated:
        print(f'   ✅ {name}: {path.name}')
    for name, err in errors:
        print(f'   ❌ {name}: {err}')
    if errors:
        print(f'\n⚠️  {len(errors)} artefato(s) falharam. Os demais foram gerados com sucesso.')


if __name__ == '__main__':
    main()
