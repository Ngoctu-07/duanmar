/**
 * Generates the DuanMar favicon/web-app icon set from the brand logo.
 *
 * Source of truth: public/images/logo-duanmar.png (512x512 RGBA, transparent).
 * Outputs (committed, deterministic — safe to re-run):
 *   public/favicon.ico           16+32 legacy fallback (PNG-in-ICO)
 *   public/icon.svg              scalable favicon for high-DPI / dark tabs
 *   public/apple-touch-icon.png  180x180 iOS home screen (flattened on white)
 *   public/icon-192.png          PWA/Android icon (keeps alpha)
 *   public/icon-512.png          PWA/Android icon (keeps alpha)
 *
 * Usage: npm run icons:generate
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildIco } from "./lib/png-in-ico-writer.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "public", "images", "logo-duanmar.png");
const PUBLIC = join(ROOT, "public");

/** Render the square source at `size`, optionally flattening alpha onto white. */
async function render(size, { flatten = false } = {}) {
  let pipeline = sharp(SOURCE).resize(size, size, { fit: "cover", position: "centre" });
  if (flatten) pipeline = pipeline.flatten({ background: "#ffffff" });
  return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

/** Wrap the 512px raster in an SVG shell — no vector source exists in repo. */
function buildSvg(pngBuffer) {
  const base64 = pngBuffer.toString("base64");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">`,
    `<title>DuanMar</title>`,
    `<image href="data:image/png;base64,${base64}" x="0" y="0" width="512" height="512"/>`,
    `</svg>`,
    ``,
  ].join("\n");
}

function write(name, buffer) {
  const file = join(PUBLIC, name);
  writeFileSync(file, buffer);
  console.log(`  ${name.padEnd(22)} ${String(buffer.length).padStart(7)} bytes`);
}

async function main() {
  readFileSync(SOURCE); // fail fast when the source logo is missing
  console.log(`favicon set ← public/images/logo-duanmar.png`);

  const icon512 = await render(512);
  const icon192 = await render(192);
  const apple180 = await render(180, { flatten: true });
  const faviconIco = buildIco([await render(16), await render(32)]);
  const iconSvg = Buffer.from(buildSvg(icon512), "utf8");

  write("icon-512.png", icon512);
  write("icon-192.png", icon192);
  write("apple-touch-icon.png", apple180);
  write("favicon.ico", faviconIco);
  write("icon.svg", iconSvg);
}

main().catch((error) => {
  console.error(`icons:generate failed — ${error.message}`);
  process.exit(1);
});
