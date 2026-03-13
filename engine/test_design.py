from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# Paths
FONT_DIR = Path("/usr/share/fonts/truetype/lato")
F_BLACK = str(FONT_DIR / "Lato-Black.ttf")
F_BOLD = str(FONT_DIR / "Lato-Bold.ttf")
F_REGULAR = str(FONT_DIR / "Lato-Regular.ttf")
F_LIGHT = str(FONT_DIR / "Lato-Light.ttf")

# Colors
BG_START = (15, 23, 42) # Slate 900
BG_END = (2, 6, 23)     # Slate 950
ACCENT = (2ea, 88, 12)  # Orange/Brand
# ACCENT = (255, 107, 0) # Original Guilds Orange
ACCENT = (249, 115, 22)
TEXT_PRIMARY = (248, 250, 252) # Slate 50
TEXT_SECONDARY = (148, 163, 184) # Slate 400
GLASS_BG = (30, 41, 59, 180) # Slate 800 @ ~70%
GLASS_BORDER = (51, 65, 85, 255) # Slate 700

def load_font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def wrap_text(text: str, font, max_width: int, draw: ImageDraw.ImageDraw) -> list[str]:
    words = str(text).split()
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

def create_gradient_bg(width, height):
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        r = int(BG_START[0] + (BG_END[0] - BG_START[0]) * y / height)
        g = int(BG_START[1] + (BG_END[1] - BG_START[1]) * y / height)
        b = int(BG_START[2] + (BG_END[2] - BG_START[2]) * y / height)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Add some subtle grid lines
    grid_color = (255, 255, 255, 10)
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    
    step = 100
    for x in range(0, width, step):
        ov_draw.line([(x, 0), (x, height)], fill=grid_color, width=1)
    for y in range(0, height, step):
        ov_draw.line([(0, y), (width, y)], fill=grid_color, width=1)
        
    return Image.alpha_composite(img.convert("RGBA"), overlay)

def draw_glass_panel(img, xy, radius=24):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    
    x0, y0, x1, y1 = xy
    # Fill
    ov_draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=GLASS_BG)
    # Border
    ov_draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=None, outline=GLASS_BORDER, width=2)
    
    return Image.alpha_composite(img, overlay)

def make_test_card():
    width, height = 1080, 1080
    img = create_gradient_bg(width, height)
    draw = ImageDraw.Draw(img)
    
    # Glass Panel for main content
    margins = 60
    img = draw_glass_panel(img, (margins, 200, width - margins, height - 120))
    cv_draw = ImageDraw.Draw(img)
    
    # Brand Top
    fn_brand = load_font(F_BLACK, 32)
    cv_draw.text((margins, 80), "GUILDS", font=fn_brand, fill=ACCENT)
    brand_w = cv_draw.textbbox((0, 0), "GUILDS", font=fn_brand)[2]
    # small pill tag
    fn_tag = load_font(F_BOLD, 20)
    tag_x = margins + brand_w + 20
    tag_y = 86
    cv_draw.rounded_rectangle([tag_x, tag_y-4, tag_x + 180, tag_y + 24], radius=6, fill=(255,255,255,20))
    cv_draw.text((tag_x + 12, tag_y), "INTELLIGENCE ENGINE", font=fn_tag, fill=TEXT_SECONDARY)
    
    # Content inside glass
    y = 280
    fn_num = load_font(F_BLACK, 48)
    cv_draw.text((margins + 60, y), "#1", font=fn_num, fill=ACCENT)
    
    y += 80
    fn_title = load_font(F_BLACK, 64)
    title = "Microsoft and OpenAI announce new $100B Stargate Supercomputer"
    for line in wrap_text(title, fn_title, width - (margins*2 + 120), cv_draw):
        cv_draw.text((margins + 60, y), line, font=fn_title, fill=TEXT_PRIMARY)
        y += 72
        
    y += 40
    fn_desc = load_font(F_REGULAR, 36)
    desc = "The new infrastructure project aims to significantly increase AI training capacity. This move solidifies their partnership and creates a huge barrier to entry for smaller competitors in the foundational model space."
    for line in wrap_text(desc, fn_desc, width - (margins*2 + 120), cv_draw):
        cv_draw.text((margins + 60, y), line, font=fn_desc, fill=TEXT_SECONDARY)
        y += 50
        
    y += 60
    fn_action = load_font(F_BOLD, 28)
    cv_draw.rounded_rectangle([margins + 60, y, width - margins - 60, y + 80], radius=12, fill=(ACCENT[0], ACCENT[1], ACCENT[2], 30))
    cv_draw.rounded_rectangle([margins + 60, y, width - margins - 60, y + 80], radius=12, fill=None, outline=ACCENT, width=1)
    cv_draw.text((margins + 90, y + 25), "ACTION: Review AI infrastructure strategy and partnerships", font=fn_action, fill=ACCENT)
    
    # Footer
    fn_footer = load_font(F_REGULAR, 24)
    cv_draw.text((margins, height - 70), "For: TechFarma Soluções | Date: 13/03/2026", font=fn_footer, fill=TEXT_SECONDARY)
    cv_draw.text((width - margins, height - 70), "guilds.com.br", font=fn_footer, fill=TEXT_SECONDARY, anchor="ra")
    
    img.convert("RGB").save("test_modern_card.png", "PNG", quality=95)
    print("Test card saved to test_modern_card.png")

if __name__ == "__main__":
    make_test_card()
