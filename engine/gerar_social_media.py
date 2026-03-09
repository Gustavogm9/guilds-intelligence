#!/usr/bin/env python3
"""
Guilds Social Media Generator
Gera cards prontos para Instagram Feed, Instagram Stories e WhatsApp Status,
além de copy pronto para cada plataforma.

Saída por cliente:
  social_media/
    feed/        → 1080x1080 PNG (carrossel de insights)
    stories/     → 1080x1920 PNG (stories)
    copy/        → TXT com textos prontos para cada card
"""

import os, json, textwrap
from pathlib import Path
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ─── FONTES ──────────────────────────────────────────────────────────────────
FONT_DIR = Path("/usr/share/fonts/truetype/lato")
F_BLACK   = str(FONT_DIR / "Lato-Black.ttf")
F_BOLD    = str(FONT_DIR / "Lato-Bold.ttf")
F_REGULAR = str(FONT_DIR / "Lato-Regular.ttf")
F_LIGHT   = str(FONT_DIR / "Lato-Light.ttf")

# ─── CORES ───────────────────────────────────────────────────────────────────
PRETO    = (13,  13,  13)
LARANJA  = (255, 107,  0)
LARANJA2 = (255, 140, 50)
BRANCO   = (255, 255, 255)
CINZA    = (180, 180, 180)
CINZA_ESC= (80,  80,  80)
VERDE    = (0,   180,  80)
VERMELHO = (220,  40,  40)
AZUL     = (30,  120, 255)

# Paleta de categorias
CATEGORIA_CORES = {
    "tecnologia":  LARANJA,
    "negócios":    (100, 180, 255),
    "alerta":      VERMELHO,
    "oportunidade":VERDE,
    "tendência":   (180, 100, 255),
    "mercado":     (255, 200, 0),
    "educação":    (0,   200, 180),
    "padrão":      LARANJA,
}

DATE_STR = datetime.now().strftime("%d/%m/%Y")


# ─── HELPERS ─────────────────────────────────────────────────────────────────
def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def wrap_text(text, font, max_width, draw):
    """Quebra texto em linhas que cabem em max_width pixels."""
    words = text.split()
    lines = []
    current = []
    for word in words:
        test = " ".join(current + [word])
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


def draw_rounded_rect(draw, xy, radius, fill, outline=None, outline_width=0):
    """Desenha retângulo com cantos arredondados."""
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill,
                            outline=outline, width=outline_width)


def draw_pill(draw, x, y, text, font, fg=BRANCO, bg=LARANJA, padding_x=24, padding_y=10):
    """Desenha um badge/pill com texto."""
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0] + padding_x * 2
    h = bbox[3] - bbox[1] + padding_y * 2
    draw_rounded_rect(draw, (x, y, x + w, y + h), radius=h // 2, fill=bg)
    draw.text((x + padding_x, y + padding_y), text, font=font, fill=fg)
    return w, h


def gradient_background(img, color_top, color_bottom):
    """Aplica gradiente vertical sobre a imagem."""
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(h):
        t = y / h
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * t)
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * t)
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def add_noise_texture(img, alpha=15):
    """Adiciona textura sutil de ruído para look premium."""
    import random
    w, h = img.size
    pixels = img.load()
    for _ in range(w * h // 20):
        x = random.randint(0, w - 1)
        y = random.randint(0, h - 1)
        r, g, b = pixels[x, y]
        noise = random.randint(-alpha, alpha)
        pixels[x, y] = (
            max(0, min(255, r + noise)),
            max(0, min(255, g + noise)),
            max(0, min(255, b + noise)),
        )
    return img


# ─── CARD BASE ───────────────────────────────────────────────────────────────
def create_base_canvas(width=1080, height=1080, bg=PRETO):
    img = Image.new("RGB", (width, height), bg)
    return img


def add_guilds_branding(draw, img_w, img_h, size="small"):
    """Adiciona branding Guilds no rodapé."""
    if size == "small":
        font_brand = load_font(F_BOLD, 28)
        font_sub   = load_font(F_LIGHT, 22)
        y_start    = img_h - 80
    else:
        font_brand = load_font(F_BOLD, 34)
        font_sub   = load_font(F_LIGHT, 26)
        y_start    = img_h - 100

    # Linha separadora laranja
    draw.line([(60, y_start - 20), (img_w - 60, y_start - 20)],
              fill=(*LARANJA, 80) if hasattr(LARANJA, '__len__') else LARANJA, width=1)

    # GUILDS em laranja + tagline em cinza
    draw.text((60, y_start), "GUILDS", font=font_brand, fill=LARANJA)
    brand_w = draw.textbbox((0, 0), "GUILDS", font=font_brand)[2]
    draw.text((60 + brand_w + 16, y_start + 4), "Intelligence Engine", font=font_sub, fill=CINZA)
    draw.text((img_w - 60, y_start), DATE_STR,
              font=font_sub, fill=CINZA, anchor="ra")


def add_decorative_elements(draw, img_w, img_h):
    """Adiciona elementos decorativos sutis — linhas e pontos."""
    # Linha vertical laranja no lado esquerdo
    draw.rectangle([0, 0, 6, img_h], fill=LARANJA)

    # Ponto decorativo no canto superior direito
    cx, cy, r = img_w - 80, 80, 120
    draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                 outline=(*LARANJA, 30) if hasattr(LARANJA, '__len__') else LARANJA,
                 width=1)
    draw.ellipse([cx - r//2, cy - r//2, cx + r//2, cy + r//2],
                 outline=(*LARANJA, 20) if hasattr(LARANJA, '__len__') else LARANJA,
                 width=1)


# ─── CARD TIPO 1: INSIGHT FEED (1080x1080) ───────────────────────────────────
def make_insight_card_feed(
    numero: int,
    titulo: str,
    descricao: str,
    acao: str,
    categoria: str,
    fonte: str = "",
    client_name: str = "",
) -> Image.Image:
    W, H = 1080, 1080
    img  = create_base_canvas(W, H, PRETO)
    draw = ImageDraw.Draw(img)

    # Gradiente sutil no fundo
    for y in range(H):
        t = y / H
        r = int(13 + 10 * t)
        g = int(13 + 5 * t)
        b = int(13 + 20 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    add_decorative_elements(draw, W, H)

    # Fonts
    fn_num    = load_font(F_BLACK,   160)
    fn_cat    = load_font(F_BOLD,     30)
    fn_titulo = load_font(F_BLACK,    62)
    fn_desc   = load_font(F_REGULAR,  34)
    fn_acao   = load_font(F_BOLD,     30)
    fn_fonte  = load_font(F_LIGHT,    24)
    fn_client = load_font(F_BOLD,     26)

    # Número grande decorativo (fundo, transparente)
    num_str = f"0{numero}" if numero < 10 else str(numero)
    draw.text((W - 40, -20), num_str, font=fn_num,
              fill=(255, 107, 0, 18) if hasattr(LARANJA, '__len__') else LARANJA,
              anchor="ra")

    y = 80

    # Badge de categoria
    cat_color = CATEGORIA_CORES.get(categoria.lower(), LARANJA)
    pill_w, pill_h = draw_pill(draw, 60, y, categoria.upper(), fn_cat,
                                fg=PRETO, bg=cat_color)
    y += pill_h + 32

    # Número do insight
    draw.text((60, y), f"#{numero}", font=load_font(F_BOLD, 36), fill=CINZA)
    y += 52

    # Título — quebrado em linhas
    titulo_lines = wrap_text(titulo, fn_titulo, W - 140, draw)
    for line in titulo_lines[:3]:
        draw.text((60, y), line, font=fn_titulo, fill=BRANCO)
        y += 72
    y += 12

    # Linha divisória laranja
    draw.rectangle([60, y, 200, y + 4], fill=LARANJA)
    y += 28

    # Descrição
    desc_lines = wrap_text(descricao, fn_desc, W - 140, draw)
    for line in desc_lines[:4]:
        draw.text((60, y), line, font=fn_desc, fill=CINZA)
        y += 44
    y += 16

    # Ação recomendada (destaque laranja)
    if acao:
        draw_rounded_rect(draw, (60, y, W - 60, y + pill_h + 20),
                          radius=12, fill=(40, 20, 0))
        draw_rounded_rect(draw, (60, y, W - 60, y + pill_h + 20),
                          radius=12, fill=None, outline=LARANJA, outline_width=2)
        draw.text((80, y + 12), "→ AÇÃO:", font=fn_acao, fill=LARANJA)
        acao_x = 80 + draw.textbbox((0, 0), "→ AÇÃO: ", font=fn_acao)[2]
        draw.text((acao_x, y + 12), acao[:55] + ("..." if len(acao) > 55 else ""),
                  font=fn_acao, fill=BRANCO)
        y += pill_h + 40

    # Fonte
    if fonte:
        draw.text((60, y), f"Fonte: {fonte[:60]}", font=fn_fonte, fill=CINZA_ESC)

    # Cliente (se tiver)
    if client_name:
        draw.text((W - 60, 60), f"Para: {client_name}", font=fn_client,
                  fill=CINZA_ESC, anchor="ra")

    add_guilds_branding(draw, W, H, size="small")
    return img


# ─── CARD TIPO 2: CAPA DO CARROSSEL (1080x1080) ──────────────────────────────
def make_cover_card_feed(
    titulo_report: str,
    subtitulo: str,
    num_insights: int,
    client_name: str = "",
) -> Image.Image:
    W, H = 1080, 1080
    img  = create_base_canvas(W, H, PRETO)
    draw = ImageDraw.Draw(img)

    # Gradiente fundo
    for y in range(H):
        t = y / H
        r = int(13 + 8 * t)
        g = int(13 + 3 * t)
        b = int(13 + 25 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Elemento gráfico — círculos concêntricos
    cx, cy = W // 2, H // 2 - 80
    for r in range(350, 0, -70):
        alpha = max(8, 30 - r // 15)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                     outline=(*LARANJA, alpha), width=1)

    # Linha lateral
    draw.rectangle([0, 0, 6, H], fill=LARANJA)

    fn_eyebrow = load_font(F_BOLD,    32)
    fn_titulo  = load_font(F_BLACK,   80)
    fn_sub     = load_font(F_REGULAR, 36)
    fn_badge   = load_font(F_BOLD,    30)
    fn_client  = load_font(F_BOLD,    32)

    y = 120

    # GUILDS INTELLIGENCE (eyebrow)
    draw.text((60, y), "GUILDS INTELLIGENCE", font=fn_eyebrow, fill=LARANJA)
    y += 56

    # Linha divisória
    draw.rectangle([60, y, 360, y + 3], fill=LARANJA)
    y += 28

    # Título principal
    titulo_lines = wrap_text(titulo_report, fn_titulo, W - 120, draw)
    for line in titulo_lines[:3]:
        draw.text((60, y), line, font=fn_titulo, fill=BRANCO)
        y += 92

    y += 16

    # Subtítulo
    sub_lines = wrap_text(subtitulo, fn_sub, W - 140, draw)
    for line in sub_lines[:2]:
        draw.text((60, y), line, font=fn_sub, fill=CINZA)
        y += 48

    y += 24

    # Badges de info
    draw_pill(draw, 60, y, f"{num_insights} INSIGHTS", fn_badge, fg=PRETO, bg=LARANJA)
    draw_pill(draw, 280, y, DATE_STR, fn_badge, fg=BRANCO, bg=(40, 40, 40))

    if client_name:
        draw.text((60, H - 160), f"Relatório personalizado para", font=load_font(F_LIGHT, 28), fill=CINZA_ESC)
        draw.text((60, H - 120), client_name.upper(), font=fn_client, fill=BRANCO)

    add_guilds_branding(draw, W, H, size="small")
    return img


# ─── CARD TIPO 3: OPORTUNIDADE/ALERTA (1080x1080) ────────────────────────────
def make_alert_opportunity_card(
    tipo: str,       # "oportunidade" ou "alerta"
    titulo: str,
    descricao: str,
    client_name: str = "",
) -> Image.Image:
    W, H = 1080, 1080
    img  = create_base_canvas(W, H, PRETO)
    draw = ImageDraw.Draw(img)

    is_opp = tipo.lower() == "oportunidade"
    accent = VERDE if is_opp else VERMELHO
    emoji_big = "💡" if is_opp else "⚠️"

    # Fundo com gradiente tonal
    for y in range(H):
        t = y / H
        if is_opp:
            r = int(13 + 5 * t)
            g = int(13 + 25 * t)
            b = int(13 + 10 * t)
        else:
            r = int(13 + 30 * t)
            g = int(13 + 5 * t)
            b = int(13 + 5 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    draw.rectangle([0, 0, 6, H], fill=accent)

    fn_emoji  = load_font(F_BLACK,    140)
    fn_tipo   = load_font(F_BOLD,      36)
    fn_titulo = load_font(F_BLACK,     68)
    fn_desc   = load_font(F_REGULAR,   36)
    fn_client = load_font(F_BOLD,      28)

    y = 100

    # Emoji grande
    draw.text((60, y), emoji_big, font=fn_emoji, fill=accent)
    y += 160

    # Tipo badge
    draw_pill(draw, 60, y, tipo.upper(), fn_tipo, fg=PRETO, bg=accent)
    y += 80

    # Título
    titulo_lines = wrap_text(titulo, fn_titulo, W - 120, draw)
    for line in titulo_lines[:3]:
        draw.text((60, y), line, font=fn_titulo, fill=BRANCO)
        y += 82
    y += 20

    # Linha
    draw.rectangle([60, y, 200, y + 4], fill=accent)
    y += 28

    # Descrição
    desc_lines = wrap_text(descricao, fn_desc, W - 120, draw)
    for line in desc_lines[:5]:
        draw.text((60, y), line, font=fn_desc, fill=CINZA)
        y += 46

    if client_name:
        draw.text((W - 60, 60), f"Para: {client_name}", font=fn_client,
                  fill=CINZA_ESC, anchor="ra")

    add_guilds_branding(draw, W, H, size="small")
    return img


# ─── STORY / WHATSAPP STATUS (1080x1920) ─────────────────────────────────────
def make_story(
    top3: list,          # lista de dicts: {titulo, desc, acao}
    client_name: str = "",
    titulo_story: str = "Inteligência de Mercado",
) -> Image.Image:
    W, H = 1080, 1920
    img  = create_base_canvas(W, H, PRETO)
    draw = ImageDraw.Draw(img)

    # Gradiente
    for y in range(H):
        t = y / H
        draw.line([(0, y), (W, y)], fill=(
            int(13 + 8 * t),
            int(13 + 4 * t),
            int(13 + 28 * t)
        ))

    draw.rectangle([0, 0, 6, H], fill=LARANJA)

    fn_header  = load_font(F_BLACK,    52)
    fn_label   = load_font(F_BOLD,     30)
    fn_titulo  = load_font(F_BLACK,    52)
    fn_desc    = load_font(F_REGULAR,  34)
    fn_acao    = load_font(F_BOLD,     28)
    fn_footer  = load_font(F_BOLD,     32)
    fn_small   = load_font(F_LIGHT,    26)

    y = 100

    # Header
    draw.text((60, y), "GUILDS INTELLIGENCE", font=load_font(F_BOLD, 36), fill=LARANJA)
    y += 54
    draw.rectangle([60, y, 500, y + 3], fill=LARANJA)
    y += 20

    titulo_lines = wrap_text(titulo_story, fn_header, W - 120, draw)
    for line in titulo_lines[:2]:
        draw.text((60, y), line, font=fn_header, fill=BRANCO)
        y += 62
    y += 10

    if client_name:
        draw.text((60, y), f"Para: {client_name}", font=fn_small, fill=CINZA_ESC)
        y += 44

    draw.text((60, y), DATE_STR, font=fn_small, fill=CINZA_ESC)
    y += 60

    draw.line([(60, y), (W - 60, y)], fill=CINZA_ESC, width=1)
    y += 50

    # 3 insights
    emojis = ["1️⃣", "2️⃣", "3️⃣"]
    for i, item in enumerate(top3[:3]):
        # Número
        draw.text((60, y), emojis[i], font=fn_label, fill=LARANJA)
        y += 46

        # Título
        tit_lines = wrap_text(item.get("titulo", ""), fn_titulo, W - 120, draw)
        for line in tit_lines[:2]:
            draw.text((60, y), line, font=fn_titulo, fill=BRANCO)
            y += 60
        y += 6

        # Descrição
        desc_lines = wrap_text(item.get("desc", ""), fn_desc, W - 120, draw)
        for line in desc_lines[:3]:
            draw.text((60, y), line, font=fn_desc, fill=CINZA)
            y += 42

        # Ação
        if item.get("acao"):
            y += 8
            draw.text((60, y), f"→ {item['acao'][:60]}", font=fn_acao, fill=LARANJA)
            y += 38

        # Separador
        y += 16
        draw.line([(60, y), (W - 60, y)], fill=(50, 50, 50), width=1)
        y += 36

    # Footer Guilds
    draw.text((60, H - 100), "GUILDS", font=fn_footer, fill=LARANJA)
    fw = draw.textbbox((0, 0), "GUILDS", font=fn_footer)[2]
    draw.text((60 + fw + 16, H - 94), "Intelligence Engine", font=fn_small, fill=CINZA)
    draw.text((60, H - 56), "guilds.com.br", font=fn_small, fill=CINZA_ESC)
    draw.text((W - 60, H - 56), DATE_STR, font=fn_small, fill=CINZA_ESC, anchor="ra")

    return img


# ─── GERAR COPIES ────────────────────────────────────────────────────────────
def generate_copies(
    client: dict,
    report_data: dict,
    output_dir: Path,
) -> Path:
    client_name = client["nome_empresa"]
    top5        = report_data.get("top5_insights", [])
    alertas     = report_data.get("alertas", [])
    oportunidades = report_data.get("oportunidades", [])
    setor       = client.get("perfil_negocio", {}).get("setor", "")

    lines = [
        "=" * 60,
        f"GUILDS INTELLIGENCE — COPIES PARA SOCIAL MEDIA",
        f"Cliente: {client_name}",
        f"Data: {DATE_STR}",
        "=" * 60,
        "",

        # ── INSTAGRAM FEED ──
        "📸 INSTAGRAM FEED — CAPA DO CARROSSEL",
        "-" * 40,
        f"[Imagem: capa_carrossel_{DATE_STR.replace('/','')}.png]",
        "",
        "LEGENDA DA CAPA:",
        f"🔍 Inteligência de mercado do dia — o que está movimentando {setor}",
        f"hoje e como isso impacta a {client_name}.",
        "",
        "Arraste para ver os 5 principais insights 👉",
        "",
        f"#IntelligenciaDeMarketing #Mercado #{setor.replace(' ','')} #Negocios #Estrategia",
        "",
        "─" * 40,
        "",
    ]

    # Um bloco por insight
    for i, ins in enumerate(top5[:5], 1):
        lines += [
            f"📸 INSTAGRAM FEED — CARD {i}: {ins.get('titulo','')[:40]}",
            "-" * 40,
            f"[Imagem: insight_{i:02d}_{DATE_STR.replace('/','')}.png]",
            "",
            "LEGENDA:",
            f"{'#'}{i} de 5 insights do dia para {client_name} 🎯",
            "",
            f"📌 {ins.get('titulo','')}",
            "",
            ins.get('desc', '')[:200],
            "",
        ]
        if ins.get("acao"):
            lines += [
                f"✅ O que fazer: {ins['acao']}",
                "",
            ]
        lines += [
            "#IntelligenciaDeMarketing #Insights #Negocios #Mercado",
            "",
            "─" * 40,
            "",
        ]

    # Oportunidade
    if oportunidades:
        lines += [
            "📸 INSTAGRAM FEED — CARD OPORTUNIDADE",
            "-" * 40,
            "[Imagem: oportunidade_DDMMAAAA.png]",
            "",
            "LEGENDA:",
            f"💡 Oportunidade identificada hoje para {client_name}:",
            "",
            oportunidades[0][:250],
            "",
            "Quer saber como aproveitar? Fale com a Guilds 👇",
            "guilds.com.br",
            "",
            "#Oportunidade #Mercado #Estrategia #Negocios",
            "",
            "─" * 40,
            "",
        ]

    # Alerta
    if alertas:
        lines += [
            "📸 INSTAGRAM FEED — CARD ALERTA",
            "-" * 40,
            "[Imagem: alerta_DDMMAAAA.png]",
            "",
            "LEGENDA:",
            f"⚠️ Ponto de atenção para {client_name}:",
            "",
            alertas[0][:250],
            "",
            "Fique de olho. Inteligência de mercado com a Guilds.",
            "",
            "#Alerta #Mercado #RiscoDeNegocio #Estrategia",
            "",
            "=" * 60,
            "",
        ]

    # ── INSTAGRAM STORIES ──
    lines += [
        "📱 INSTAGRAM STORIES",
        "-" * 40,
        "[Imagem: story_DDMMAAAA.png]",
        "",
        "COPY DO STORIES (para colar na tela ou stories com link):",
        "",
        f"🔍 Inteligência de mercado | {DATE_STR}",
        f"3 insights para {client_name}",
        "",
    ]
    for i, ins in enumerate(top5[:3], 1):
        lines += [f"{i}. {ins.get('titulo','')}"]
    lines += [
        "",
        "Swipe up / Link na bio para o relatório completo",
        "guilds.com.br",
        "",
        "=" * 60,
        "",
    ]

    # ── WHATSAPP ──
    lines += [
        "💬 WHATSAPP STATUS / MENSAGEM",
        "-" * 40,
        "[Imagem: story_DDMMAAAA.png — mesma do stories]",
        "",
        "MENSAGEM DE ACOMPANHAMENTO:",
        "",
        f"🔍 *Guilds Intelligence — {DATE_STR}*",
        f"Seu briefing personalizado está pronto, {client_name.split()[0]}!",
        "",
        "Top 3 insights de hoje:",
    ]
    for i, ins in enumerate(top5[:3], 1):
        lines += [f"{i}. {ins.get('titulo','')}"]
    lines += [
        "",
        "Relatório completo (PDF + áudio) em anexo 👆",
        "",
        "Alguma dúvida ou quer aprofundar algum tema?",
        "É só responder aqui 🚀",
        "",
        "_Guilds Intelligence Engine_",
        "_guilds.com.br_",
        "",
        "=" * 60,
    ]

    txt_path = output_dir / f"Guilds_SocialCopy_{client_name.replace(' ','_')}_{DATE_STR.replace('/','')}.txt"
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"✅ Copies geradas: {txt_path}")
    return txt_path


# ─── PIPELINE PRINCIPAL ───────────────────────────────────────────────────────
def generate_social_media_pack(
    client: dict,
    report_data: dict,
    base_output_dir: Path,
) -> dict:
    """
    Gera o pack completo de social media para um cliente.
    Retorna dict com paths de todos os arquivos gerados.
    """
    client_name = client["nome_empresa"]
    date_file   = datetime.now().strftime("%d%m%Y")

    # Pastas
    sm_dir    = base_output_dir / "social_media"
    feed_dir  = sm_dir / "feed"
    story_dir = sm_dir / "stories"
    copy_dir  = sm_dir / "copy"
    for d in [feed_dir, story_dir, copy_dir]:
        d.mkdir(parents=True, exist_ok=True)

    top5   = report_data.get("top5_insights", [])
    alertas = report_data.get("alertas", [])
    oportunidades = report_data.get("oportunidades", [])
    setor  = client.get("perfil_negocio", {}).get("setor", "")

    generated = {"feed": [], "stories": [], "copy": []}

    # 1. Capa do carrossel
    print("  🎨 Gerando capa do carrossel...")
    cover = make_cover_card_feed(
        titulo_report="Inteligência de Mercado",
        subtitulo=f"Insights estratégicos para {setor}",
        num_insights=len(top5),
        client_name=client_name,
    )
    cover_path = feed_dir / f"00_capa_{date_file}.png"
    cover.save(str(cover_path), "PNG", quality=95)
    generated["feed"].append(cover_path)

    # 2. Cards de insight
    categoria_map = ["tecnologia", "negócios", "tendência", "mercado", "educação"]
    for i, ins in enumerate(top5[:5], 1):
        print(f"  🎨 Gerando card insight {i}/5...")
        card = make_insight_card_feed(
            numero=i,
            titulo=ins.get("titulo", ""),
            descricao=ins.get("desc", ""),
            acao=ins.get("acao", ""),
            categoria=categoria_map[i - 1],
            fonte=ins.get("fonte", ""),
            client_name=client_name,
        )
        card_path = feed_dir / f"{i:02d}_insight_{i}_{date_file}.png"
        card.save(str(card_path), "PNG", quality=95)
        generated["feed"].append(card_path)

    # 3. Card oportunidade
    if oportunidades:
        print("  🎨 Gerando card oportunidade...")
        opp_card = make_alert_opportunity_card(
            tipo="oportunidade",
            titulo="Oportunidade Identificada",
            descricao=oportunidades[0][:280],
            client_name=client_name,
        )
        opp_path = feed_dir / f"06_oportunidade_{date_file}.png"
        opp_card.save(str(opp_path), "PNG", quality=95)
        generated["feed"].append(opp_path)

    # 4. Card alerta
    if alertas:
        print("  🎨 Gerando card alerta...")
        alert_card = make_alert_opportunity_card(
            tipo="alerta",
            titulo="Ponto de Atenção",
            descricao=alertas[0][:280],
            client_name=client_name,
        )
        alert_path = feed_dir / f"07_alerta_{date_file}.png"
        alert_card.save(str(alert_path), "PNG", quality=95)
        generated["feed"].append(alert_path)

    # 5. Story/WhatsApp Status
    print("  🎨 Gerando story/WhatsApp status...")
    story = make_story(
        top3=top5[:3],
        client_name=client_name,
        titulo_story=f"Insights do Dia — {setor[:30]}",
    )
    story_path = story_dir / f"story_{date_file}.png"
    story.save(str(story_path), "PNG", quality=95)
    generated["stories"].append(story_path)

    # 6. Copies
    print("  📝 Gerando copies...")
    copy_path = generate_copies(client, report_data, copy_dir)
    generated["copy"].append(copy_path)

    total = len(generated["feed"]) + len(generated["stories"]) + len(generated["copy"])
    print(f"\n✅ Social media pack gerado: {total} arquivos em {sm_dir}")
    print(f"   📸 Feed cards:  {len(generated['feed'])} imagens")
    print(f"   📱 Stories:     {len(generated['stories'])} imagem")
    print(f"   📝 Copies:      {len(generated['copy'])} arquivo TXT")

    return generated


# ─── STANDALONE: testar direto ───────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from gerar_relatorio_cliente import load_client, load_portfolio, build_report_data_template, CLIENTS_DIR

    client_id = sys.argv[1] if len(sys.argv) > 1 else "exemplo-cliente"
    client    = load_client(client_id)
    portfolio = load_portfolio()
    report_data = build_report_data_template(client)

    date_file   = datetime.now().strftime("%d%m%Y")
    report_dir  = CLIENTS_DIR / client_id / "reports" / date_file
    report_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n🚀 Guilds Social Media Generator")
    print(f"📋 Cliente: {client['nome_empresa']}")
    print("─" * 50)
    generate_social_media_pack(client, report_data, report_dir)
