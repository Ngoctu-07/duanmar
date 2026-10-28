/**
 * Occult detailing for the hidden lore texture.
 *
 * Drawn as a separate layer on top of the Hua mansion plan and the Lawang Sewu
 * arches: bloody ritual sigils, bloody fingerprints, rune bands nailed to the
 * mansion walls, Latin inscriptions and a torn demonic codex. Everything is
 * deliberately faint and blood-red, with the centre column kept clear for UI
 * copy. Coordinates mirror `plan` in generate-global-lore-texture.mjs.
 */

const BLOOD = "#8f1d1d";
const BONE = "#d8c8a8";

/** Deterministic LCG so reruns produce the same texture. */
export function createRng(seed = 0x1313) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const fmt = (value) => Number(value.toFixed(2));

/** Pentagram + double ring + 13 radiating strokes, relative to (0, 0). */
function sigil(r, stroke = BLOOD) {
  const point = (index) => {
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / 5);
    return [fmt(Math.cos(angle) * r), fmt(Math.sin(angle) * r)];
  };
  const star = [0, 2, 4, 1, 3].map(point);
  const ticks = Array.from({ length: 13 }, (_, index) => {
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / 13);
    const inner = r * 1.06;
    const outer = r * 1.16;
    return `<line x1="${fmt(Math.cos(angle) * inner)}" y1="${fmt(Math.sin(angle) * inner)}" x2="${fmt(Math.cos(angle) * outer)}" y2="${fmt(Math.sin(angle) * outer)}" stroke="${stroke}" stroke-width="1" opacity="0.7"/>`;
  }).join("");
  return `<circle r="${r}" fill="none" stroke="${stroke}" stroke-width="1.4" opacity="0.85"/>
    <circle r="${fmt(r * 0.82)}" fill="none" stroke="${stroke}" stroke-width="0.8" stroke-dasharray="4 7" opacity="0.7"/>
    <circle r="${fmt(r * 0.52)}" fill="none" stroke="${stroke}" stroke-width="0.7" opacity="0.55"/>
    <polygon points="${star.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${stroke}" stroke-width="1.1" opacity="0.85"/>
    ${ticks}`;
}

const placeSigil = (cx, cy, r, opacity) =>
  `<g transform="translate(${cx} ${cy})" opacity="${opacity}">${sigil(r)}</g>`;

/** Concentric bloody fingerprint whorls, relative to (0, 0). */
function fingerprint() {
  const whorls = Array.from({ length: 6 }, (_, index) => {
    const r = 7 + index * 3.1;
    const start = -150 + index * 9;
    const end = 130 - index * 6;
    const x1 = fmt(Math.cos((start * Math.PI) / 180) * r);
    const y1 = fmt(Math.sin((start * Math.PI) / 180) * r);
    const x2 = fmt(Math.cos((end * Math.PI) / 180) * r);
    const y2 = fmt(Math.sin((end * Math.PI) / 180) * r);
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}" fill="none" stroke="${BLOOD}" stroke-width="1.25" stroke-linecap="round" opacity="${0.55 - index * 0.04}"/>`;
  }).join("");
  return `<g opacity="0.9">${whorls}
    <path d="M 0 13 C 6 10 8 3 4 -2" fill="none" stroke="${BLOOD}" stroke-width="1.1" stroke-linecap="round" opacity="0.5"/>
  </g>`;
}

const placeFingerprint = (cx, cy, rotation, scale, opacity) =>
  `<g transform="translate(${cx} ${cy}) rotate(${rotation}) scale(${scale})" opacity="${opacity}">${fingerprint()}</g>`;

/** One crude rune glyph drawn from 2–4 random strokes inside a size box. */
function rune(random, size, opacity) {
  const part = () => [fmt(random() * size), fmt(random() * size)];
  const count = 2 + Math.floor(random() * 3);
  const strokes = Array.from({ length: count }, () => {
    const [x1, y1] = part();
    const [x2, y2] = part();
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${BLOOD}" stroke-width="1.1" stroke-linecap="round" opacity="${opacity}"/>`;
  }).join("");
  return `<g>${strokes}</g>`;
}

function runeBand(random, x, y, count, step, { vertical = false, size = 10, opacity = 0.5 } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const gx = vertical ? x : x + index * step;
    const gy = vertical ? y + index * step : y;
    return `<g transform="translate(${gx} ${gy}) rotate(${vertical ? 90 : 0})">${rune(random, size, opacity)}</g>`;
  }).join("");
}

/** Torn codex page with a sigil pressed in blood. */
function codex(x, y, width, height, rotation, caption, sigilRadius) {
  return `<g transform="translate(${x} ${y}) rotate(${rotation})">
    <polygon points="0,6 ${width * 0.24},0 ${width * 0.52},7 ${width * 0.78},1 ${width},9 ${width - 6},${height * 0.38} ${width},${height - 8} ${width * 0.7},${height} ${width * 0.42},${height - 7} ${width * 0.16},${height} 0,${height - 5} 5,${height * 0.55}" fill="#e8e1cf" opacity="0.06"/>
    <polygon points="0,6 ${width * 0.24},0 ${width * 0.52},7 ${width * 0.78},1 ${width},9 ${width - 6},${height * 0.38} ${width},${height - 8} ${width * 0.7},${height} ${width * 0.42},${height - 7} ${width * 0.16},${height} 0,${height - 5} 5,${height * 0.55}" fill="none" stroke="#efe8d6" stroke-width="1" opacity="0.13"/>
    <g transform="translate(${width / 2} ${height / 2 - 8})" opacity="0.55">${sigil(sigilRadius)}</g>
    ${Array.from({ length: 3 }, (_, row) => `<rect x="18" y="${18 + row * 15}" width="${width * (0.35 + row * 0.14)}" height="2.5" fill="#f1ead8" opacity="0.09"/>`).join("")}
    <text x="18" y="${height - 14}" fill="${BONE}" font-family="Georgia, serif" font-size="11" letter-spacing="2" opacity="0.3">${caption}</text>
  </g>`;
}

/**
 * @param {{x:number,y:number,w:number,h:number}} plan Mansion plan bounds.
 * @param {number} seed
 */
export function buildOccultMarkup(plan, seed = 0x1313) {
  const random = createRng(seed);
  const marks = [];

  // Large ritual circles: one pressed behind the mansion plan, one deep in the
  // Lawang Sewu corridor, plus a small seal on the codex.
  marks.push(placeSigil(plan.x + 270, plan.y + 380, 210, 0.12));
  marks.push(placeSigil(1520, 570, 118, 0.15));
  marks.push(placeSigil(1210, 840, 52, 0.14));

  // Occult inscriptions follow the floor-plan walls.
  marks.push(runeBand(random, plan.x + 24, plan.y + 20, 21, 28, { size: 11, opacity: 0.55 }));
  marks.push(runeBand(random, plan.x - 16, plan.y + 60, 23, 32, { vertical: true, size: 11, opacity: 0.45 }));
  marks.push(runeBand(random, plan.x + 300, plan.y + 302, 14, 25, { size: 9, opacity: 0.42 }));
  marks.push(runeBand(random, plan.x + 250, plan.y + 730, 16, 24, { size: 9, opacity: 0.4 }));
  marks.push(runeBand(random, 1120, 90, 9, 34, { vertical: true, size: 9, opacity: 0.32 }));

  // Bloody fingerprints on the walls, plan and archive photographs.
  marks.push(placeFingerprint(150, 610, -18, 1.15, 0.55));
  marks.push(placeFingerprint(615, 245, 24, 0.95, 0.45));
  marks.push(placeFingerprint(555, 610, 8, 0.85, 0.5));
  marks.push(placeFingerprint(1785, 620, -8, 1.05, 0.45));
  marks.push(placeFingerprint(1728, 452, 12, 0.7, 0.38));

  // Occult inscriptions in Latin, scattered but never in the centre column.
  const inscriptions = [
    [plan.x + 92, plan.y + 262, -2, "SOLVE ET COAGULA"],
    [plan.x + 380, plan.y + 468, 1.5, "SANGUIS MEMORIAE"],
    [plan.x + 96, plan.y + 690, -1, "NON REVERTAR"],
    [1200, 420, -4, "THE THIRD KNOCK"],
    [1450, 860, 2, "XIII — 1927"],
    [1810, 760, 90, "NANG NAK"],
  ];
  marks.push(
    inscriptions
      .map(
        ([x, y, rotation, value]) =>
          `<text transform="translate(${x} ${y}) rotate(${rotation})" fill="${BLOOD}" font-family="Georgia, serif" font-size="13" letter-spacing="3" opacity="0.6">${value}</text>`
      )
      .join("")
  );

  // Numerical cipher columns — 666, 13, coordinates, hex.
  const ciphers = [
    [plan.x - 36, plan.y + 430, "VI VI VI"],
    [plan.x + 500, plan.y + 60, "13.13.1927"],
    [1180, 1010, "0xDEAD // 13"],
    [1380, 120, "SIGIL 06 — DO NOT OPEN"],
    [1760, 1000, "MAE NAK / 13"],
  ];
  marks.push(
    ciphers
      .map(
        ([x, y, value]) =>
          `<text x="${x}" y="${y}" fill="${BLOOD}" font-family="Consolas, monospace" font-size="13" letter-spacing="2" opacity="0.5">${value}</text>`
      )
      .join("")
  );

  // A torn demonic codex in the top-right shadow.
  marks.push(codex(1180, 30, 250, 150, 4, "CODEX XIII — RITUAL", 42));

  return marks.join("");
}
