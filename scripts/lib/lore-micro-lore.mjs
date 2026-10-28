/**
 * High-density horror micro-lore that fills every "empty" zone of the hidden
 * texture: arch interiors, structural lines, borders and the centre column that
 * a portrait viewport crops to. Everything is deliberately faint — the outer
 * group is capped at 18% opacity and individual marks stay below 0.9 — so the
 * 8px torch reveal gains density without touching white UI legibility.
 *
 * Layout is data-driven from the mansion plan and the Lawang Sewu archways so
 * the generator remains the single source of truth for geometry.
 */

const BLOOD = "#7f1d1d";
const RUST = "#8a2a1a";
const BONE = "#cbbca0";

/** Group-level opacity guard: details land in the requested 10–20% band. */
export const MICRO_LORE_OPACITY = 0.18;

/** Tiny cryptic fragments reused across the borders and case files. */
const FRAGMENTS = [
  "SAÏGON — 1927 — CASE 13",
  "WITNESS: NGUYEN VAN ...",
  "THE WALLS REMEMBER",
  "06:06 — 13 — 1927",
  "NON REVERTAR",
  "SHE WAITS BEHIND THE THIRD ARCH",
  "0xDEAD 0x1A4F",
  "BLOOD TYPE: UNKNOWN",
  "DO NOT CROSS THE SEAL",
  "13.7563 N 100.5018 E",
  "THE EAST WING IS SEALED",
  "COUNT THE WINDOWS: 13",
  "THREE KNOCKS — NO ANSWER",
  "SANGUIS MEMORIAE",
];

export function createRng(seed = 0x2a2a) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const fmt = (value) => Number(value.toFixed(2));
const g = (transform, content, opacity = 0.9) =>
  `<g transform="${transform}" opacity="${opacity}">${content}</g>`;

const text = (x, y, value, size = 9, opacity = 0.75, color = BONE, rotation = 0) =>
  g(
    `translate(${x} ${y}) rotate(${rotation})`,
    `<text fill="${color}" font-family="Consolas, monospace" font-size="${size}" letter-spacing="1.5" opacity="${opacity}">${value}</text>`
  );

/** One blood-stained palm print (palm + four fingers + thumb). */
export function palmPrint(x, y, rotation = 0, scale = 1, opacity = 0.8) {
  const fingers = [
    [-14, -14, -22],
    [-5, -22, -8],
    [5, -23, 6],
    [14, -18, 18],
    [22, 2, 42],
  ]
    .map(
      ([cx, cy, angle]) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="3.2" ry="8" transform="rotate(${angle} ${cx} ${cy})" fill="${BLOOD}" opacity="0.7"/>`
    )
    .join("");
  return g(
    `translate(${x} ${y}) rotate(${rotation}) scale(${scale})`,
    `<ellipse cx="0" cy="2" rx="14" ry="18" fill="${BLOOD}" opacity="0.55"/>
     ${fingers}
     <path d="M -8 18 Q 0 24 8 18" fill="none" stroke="${RUST}" stroke-width="2" opacity="0.45"/>`,
    opacity
  );
}

/** Palm print with smeared streaks dragging down a wall or arch. */
export function dragHandprint(x, y, rotation = 0, scale = 1, drag = 120, opacity = 0.8) {
  const streaks = [0, 1, 2, 3]
    .map((index) => {
      const offset = -8 + index * 5.5;
      const length = drag * (0.55 + index * 0.12);
      return `<path d="M ${offset} 18 C ${offset - 5} ${length * 0.35} ${offset + 6} ${length * 0.6} ${offset - 2} ${length}" fill="none" stroke="${BLOOD}" stroke-width="${2.4 - index * 0.35}" stroke-linecap="round" opacity="${0.5 - index * 0.08}"/>`;
    })
    .join("");
  const droplets = [0, 1, 2]
    .map(
      (index) =>
        `<circle cx="${-5 + index * 7}" cy="${drag * (0.7 + index * 0.09)}" r="${1.6 - index * 0.3}" fill="${BLOOD}" opacity="0.45"/>`
    )
    .join("");
  return `${palmPrint(x, y, rotation, scale, opacity)}${g(
    `translate(${x} ${y}) rotate(${rotation}) scale(${scale})`,
    `<g>${streaks}${droplets}</g>`,
    opacity
  )}`;
}

/** Four ragged claw scratches, optionally with a scratched number. */
export function scratchCipher(x, y, rotation = 0, scale = 1, opacity = 0.8, count = 4) {
  const scratches = Array.from({ length: count }, (_, index) => {
    const offset = index * 6 - (count * 6) / 2;
    return `<path d="M ${offset} 0 L ${offset - 7} 15 L ${offset + 3} 31 L ${offset - 4} 48" fill="none" stroke="${RUST}" stroke-width="1.2" stroke-linecap="round" opacity="${0.65 - index * 0.07}"/>`;
  }).join("");
  return g(
    `translate(${x} ${y}) rotate(${rotation}) scale(${scale})`,
    `<g>${scratches}<text x="${count * 3 + 6}" y="34" fill="${BLOOD}" font-family="Georgia, serif" font-size="13" opacity="0.7">13</text></g>`,
    opacity
  );
}

/** Blood/alchemical sigil: ring, triangle, inner disc and cardinal ticks. */
export function alchemicalSigil(x, y, r, opacity = 0.8) {
  const ticks = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4;
    return `<line x1="${fmt(Math.cos(angle) * r * 1.08)}" y1="${fmt(Math.sin(angle) * r * 1.08)}" x2="${fmt(Math.cos(angle) * r * 1.2)}" y2="${fmt(Math.sin(angle) * r * 1.2)}" stroke="${BLOOD}" stroke-width="1" opacity="0.6"/>`;
  }).join("");
  const triangle = Array.from({ length: 3 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 3;
    return `${fmt(Math.cos(angle) * r * 0.72)},${fmt(Math.sin(angle) * r * 0.72)}`;
  }).join(" ");
  return g(
    `translate(${x} ${y})`,
    `<circle r="${r}" fill="none" stroke="${BLOOD}" stroke-width="1.2"/>
     <circle r="${fmt(r * 0.84)}" fill="none" stroke="${RUST}" stroke-width="0.7" stroke-dasharray="3 6"/>
     <polygon points="${triangle}" fill="none" stroke="${BLOOD}" stroke-width="1.1"/>
     <circle r="${fmt(r * 0.24)}" fill="none" stroke="${RUST}" stroke-width="0.9"/>
     <path d="M 0 ${fmt(-r * 0.72)} L ${fmt(-r * 0.36)} ${fmt(r * 0.4)} L ${fmt(r * 0.36)} ${fmt(r * 0.4)} Z" fill="none" stroke="${RUST}" stroke-width="0.6" opacity="0.7"/>
     ${ticks}`,
    opacity
  );
}

/** Irregular blood smear. */
export function stain(x, y, rx, ry, rotation = 0, opacity = 0.7) {
  return g(
    `translate(${x} ${y}) rotate(${rotation})`,
    `<ellipse rx="${rx}" ry="${ry}" fill="${BLOOD}" opacity="0.32"/>
     <ellipse cx="${rx * 0.4}" cy="${-ry * 0.2}" rx="${rx * 0.35}" ry="${ry * 0.5}" fill="${RUST}" opacity="0.25"/>
     <circle cx="${-rx * 0.6}" cy="${ry * 0.4}" r="${Math.max(1.4, rx * 0.16)}" fill="${BLOOD}" opacity="0.4"/>`,
    opacity
  );
}

/** Weathered Saigon detective case file with typed rows, stamp and photo. */
export function caseFile(x, y, width, height, rotation = 0, opacity = 0.8, title = "CASE FILE 13") {
  const rows = Array.from({ length: 7 }, (_, index) => {
    const length = width * (0.42 + ((index * 17) % 40) / 100);
    return `<rect x="16" y="${46 + index * 13}" width="${fmt(length)}" height="2" fill="${BONE}" opacity="0.2"/>`;
  }).join("");
  return g(
    `translate(${x} ${y}) rotate(${rotation})`,
    `<polygon points="0,5 18,0 46,4 72,0 ${width},6 ${width - 5},${height * 0.4} ${width},${height - 6} ${width * 0.62},${height} ${width * 0.35},${height - 4} 8,${height} 0,${height - 7}" fill="#d8cbb0" opacity="0.05"/>
     <polygon points="0,5 18,0 46,4 72,0 ${width},6 ${width - 5},${height * 0.4} ${width},${height - 6} ${width * 0.62},${height} ${width * 0.35},${height - 4} 8,${height} 0,${height - 7}" fill="none" stroke="#d8cbb0" stroke-width="1" opacity="0.12"/>
     <text x="14" y="24" fill="${RUST}" font-family="Courier New, monospace" font-size="10" letter-spacing="2" opacity="0.65">${title}</text>
     <text x="14" y="37" fill="${BONE}" font-family="Courier New, monospace" font-size="7" letter-spacing="1" opacity="0.4">SAÏGON — 1927</text>
     ${rows}
     <rect x="${width - 58}" y="${height - 66}" width="42" height="46" fill="none" stroke="${BONE}" stroke-width="1" opacity="0.25"/>
     <path d="M ${width - 58} ${height - 66} L ${width - 16} ${height - 20} M ${width - 16} ${height - 66} L ${width - 58} ${height - 20}" stroke="${RUST}" stroke-width="0.8" opacity="0.28"/>
     <circle cx="${width - 66}" cy="48" r="17" fill="none" stroke="${RUST}" stroke-width="1.4" opacity="0.35" transform="rotate(-12 ${width - 66} 48)"/>
     <text x="${width - 87}" y="52" fill="${RUST}" font-family="Georgia, serif" font-size="7" letter-spacing="1" opacity="0.45" transform="rotate(-12 ${width - 66} 48)">SEALED</text>
     ${Array.from({ length: 3 }, (_, index) => `<rect x="${20 + index * 38}" y="${height - 26}" width="26" height="5" fill="#060606" opacity="0.55"/>`).join("")}`,
    opacity
  );
}

/**
 * @param {{plan:{x:number,y:number,w:number,h:number}, archways:number[][], width:number, height:number}} layout
 */
export function buildMicroLoreMarkup(layout, seed = 0x2a2a) {
  const { plan, archways, width, height } = layout;
  const random = createRng(seed);
  const pick = () => FRAGMENTS[Math.floor(random() * FRAGMENTS.length)];
  const marks = [];

  // ---- Archway interiors: dragged handprints, scratches, numbers, stains.
  archways.forEach(([cx, baseY, w, h], index) => {
    const scale = Math.max(0.38, w / 360);
    const drag = Math.min(210, h * 0.48);
    const inner = w * 0.36;
    marks.push(dragHandprint(cx - inner, baseY - h * 0.58, -6 + index * 2, scale, drag, 0.85));
    marks.push(dragHandprint(cx + inner, baseY - h * 0.72, 5 + index * 2, scale * 0.86, drag * 0.8, 0.7));
    marks.push(scratchCipher(cx - 26, baseY - 56, -5 + index * 3, scale * 0.9, 0.75, 4));
    marks.push(text(cx + 8, baseY - h * 0.18, `${13 + index} / ${1927 + index}`, 8, 0.65, BLOOD));
    marks.push(stain(cx + w * 0.28, baseY - h * 0.46, 14 * scale, 22 * scale, index * 22, 0.65));
    marks.push(text(cx - w * 0.3, baseY - h * 0.32, pick(), 7, 0.5, BONE, -index * 3));
  });

  // ---- Corridor floor: palm prints, drag marks and scattered papers.
  [[1180, 950, -18, 1.1], [1420, 990, 12, 0.8], [1660, 965, -6, 0.9], [1810, 1010, 20, 0.7]].forEach(
    ([x, y, rot, scale]) => {
      marks.push(palmPrint(x, y, rot, scale, 0.7));
      marks.push(dragHandprint(x + 34, y - 8, rot, scale * 0.7, 60, 0.55));
    }
  );
  marks.push(caseFile(1360, 880, 210, 135, -4, 0.7, "CASE 07 — WITNESS"));
  marks.push(text(1100, 1046, "THE CORRIDOR REMEMBERS EVERY STEP", 8, 0.45, RUST));

  // ---- Centre column: sparse but never empty (portrait crops land here).
  marks.push(caseFile(780, 280, 240, 185, -3, 0.9, "CASE FILE 13 — HUA"));
  marks.push(caseFile(700, 90, 210, 145, -5, 0.75, "CASE 13 — SAÏGON"));
  marks.push(caseFile(880, 640, 205, 155, 2.5, 0.82, "CASE 13 — WITNESS"));
  marks.push(alchemicalSigil(1015, 520, 76, 0.8));
  marks.push(alchemicalSigil(950, 155, 34, 0.7));
  marks.push(palmPrint(1090, 250, 24, 0.8, 0.7));
  marks.push(palmPrint(830, 810, -12, 0.75, 0.65));
  marks.push(scratchCipher(930, 590, -7, 1.1, 0.65, 5));
  marks.push(scratchCipher(1100, 760, 4, 0.85, 0.6, 4));
  marks.push(text(820, 240, "THE THIRD KNOCK", 9, 0.55, RUST, -2));
  marks.push(text(900, 860, pick(), 8, 0.5, BONE, 1));
  marks.push(text(960, 910, "0x1A4F 27 1927", 8, 0.45, RUST, 0));

  // ---- Borders: continuous cipher strips + corner seals.
  for (let y = 110; y < height - 80; y += 46) {
    marks.push(text(16, y, pick(), 7, 0.4, BONE, 90));
    marks.push(text(width - 18, y + 18, pick(), 7, 0.38, RUST, 90));
  }
  for (let y = 140; y < height - 90; y += 64) {
    marks.push(text(width - 46, y, pick(), 6, 0.45, BONE, 90));
  }
  for (let y = 120; y < height - 90; y += 38) {
    marks.push(text(width - 72, y, ["13", "1927", "06:06", "XIII", "666"][Math.floor(random() * 5)], 8, 0.55, BLOOD, 90));
  }
  marks.push(stain(width - 36, 320, 26, 90, 4, 0.6));
  marks.push(stain(width - 28, 860, 20, 60, -6, 0.55));
  marks.push(palmPrint(width - 44, 520, 90, 0.9, 0.6));
  marks.push(palmPrint(width - 44, 700, 90, 0.8, 0.55));
  marks.push(scratchCipher(width - 62, 300, 86, 0.8, 0.55, 3));
  marks.push(scratchCipher(width - 58, 760, 92, 0.75, 0.5, 3));
  marks.push(alchemicalSigil(width - 44, 180, 18, 0.5));
  marks.push(alchemicalSigil(width - 48, 950, 16, 0.45));
  marks.push(stain(width - 32, 500, 15, 38, 8, 0.5));
  marks.push(palmPrint(width - 52, 680, 88, 0.55, 0.45));
  for (let x = 90; x < width - 80; x += 190) {
    marks.push(text(x, 26, pick(), 7, 0.4, BONE));
    marks.push(text(x + 24, height - 18, pick(), 7, 0.38, RUST));
  }
  [[44, 44, 0.55], [width - 54, 58, 0.45], [56, height - 62, 0.45], [width - 60, height - 70, 0.55]].forEach(
    ([x, y, opacity]) => marks.push(alchemicalSigil(x, y, 24, opacity))
  );
  marks.push(stain(60, 560, 30, 56, -8, 0.5));
  marks.push(stain(width - 48, 700, 24, 48, 12, 0.45));
  marks.push(stain(920, 1034, 46, 18, 0, 0.4));

  // ---- The mansion: palms on the walls, scratches over the structural lines,
  //      blood at every wall junction and a case file pinned to the plan.
  [
    [plan.x + 70, plan.y + 150, -12, 0.9],
    [plan.x + 540, plan.y + 260, 16, 0.8],
    [plan.x + 120, plan.y + 640, -6, 0.85],
    [plan.x + 470, plan.y + 760, 10, 0.7],
  ].forEach(([x, y, rot, scale]) => {
    marks.push(palmPrint(x, y, rot, scale, 0.6));
    marks.push(dragHandprint(x + 18, y + 10, rot, scale * 0.65, 70, 0.5));
  });
  [
    [plan.x + 220, plan.y + 280, 3, 0.8],
    [plan.x + 390, plan.y + 545, -9, 0.7],
    [plan.x + 95, plan.y + 720, 6, 0.65],
    [plan.x + 600, plan.y + 120, -14, 0.7],
  ].forEach(([x, y, rot, scale]) => marks.push(scratchCipher(x, y, rot, scale, 0.6, 3)));
  [[plan.x, plan.y], [plan.x + plan.w, plan.y], [plan.x, plan.y + plan.h], [plan.x + plan.w, plan.y + plan.h]].forEach(
    ([x, y]) => marks.push(stain(x, y, 18, 14, 0, 0.45))
  );
  marks.push(caseFile(plan.x + 180, plan.y + 330, 190, 145, 4, 0.55, "CASE 13 — HUA"));
  marks.push(text(plan.x + 60, plan.y + 570, "BLOOD ON THE BLUEPRINT", 8, 0.45, RUST, -2));
  marks.push(text(plan.x + 250, plan.y + 680, "13 FAMILY MEMBERS", 9, 0.5, BLOOD, 0));

  // ---- Dense scratched/cipher filler over the widest empty bands.
  [
    [700, 120, -4, 0.9],
    [740, 880, 5, 0.8],
    [1160, 260, 8, 0.75],
    [1190, 950, -6, 0.85],
    [1690, 150, -3, 0.7],
    [1470, 700, 7, 0.7],
  ].forEach(([x, y, rot, scale]) => marks.push(scratchCipher(x, y, rot, scale, 0.6, 4)));

  return `<g opacity="${MICRO_LORE_OPACITY}">${marks.join("")}</g>`;
}
