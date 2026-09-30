/**
 * Generates the knockout (white-stroke, transparent-fill) footer logo.
 *
 * Source of truth: public/images/logo-duanmar.png (512x512 RGBA).
 * Transform: out = (255, 255, 255, round(alpha * luminance)) where luminance is
 * WCAG sRGB relative luminance — bright source pixels (lettering, pig, circles)
 * become opaque white strokes, dark pixels (ring band, disc) become transparent
 * so the red footer background shows through. No background fill.
 *
 * Output (committed, deterministic — safe to re-run):
 *   public/images/logo-duanmar-white.png
 *
 * Sanity assertions guard against an inverted/broken transform (a white-filled
 * badge would still look "fine" at a glance): the output must stay mostly
 * transparent AND keep a solid amount of opaque white linework.
 *
 * Usage: npm run logo:knockout
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "public", "images", "logo-duanmar.png");
const OUTPUT = join(ROOT, "public", "images", "logo-duanmar-white.png");

/** WCAG sRGB relative luminance for one 0-255 channel value. */
function channelLuminance(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

async function main() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  if (info.width !== 512 || info.height !== 512 || info.channels !== 4) {
    throw new Error(
      `expected 512x512 RGBA source, got ${info.width}x${info.height} x${info.channels}ch`
    );
  }

  const out = Buffer.alloc(data.length);
  let transparent = 0;
  let opaqueWhite = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    const luminance =
      0.2126 * channelLuminance(r) +
      0.7152 * channelLuminance(g) +
      0.0722 * channelLuminance(b);
    const alpha = Math.round(a * luminance);
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = alpha;
    if (alpha < 10) transparent += 1;
    if (alpha > 245) opaqueWhite += 1;
  }

  const pixels = info.width * info.height;
  const transparentPct = (transparent / pixels) * 100;
  const opaqueWhitePct = (opaqueWhite / pixels) * 100;
  console.log(
    `knockout histogram: ${transparentPct.toFixed(1)}% transparent, ` +
      `${opaqueWhitePct.toFixed(1)}% opaque white, ` +
      `${(100 - transparentPct - opaqueWhitePct).toFixed(1)}% semi`
  );
  if (transparentPct < 40) {
    throw new Error(`transparent ${transparentPct.toFixed(1)}% < 40% (white-filled badge?)`);
  }
  if (opaqueWhitePct < 10) {
    throw new Error(`opaque white ${opaqueWhitePct.toFixed(1)}% < 10% (empty output?)`);
  }

  const png = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  writeFileSync(OUTPUT, png);
  console.log(`logo-duanmar-white.png written (${png.length} bytes)`);
}

main().catch((error) => {
  console.error(`logo:knockout failed — ${error.message}`);
  process.exit(1);
});
