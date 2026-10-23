#!/usr/bin/env python3
"""Vietnamese-localized Gypsy Curse builder.

The 2005 Gypsy Curse freeware font only covers Latin-1, and its accented
glyphs are SinisterFonts.com watermark placeholders. This script keeps the
original Latin letterforms and composes the full Vietnamese alphabet
(Â Ă Đ Ê Ô Ơ Ư + grave/acute/hook/tilde/dot-below) from them.

Usage:  python scripts/build-vietnamese-gypsy-font.py
Input:  src/app/fonts/gypsy-curse-original.woff2
Output: src/app/fonts/gypsy-curse.woff2

Requires fontTools and skia-pathops (`python -m pip install fonttools
brotli skia-pathops`). skia-pathops is used to thicken the very thin
lowercase "r" so Chrome/Skia cannot rasterise it as a transparent outline.
"""

import random
import unicodedata
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

try:
    import pathops
except ImportError as exc:  # pragma: no cover - build-time dependency
    raise SystemExit(
        "skia-pathops is required to rebuild the display font: "
        "python -m pip install skia-pathops"
    ) from exc

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/app/fonts/gypsy-curse-original.woff2"
OUT = ROOT / "src/app/fonts/gypsy-curse.woff2"

COMBINING = {
    0x0300: "grave",
    0x0301: "acute",
    0x0302: "circumflex",
    0x0303: "tilde",
    0x0306: "breve",
    0x0309: "hook",
    0x031B: "horn",
    0x0323: "dotbelow",
}

VI_CHARS = []
for stem in "aăâeêioôơuưy":
    for tone in ["", "\u0301", "\u0300", "\u0309", "\u0303", "\u0323"]:
        VI_CHARS.append(unicodedata.normalize("NFC", stem + tone).upper())
        VI_CHARS.append(unicodedata.normalize("NFC", stem + tone))
VI_CHARS = sorted(set(VI_CHARS + ["đ", "Đ"]), key=ord)

def bbox_of(glyph_set, glyph_name):
    pen = BoundsPen(glyph_set)
    glyph_set[glyph_name].draw(pen)
    return pen.bounds

def draw_fragment(pen, glyph_set, glyph_name, sx, sy, tx, ty):
    glyph_set[glyph_name].draw(TransformPen(pen, (sx, 0, 0, sy, tx, ty)))

def rough(points, seed, amount=3.0, step=42.0):
    """Subdivide + jitter a polygon so added marks share the font texture."""
    rng = random.Random(seed)
    out = []
    for index, start in enumerate(points):
        end = points[(index + 1) % len(points)]
        out.append(start)
        dx, dy = end[0] - start[0], end[1] - start[1]
        length = max((dx * dx + dy * dy) ** 0.5, 0.001)
        chunks = max(int(length // step), 1)
        nx, ny = -dy / length, dx / length
        for chunk in range(1, chunks):
            t = chunk / chunks
            jitter = rng.uniform(-amount, amount)
            out.append((start[0] + dx * t + nx * jitter, start[1] + dy * t + ny * jitter))
    return out

def polygon(pen, points):
    pen.moveTo(points[0])
    for point in points[1:]:
        pen.lineTo(point)
    pen.closePath()

def mark_acute(pen, x, y):
    polygon(pen, rough([
        (x - 14, y), (x + 12, y - 3), (x + 62, y + 94), (x + 42, y + 110),
    ], seed=int(x * 13 + y)))

def mark_grave(pen, x, y):
    polygon(pen, rough([
        (x + 14, y), (x - 12, y - 3), (x - 62, y + 94), (x - 42, y + 110),
    ], seed=int(x * 17 + y)))

def mark_circumflex(pen, x, y):
    polygon(pen, rough([
        (x - 80, y + 2), (x + 2, y + 88), (x + 80, y + 2),
        (x + 52, y - 13), (x + 2, y + 50), (x - 52, y - 13),
    ], seed=int(x * 7 + y)))

def mark_breve(pen, x, y):
    polygon(pen, rough([
        (x - 70, y + 50), (x - 36, y + 14), (x, y + 4),
        (x + 36, y + 14), (x + 70, y + 50),
        (x + 42, y + 30), (x, y + 26), (x - 40, y + 32),
    ], seed=int(x * 11 + y)))

def mark_tilde(pen, x, y):
    polygon(pen, rough([
        (x - 66, y + 30), (x - 34, y + 62), (x, y + 42),
        (x + 30, y + 24), (x + 58, y + 48), (x + 66, y + 60),
        (x + 34, y + 32), (x + 4, y + 50), (x - 26, y + 68),
        (x - 56, y + 40),
    ], seed=int(x * 5 + y)))

def mark_hook(pen, x, y):
    draw_fragment(pen, GLYPH_SET, "quotesingle", 0.58, 0.58,
                  x - 36.95 * 0.58, y - 448 * 0.58)

def mark_dotbelow(pen, x, y):
    draw_fragment(pen, GLYPH_SET, "period", 0.85, 0.85,
                  x - 41.5 * 0.85, y - 76 * 0.85)

def mark_horn(pen, x, y):
    polygon(pen, rough([
        (x - 8, y - 10), (x + 18, y + 10), (x + 24, y + 38),
        (x + 30, y + 66), (x + 60, y + 74), (x + 70, y + 90),
        (x + 26, y + 80), (x + 14, y + 46), (x + 8, y + 20),
        (x - 12, y + 6),
    ], seed=int(x * 23 + y), amount=2.0))

def mark_dbar(pen, left, right, center_y):
    """Reuse the hyphen's rough scratch as the Đ crossbar."""
    src_left, src_right = 53.0, 440.0
    sx = (right - left) / (src_right - src_left)
    sy = 0.85
    draw_fragment(pen, GLYPH_SET, "hyphen", sx, sy,
                  left - src_left * sx, center_y - 344.5 * sy)

def thicken_hollow_r(width=20.0):
    """Make the thin lowercase 'r' render solid at every subpixel offset.

    The original r is a single very thin contour around a large counter.
    Skia (Chrome) resolves that outline as transparent at some fractional
    x offsets — most visibly in "Trong" — while FreeType renders it solid.
    Expanding the outline by 20 font units keeps the letterform but makes
    the stroke robust across rasterisers, sizes and zoom levels.
    """
    glyph_set = font.getGlyphSet()
    original = pathops.Path()
    glyph_set["r"].draw(original.getPen())

    stroked = pathops.Path(original)
    stroked.stroke(
        width,
        pathops.LineCap.ROUND_CAP,
        pathops.LineJoin.ROUND_JOIN,
        4.0,
    )
    stroked.convertConicsToQuads()
    base = pathops.Path(original)
    base.convertConicsToQuads()
    merged = pathops.op(base, stroked, pathops.PathOp.UNION)

    pen = TTGlyphPen(None)
    merged.draw(pen)
    glyph = pen.glyph()
    glyph.recalcBounds(glyf)
    glyf["r"] = glyph
    hmtx.metrics["r"] = (hmtx["r"][0], getattr(glyph, "xMin", 0))


font = TTFont(SRC)
GLYPH_SET = font.getGlyphSet()
cmap = font.getBestCmap()
glyf, hmtx = font["glyf"], font["hmtx"]
font.flavor = None

letters = {}
for char in VI_CHARS:
    cp = ord(char)
    if char in "đĐ":
        letters[cp] = ("d" if char == "đ" else "D", [], True)
        continue
    decomposed = unicodedata.normalize("NFD", char)
    letters[cp] = (decomposed[0], [COMBINING[ord(m)] for m in decomposed[1:]], False)

font.setGlyphOrder(font.getGlyphOrder() + [
    "uni%04X" % cp for cp in letters if cp not in cmap
])

new_entries = {}
for cp, (base_char, marks, is_dbar) in letters.items():
    base_gn = cmap[ord(base_char)]
    base_bbox = bbox_of(GLYPH_SET, base_gn)
    glyph_name = cmap.get(cp) or "uni%04X" % cp
    advance = hmtx[base_gn][0]

    pen = TTGlyphPen(None)
    GLYPH_SET[base_gn].draw(pen)
    x = (base_bbox[0] + base_bbox[2]) / 2
    top = base_bbox[3] + 14

    if is_dbar:
        draw_left, draw_right = (-45, advance - 70) if base_char == "D" else (10, advance - 5)
        mark_dbar(pen, draw_left, draw_right, 470 if base_char == "D" else 420)
    else:
        if "circumflex" in marks:
            mark_circumflex(pen, x, top)
            top += 112
        if "breve" in marks:
            mark_breve(pen, x, top)
            top += 96
        if "horn" in marks:
            mark_horn(pen, base_bbox[2] - 26, base_bbox[3] - 40)
            x -= 14
        for tone, draw in (("grave", mark_grave), ("acute", mark_acute),
                           ("tilde", mark_tilde), ("hook", mark_hook)):
            if tone in marks:
                draw(pen, x, top)
                break
        if "dotbelow" in marks:
            mark_dotbelow(pen, x, -150)

    glyph = pen.glyph()
    glyph.recalcBounds(glyf)
    glyf[glyph_name] = glyph
    hmtx.metrics[glyph_name] = (advance, getattr(glyph, "xMin", 0))
    new_entries[cp] = glyph_name

for table in font["cmap"].tables:
    if table.isUnicode():
        table.cmap.update(new_entries)

# Keep the base 'r' solid under Skia's subpixel rasteriser (see docstring).
thicken_hollow_r()

font.flavor = "woff2"
font.recalcTimestamp = False
font.save(OUT)
print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes, {len(new_entries)} VI glyphs)")
