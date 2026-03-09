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


def make_header_footer(canvas_obj, doc, client_name=""):
    canvas_obj.saveState()
    w, h = A4
    canvas_obj.setFillColor(PRETO)
    canvas_obj.rect(0, h-22*mm, w, 22*mm, fill=1, stroke=0)
    canvas_obj.setFillColor(LARANJA)
    canvas_obj.setFont('Helvetica-Bold', 10)
    canvas_obj.drawString(15*mm, h-14*mm, 'GUILDS CLIENT INTELLIGENCE')
    canvas_obj.setFillColor(CINZA_MD)
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawRightString(w-15*mm, h-14*mm, f'Relatorio Personalizado | {client_name} | {datetime.now().strftime("%d/%m/%Y")}')
    canvas_obj.setFillColor(PRETO)
    canvas_obj.rect(0, 0, w, 11*mm, fill=1, stroke=0)
    canvas_obj.setFillColor(CINZA_MD)
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawString(15*mm, 4*mm, 'Guilds Intelligence Engine  |  guilds.com.br  |  Confidencial')
    canvas_obj.setFillColor(LARANJA)
    canvas_obj.drawRightString(w-15*mm, 4*mm, f'Pag. {doc.page}')
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

    filename = output_dir / f"Guilds_Intelligence_{safe_name}_{date_file}.pdf"

    story = []
    w, h = A4

    # ── CAPA ──
    story.append(Spacer(1, 50*mm))
    story.append(Paragraph('GUILDS CLIENT<br/>INTELLIGENCE REPORT', styles['CapaTitulo']))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph(f'Relatorio Personalizado para<br/><b>{client_name}</b>', styles['CapaSub']))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(f'Data: {date_str}  |  Confidencial', styles['CapaData']))
    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width='100%', thickness=2, color=LARANJA))
    story.append(Spacer(1, 4*mm))

    setor = client.get("perfil_negocio", {}).get("setor", "")
    loc   = client.get("perfil_negocio", {}).get("localizacao", "")
    story.append(Paragraph(f'Setor: {setor}  |  {loc}', ParagraphStyle(
        'cap2', parent=styles['CapaData'], textColor=LARANJA, fontSize=11)))
    story.append(Spacer(1, 3*mm))

    nichos = client.get("nichos_mapeados_pelo_agente", [])
    story.append(Paragraph(f'Nichos monitorados: {len(nichos)}  |  Gerado pela Guilds Intelligence Engine',
        ParagraphStyle('cap3', parent=styles['CapaData'])))

    story.append(PageBreak())

    # ── PERFIL DO CLIENTE ──
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph('PERFIL DO CLIENTE', styles['NichoTitle']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=LARANJA))
    story.append(Spacer(1, 3*mm))

    pn = client.get("perfil_negocio", {})
    perfil_rows = [
        ['Empresa',    client_name],
        ['Setor',      pn.get('setor','—')],
        ['Localização',pn.get('localizacao','—')],
        ['Tamanho',    pn.get('tamanho','—')],
        ['Modelo',     pn.get('modelo_negocio','—')],
        ['Clientes',   pn.get('clientes_atuais','—')],
        ['Ticket médio', pn.get('ticket_medio_cliente','—')],
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
        story.append(Paragraph('Produtos/Serviços do Cliente', styles['SecTitle']))
        for p in produtos_cliente:
            story.append(Paragraph(f"<b>{p['nome']}</b> ({p.get('tipo','')}) — {p.get('descricao','')}", styles['Body']))
        story.append(Spacer(1, 3*mm))

    # Objetivos e Dores
    col1 = Paragraph(
        "<b>🎯 OBJETIVOS 2026</b><br/>" +
        "<br/>".join(f"• {o}" for o in client.get("objetivos_2026", [])),
        ParagraphStyle('c1', parent=styles['Body'], textColor=PRETO))
    col2 = Paragraph(
        "<b>⚡ DORES ATUAIS</b><br/>" +
        "<br/>".join(f"• {d}" for d in client.get("dores_atuais", [])),
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
    story.append(Paragraph(f'NICHOS MONITORADOS — {len(nichos)} AREAS RELEVANTES', styles['NichoTitle']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=LARANJA))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        f'Com base no perfil de <b>{client_name}</b>, o agente identificou e monitorou os seguintes nichos estratégicos, '
        f'que impactam direta ou indiretamente o negócio:', styles['Body']))
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
        story.append(Paragraph('🔥 INTELIGÊNCIA DO DIA', styles['SecTitle']))
        for fato in nicho_info.get("fatos", []):
            story.append(Paragraph(f"<b>{fato['titulo']}</b>", styles['SmallBold']))
            story.append(Paragraph(fato['desc'], styles['Body']))
            story.append(Paragraph(f"<i>Fonte: {fato['fonte']}</i>", styles['Small']))
            story.append(Spacer(1, 2*mm))

        # Impacto personalizado no cliente
        story.append(Paragraph('🎯 IMPACTO DIRETO PARA ' + client_name.upper(), styles['SecTitle']))
        story.append(orange_box(nicho_info.get('impacto_cliente', '—'), styles))
        story.append(Spacer(1, 2*mm))

        # Ações recomendadas
        acoes = nicho_info.get("acoes_recomendadas", [])
        if acoes:
            story.append(Paragraph('✅ AÇÕES RECOMENDADAS', styles['SecTitle']))
            for acao in acoes:
                story.append(Paragraph(f"→ {acao}", ParagraphStyle(
                    'ar', parent=styles['Body'], leftIndent=8)))
        story.append(Spacer(1, 2*mm))

        # Guilds pode ajudar
        guilds_rec = nicho_info.get("guilds_pode_ajudar", "")
        if guilds_rec:
            story.append(Paragraph('🏆 COMO A GUILDS PODE AJUDAR', styles['SecTitle']))
            story.append(dark_box(guilds_rec, styles))

        story.append(Spacer(1, 3*mm))
        story.append(HRFlowable(width='100%', thickness=0.5, color=CINZA_MD))
        story.append(PageBreak())

    # ── RECOMENDAÇÕES GUILDS ──
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph('RECOMENDAÇÕES GUILDS PARA ' + client_name.upper(), styles['NichoTitle']))
    story.append(HRFlowable(width='100%', thickness=2, color=LARANJA))
    story.append(Spacer(1, 3*mm))

    guilds_recs = recommend_guilds_products(client, portfolio, [])
    if guilds_recs:
        rec_data_rows = [['PRODUTO', 'RELEVÂNCIA', 'MOTIVO', 'AÇÃO SUGERIDA']]
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
        story.append(Paragraph('Análise personalizada de produtos sendo calibrada para este perfil.', styles['Body']))

    story.append(PageBreak())

    # ── TOP 5 INSIGHTS + PRÓXIMOS PASSOS ──
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph('TOP 5 INSIGHTS E PRÓXIMOS PASSOS', styles['NichoTitle']))
    story.append(HRFlowable(width='100%', thickness=2, color=LARANJA))
    story.append(Spacer(1, 3*mm))

    for i, insight in enumerate(report_data.get("top5_insights", []), 1):
        story.append(Paragraph(f"<b>{i}. {insight['titulo']}</b>", styles['SecTitle']))
        story.append(Paragraph(insight['desc'], styles['Body']))
        if insight.get('acao'):
            story.append(orange_box(f"AÇÃO: {insight['acao']}", styles))
        story.append(Spacer(1, 3*mm))

    # Build
    doc = BaseDocTemplate(str(filename), pagesize=A4,
                          leftMargin=15*mm, rightMargin=15*mm,
                          topMargin=28*mm, bottomMargin=16*mm)
    frame = Frame(15*mm, 16*mm, 180*mm, 243*mm, id='main')
    pt = PageTemplate(id='Main', frames=[frame],
                      onPage=lambda c, d: make_header_footer(c, d, client_name))
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

    safe_name = sanitize_filename(client_name)
    filename = output_dir / f"Guilds_Briefing_{safe_name}_{date_file}.pdf"
    story = []

    # Header
    story.append(Spacer(1, 2*mm))
    hdr = Table([[
        Paragraph(f'GUILDS CLIENT BRIEFING', ParagraphStyle(
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
    story.append(Paragraph('🔥 TOP 5 INSIGHTS DO DIA', styles['SecTitle']))
    top5 = report_data.get("top5_insights", [])
    t5_rows = [['#', 'INSIGHT', 'AÇÃO']]
    emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣']
    for i, ins in enumerate(top5[:5]):
        t5_rows.append([
            Paragraph(emojis[i], styles['SmallBold']),
            Paragraph(f"<b>{ins['titulo']}</b><br/>{ins['desc'][:80]}...", styles['Small']),
            Paragraph(ins.get('acao','—')[:60], styles['Small']),
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
    al_txt = "<b>⚠️ ALERTAS PARA " + client_name.upper() + "</b><br/>" + \
             "<br/>".join(f"• {a}" for a in alertas[:3])
    op_txt = "<b>💡 OPORTUNIDADES IDENTIFICADAS</b><br/>" + \
             "<br/>".join(f"• {o}" for o in oportunidades[:3])
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
    story.append(orange_box(f"🏆 GUILDS PARA {client_name.upper()}: {guilds_msg}", styles))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(f'Guilds Intelligence Engine  |  guilds.com.br  |  {date_str}  |  Confidencial',
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
    report_data = build_report_data_template(client)

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
