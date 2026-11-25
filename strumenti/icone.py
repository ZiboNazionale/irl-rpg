"""
Disegna le icone dell'app (public/icons): sfondo scuro, anello verde e la scritta "IRL".
Uso: python strumenti/icone.py   (serve Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CARTELLA = Path(__file__).resolve().parent.parent / "public" / "icons"
SFONDO = (11, 13, 16, 255)
ACCENTO = (194, 248, 90, 255)
FONT = "C:/Windows/Fonts/bahnschrift.ttf"


def icona(lato: int, mascherabile: bool = False) -> Image.Image:
    # Disegnata in grande e poi rimpicciolita, così i bordi sono morbidi.
    s = 1024
    img = Image.new("RGBA", (s, s), SFONDO if mascherabile else (0, 0, 0, 0))
    g = ImageDraw.Draw(img)
    if not mascherabile:
        g.rounded_rectangle((0, 0, s - 1, s - 1), radius=220, fill=SFONDO)
    # Le icone "maskable" devono stare nell'80% centrale.
    margine = 210 if mascherabile else 120
    g.ellipse((margine, margine, s - margine, s - margine), outline=ACCENTO, width=46)
    font = ImageFont.truetype(FONT, 300 if mascherabile else 360)
    try:
        font.set_variation_by_axes([700, 75])  # grassetto, condensato
    except Exception:
        pass
    g.text((s / 2, s / 2 + 10), "IRL", font=font, fill=(238, 241, 244, 255), anchor="mm")
    return img.resize((lato, lato), Image.LANCZOS)


CARTELLA.mkdir(parents=True, exist_ok=True)
for lato in (72, 96, 128, 144, 152, 192, 384, 512):
    icona(lato).save(CARTELLA / f"icon-{lato}x{lato}.png", optimize=True)
icona(512, mascherabile=True).save(CARTELLA / "icon-maskable-512x512.png", optimize=True)
icona(32).save(CARTELLA.parent / "favicon.ico", sizes=[(16, 16), (32, 32)])
print("icone pronte")
