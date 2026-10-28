import sharp from "sharp";
import { buildOccultMarkup } from "./lib/lore-occult-markup.mjs";
import { buildMicroLoreMarkup } from "./lib/lore-micro-lore.mjs";

/**
 * Generates the hidden lore texture behind the global torch spotlight.
 *
 * Midjourney is not reachable here (no API, and the Gemini image models reject
 * the free-tier key with quota 0), so the requested composition is rendered
 * deterministically: left half = the 1920s Hua family mansion (Saigon) floor
 * plan + detective notes, right half = Lawang Sewu's arched corridor blended
 * with Mae Nak folklore. Separate occult and micro-lore passes add pentagram
 * sigils, fingerprints, rune bands, dragged bloody handprints, alchemical
 * seals, weathered case files and scratched ciphers to every zone — including
 * the arch interiors, borders and centre column — so no viewport crop lands on
 * empty line-art. The new micro-lore group stays at 10–20% opacity, well under
 * the white UI copy; the occult pass keeps its established low-contrast ink.
 *
 * Run: node scripts/generate-global-lore-texture.mjs
 */

const W = 1920;
const H = 1080;
const OUT = "public/images/global-lore-texture.jpg";

let seed = 0x0606;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const BLUE = "#9cc4e4";
const PARTS = [];
const line = (x1, y1, x2, y2, width = 1.5, opacity = 0.5) =>
  PARTS.push(
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${BLUE}" stroke-width="${width}" opacity="${opacity}"/>`
  );
const text = (x, y, value, size = 16, opacity = 0.45, color = "#c2dcf0", family = "Georgia, serif") =>
  PARTS.push(
    `<text x="${x}" y="${y}" fill="${color}" font-family="${family}" font-size="${size}" opacity="${opacity}">${value}</text>`
  );

// ---------------------------------------------------------------- Hua mansion (left)
const plan = { x: 60, y: 90, w: 660, h: 840 };
const wallPair = (x1, y1, x2, y2) => {
  line(x1, y1, x2, y2, 3, 0.55);
  line(x1 + 7, y1 + 7, x2 + 7, y2 + 7, 1, 0.4);
};
wallPair(plan.x, plan.y, plan.x + plan.w, plan.y);
wallPair(plan.x, plan.y + plan.h, plan.x + plan.w, plan.y + plan.h);
wallPair(plan.x, plan.y, plan.x, plan.y + plan.h);
wallPair(plan.x + plan.w, plan.y, plan.x + plan.w, plan.y + plan.h);
[
  [280, 0, 280, 290],
  [280, 290, 0, 290],
  [450, 0, 450, 400],
  [450, 400, 660, 400],
  [0, 580, 220, 580],
  [220, 580, 220, 840],
  [220, 700, 660, 700],
].forEach(([x1, y1, x2, y2]) => wallPair(plan.x + x1, plan.y + y1, plan.x + x2, plan.y + y2));
[[130, 290, 1], [450, 150, 1], [560, 400, 0], [220, 780, 1], [520, 700, 0]].forEach(
  ([cx, cy, sweep]) => {
    const r = 44;
    PARTS.push(
      `<path d="M ${plan.x + cx} ${plan.y + cy} a ${r} ${r} 0 0 ${sweep} ${r} ${r}" fill="none" stroke="${BLUE}" stroke-width="1.3" opacity="0.42"/>`
    );
  }
);
for (let step = 0; step < 8; step += 1) {
  line(plan.x + 40, plan.y + 610 + step * 24, plan.x + 190, plan.y + 610 + step * 24, 1, 0.4);
}
// Dimensions + title block.
line(plan.x, plan.y - 30, plan.x + plan.w, plan.y - 30, 1, 0.42);
line(plan.x - 30, plan.y, plan.x - 30, plan.y + plan.h, 1, 0.42);
text(plan.x - 10, plan.y - 40, "18.40 m", 15);
text(plan.x - 190, plan.y + plan.h / 2, "23.10 m", 15);
text(plan.x + 360, plan.y + 790, "VILLA HUA", 22, 0.55);
text(plan.x + 360, plan.y + 818, "DINH THỰ HỌ HỨA — SAÏGON 1927", 13, 0.45);
line(plan.x + 360, plan.y + 776, plan.x + 640, plan.y + 776, 1, 0.45);
text(plan.x + 360, plan.y + 842, "SHEET 04 / EAST WING SEALED", 12, 0.4);

// Ancient manuscript scraps (left, torn edges).
const scrap = (tx, ty, rot, width, height, caption) => {
  const jags = [];
  for (let index = 0; index <= 12; index += 1) {
    jags.push(`${(width / 12) * index},${index % 2 ? 3 + random() * 9 : 0}`);
  }
  for (let index = 12; index >= 0; index -= 1) {
    jags.push(`${(width / 12) * index},${height - (index % 3 ? 4 + random() * 12 : 0)}`);
  }
  return `<g transform="translate(${tx} ${ty}) rotate(${rot})">
    <polygon points="${jags.join(" ")}" fill="#e8e1cf" opacity="0.07"/>
    <polygon points="${jags.join(" ")}" fill="none" stroke="#efe8d6" stroke-width="1" opacity="0.14"/>
    ${Array.from({ length: 7 }, (_, row) => {
      const lw = width * (0.5 + random() * 0.3);
      return `<rect x="18" y="${30 + row * 18}" width="${lw}" height="3" fill="#f1ead8" opacity="${0.07 + random() * 0.05}"/>`;
    }).join("")}
    <text x="18" y="${height - 18}" fill="#f4eddc" font-family="Georgia, serif" font-size="11" letter-spacing="2" opacity="0.2">${caption}</text>
  </g>`;
};
const scraps = [
  scrap(90, 30, -4, 300, 200, "MANUSCRIT — 1927"),
  scrap(600, 860, 5, 300, 170, "SAÏGON — NOTE 13"),
];

// ------------------------------------------------------- Lawang Sewu + Mae Nak (right)
const architecture = [];
const arch = (cx, baseY, w, h, opacity) => {
  const half = w / 2;
  architecture.push(
    `<path d="M ${cx - half} ${baseY} L ${cx - half} ${baseY - h + half} A ${half} ${half} 0 0 1 ${cx + half} ${baseY - h + half} L ${cx + half} ${baseY}" fill="none" stroke="${BLUE}" stroke-width="2" opacity="${opacity}"/>`,
    `<path d="M ${cx - half + 14} ${baseY} L ${cx - half + 14} ${baseY - h + half + 14} A ${half - 14} ${half - 14} 0 0 1 ${cx + half - 14} ${baseY - h + half + 14} L ${cx + half - 14} ${baseY}" fill="none" stroke="${BLUE}" stroke-width="1" opacity="${opacity * 0.7}"/>`
  );
};
// Receding corridor: five archways, shrinking toward the vanishing point.
const archways = [
  [1240, 920, 360, 560, 0.42],
  [1410, 880, 280, 460, 0.36],
  [1550, 840, 210, 360, 0.3],
  [1655, 800, 150, 270, 0.25],
  [1730, 770, 100, 190, 0.2],
];
archways.forEach(([cx, baseY, w, h, o]) => arch(cx, baseY, w, h, o));
for (let step = 1; step <= 6; step += 1) {
  line(1080, 760 + step * 34, 1880, 700 + step * 22, 1, 0.18);
}
// Perspective floor + hanging lamps.
architecture.push(
  `<path d="M 1080 1000 L 1880 860 M 1080 1040 L 1880 920" stroke="${BLUE}" stroke-width="1" opacity="0.2"/>`,
  `<circle cx="1550" cy="330" r="16" fill="none" stroke="${BLUE}" stroke-width="1.4" opacity="0.4"/>`,
  `<path d="M 1550 346 L 1550 420" stroke="${BLUE}" stroke-width="1" opacity="0.3"/>`
);
text(1800, 1025, "LAWANG SEWU — 1919", 14, 0.4);
// Mae Nak, a veiled figure in the last archway.
architecture.push(
  `<g transform="translate(1730 690)" opacity="0.5">`,
  `<ellipse cx="0" cy="10" rx="26" ry="30" fill="#c9b7a2" opacity="0.1"/>`,
  `<path d="M -26 40 Q 0 22 26 40 L 34 150 L -34 150 Z" fill="#c9b7a2" opacity="0.08"/>`,
  `<path d="M -20 18 Q -34 60 -30 140 M 20 18 Q 34 60 30 140" stroke="#c9b7a2" stroke-width="2" opacity="0.18" fill="none"/>`,
  `<path d="M -9 0 Q 0 -12 9 0" stroke="#c9b7a2" stroke-width="1.6" opacity="0.20" fill="none"/>`,
  `</g>`
);
text(1665, 890, "นางนาก — MAE NAK", 15, 0.38, "#d9c9a5");

// Cryptic codes, coordinates, investigative fragments.
const codes = [
  [760, 980, "0x1A4F // 27-1927"],
  [180, 990, "SIGNAL 06:06 — SEALED"],
  [1180, 120, "10.7769°N 106.7009°E"],
  [1450, 180, "LAWANG SEWU // 07°00'S"],
  [1240, 1030, "13.7563°N 100.5018°E"],
  [430, 1015, "THE EAST WING IS NOT ON THE PLAN"],
];
const codeMarkup = codes
  .map(
    ([x, y, value]) =>
      `<text x="${x}" y="${y}" fill="#a9c9e2" font-family="Consolas, monospace" font-size="15" letter-spacing="2" opacity="0.4">${value}</text>`
  )
  .join("");
const notes = [
  [520, 60, -2, "count the windows: 13", 19],
  [1170, 960, 1.5, "she still waits by the last arch", 20],
  [1400, 250, -3, "do not answer the third knock", 19],
  [760, 1040, 0, "who signed the deed in 1927?", 18],
];
const noteMarkup = notes
  .map(
    ([x, y, rot, value, size]) =>
      `<text transform="translate(${x} ${y}) rotate(${rot})" fill="#d9c9a5" font-family="Segoe Script, Georgia, serif" font-style="italic" font-size="${size}" opacity="0.45">${value}</text>`
  )
  .join("");
const occultMarkup = buildOccultMarkup(plan);
const microLoreMarkup = buildMicroLoreMarkup({ plan, archways, width: W, height: H });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="45%" r="74%">
      <stop offset="30%" stop-color="#000" stop-opacity="0"/>
      <stop offset="70%" stop-color="#000" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.82"/>
    </radialGradient>
    <radialGradient id="centre" cx="50%" cy="46%" r="40%">
      <stop offset="0%" stop-color="#060606" stop-opacity="0.5"/>
      <stop offset="65%" stop-color="#060606" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#060606" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.05"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#060606"/>
  <g opacity="0.28" transform="rotate(-1.2 390 540)">${PARTS.join("")}</g>
  <g opacity="0.5">${architecture.join("")}</g>
  <g>${scraps.join("")}</g>
  <g opacity="0.92">${occultMarkup}</g>
  ${microLoreMarkup}
  <g>${codeMarkup}${noteMarkup}</g>
  <rect width="${W}" height="${H}" fill="url(#centre)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.5"/>
</svg>`;

const info = await sharp(Buffer.from(svg))
  .jpeg({ quality: 84, chromaSubsampling: "4:2:0" })
  .toFile(OUT);

console.log(`wrote ${OUT} — ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
