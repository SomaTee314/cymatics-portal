# -*- coding: utf-8 -*-
"""Fallback OG image (1200×630) without Puppeteer. Run: python scripts/generate_og_pillow.py"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "og-image.png"
W, H = 1200, 630


def main() -> None:
    img = Image.new("RGB", (W, H), (10, 0, 20))
    px = img.load()
    for y in range(H):
        for x in range(W):
            # Base cool gradient (fractal-ish depth)
            cx, cy = x / W, y / H
            r = int(3 + 40 * (1 - cx) * (1 - cy) + 20 * cx)
            g = int(8 + 35 * cy + 25 * (1 - abs(cx - 0.42)))
            b = int(20 + 50 * cx * cy + 30 * (1 - cy))
            px[x, y] = (min(r, 80), min(g, 90), min(b, 120))

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(overlay)
    for cx, cy, rad, col in (
        (0.22, 0.32, 280, (85, 248, 255, 45)),
        (0.78, 0.22, 240, (138, 80, 255, 40)),
        (0.55, 0.82, 200, (0, 255, 200, 28)),
        (0.42, 0.48, 320, (85, 248, 255, 22)),
    ):
        x0 = int(W * cx - rad)
        y0 = int(H * cy - rad)
        dr.ellipse([x0, y0, x0 + rad * 2, y0 + rad * 2], fill=col)
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    draw = ImageDraw.Draw(img)  # RGB
    try:
        font_big = ImageFont.truetype("arial.ttf", 72)
        font_sub = ImageFont.truetype("arial.ttf", 28)
        font_small = ImageFont.truetype("arial.ttf", 20)
    except OSError:
        font_big = ImageFont.load_default()
        font_sub = font_big
        font_small = font_big

    s = 24
    c = (85, 248, 200)
    draw.line([(20, 20), (20 + s, 20)], fill=c, width=2)
    draw.line([(20, 20), (20, 20 + s)], fill=c, width=2)
    draw.line([(W - 20, 20), (W - 20 - s, 20)], fill=c, width=2)
    draw.line([(W - 20, 20), (W - 20, 20 + s)], fill=c, width=2)
    draw.line([(20, H - 20), (20 + s, H - 20)], fill=c, width=2)
    draw.line([(20, H - 20), (20, H - 20 - s)], fill=c, width=2)
    draw.line([(W - 20, H - 20), (W - 20 - s, H - 20)], fill=c, width=2)
    draw.line([(W - 20, H - 20), (W - 20, H - 20 - s)], fill=c, width=2)

    draw.text((56, 48), "CYMATICS", fill=(255, 255, 255), font=font_big)
    draw.text((56, 130), "PORTAL", fill=(255, 255, 255), font=font_big)
    draw.text((56, 230), "Sound Made Visible", fill=(140, 255, 230), font=font_sub)
    draw.line([56, 270, 260, 270], fill=(85, 248, 255), width=3)

    tag = "Chladni patterns · Solfeggio · Sacred geometry · Three.js · Web Audio"
    draw.text((56, H - 72), tag, fill=(220, 220, 230), font=font_small)

    img.save(OUT, "PNG", optimize=True)
    print("Wrote", OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
