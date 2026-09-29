"""Isolate the circular DuanMar badge from a black-square JPEG.

Detects the white outer ring, builds an anti-aliased circular alpha mask and
writes a square RGBA PNG with everything outside the badge transparent.
Usage: python make-transparent-logo.py [src.jpg] [out.png]
"""
import sys
from PIL import Image, ImageDraw

SS = 4  # supersampling factor for smooth alpha edge


def detect_badge(gray):
    """Bounding box of bright pixels (= white badge ring)."""
    mask = gray.point(lambda v: 255 if v > 170 else 0)
    return mask.getbbox()


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "logo-source.jpg"
    dst = sys.argv[2] if len(sys.argv) > 2 else "logo-duanmar.png"

    img = Image.open(src).convert("RGB")
    box = detect_badge(img.convert("L"))
    if not box:
        raise SystemExit("badge not found: no bright pixels")
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    r = min(x1 - x0, y1 - y0) / 2

    # crop to a square tightly framing the badge, then pad to full coverage
    side = int(round(2 * r)) + 2
    left, top = int(round(cx - side / 2)), int(round(cy - side / 2))
    crop = img.crop((left, top, left + side, top + side))

    # circular alpha mask, supersampled then downscaled for anti-aliasing
    big = Image.new("L", (side * SS, side * SS), 0)
    d = ImageDraw.Draw(big)
    c = side * SS / 2
    rad = (r + 1) * SS
    d.ellipse((c - rad, c - rad, c + rad, c + rad), fill=255)
    alpha = big.resize((side, side), Image.LANCZOS)

    out = crop.convert("RGBA")
    out.putalpha(alpha)
    out = out.resize((512, 512), Image.LANCZOS)
    out.save(dst)
    print(f"badge box={box} center=({cx:.1f},{cy:.1f}) r={r:.1f} -> {dst} {out.size}")


if __name__ == "__main__":
    main()
