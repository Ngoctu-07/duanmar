import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

/**
 * High-density micro-lore contract.
 *
 * The hidden texture must carry bloody palm prints, dragged handprints, claw
 * scratches, weathered Saigon case files and alchemical sigils in every zone a
 * viewport can crop to — arch interiors, borders, and the centre column. The
 * detail group stays in the 10–20% opacity band, and actual pixel variance
 * proves the zones are not plain dark gradients.
 */

const req = createRequire(new URL("../../package.json", import.meta.url));
const sharp = req("sharp") as typeof import("sharp");

const root = new URL("../../", import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, root), "utf8");
const assetPath = fileURLToPath(new URL("../../public/images/global-lore-texture.jpg", import.meta.url));

const generator = read("scripts/generate-global-lore-texture.mjs");
const microLore = read("scripts/lib/lore-micro-lore.mjs");
const css = read("src/app/globals.css");

const zoneStats = async (left: number, top: number, width: number, height: number) => {
  const cropped = await sharp(assetPath).extract({ left, top, width, height }).toBuffer();
  const stats = await sharp(cropped).greyscale().stats();
  return {
    mean: Number(stats.channels[0].mean.toFixed(2)),
    stdev: Number(stats.channels[0].stdev.toFixed(2)),
  };
};

let passed = 0;
let failed = 0;
const check = async (name: string, fn: () => void | Promise<void>) => {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

await check("texture ships at 1920x1080 under the size budget", async () => {
  assert.ok(existsSync(assetPath), "asset missing");
  assert.ok(statSync(assetPath).size < 400 * 1024, "asset should stay under 400 KB");
  const meta = await sharp(assetPath).metadata();
  assert.equal(meta.width, 1920);
  assert.equal(meta.height, 1080);
});

await check("micro-lore group is capped inside the 10–20% opacity band", () => {
  assert.match(microLore, /export const MICRO_LORE_OPACITY = 0\.18;/);
  assert.match(microLore, /return `<g opacity="\$\{MICRO_LORE_OPACITY\}">/);
});

await check("all required micro-lore primitives exist", () => {
  for (const token of [
    "function palmPrint",
    "function dragHandprint",
    "function scratchCipher",
    "function alchemicalSigil",
    "function caseFile",
    "function stain",
    "CASE FILE 13",
    "SAÏGON",
    "SEALED",
    "BLOOD ON THE BLUEPRINT",
    "THE CORRIDOR REMEMBERS EVERY STEP",
  ]) {
    assert.ok(microLore.includes(token), `missing ${token}`);
  }
});

await check("every zone is populated, including archways and the centre", () => {
  for (const token of [
    "archways.forEach",
    "dragHandprint(cx - inner",
    "caseFile(780, 280",
    "caseFile(700, 90",
    "caseFile(880, 640",
    "alchemicalSigil(1015, 520",
    "palmPrint(1090, 250",
    "for (let y = 110",
    "for (let x = 90",
    "width - 46",
    "width - 72",
    "plan.x + 220",
  ]) {
    assert.ok(microLore.includes(token), `missing zone marker ${token}`);
  }
  assert.match(microLore, /for \(let y = 120;[\s\S]*?width - 72/);
});

await check("generator composes micro-lore from the shared archway geometry", () => {
  assert.match(generator, /import \{ buildMicroLoreMarkup \} from "\.\/lib\/lore-micro-lore\.mjs"/);
  assert.match(generator, /const archways = \[/);
  assert.match(generator, /const microLoreMarkup = buildMicroLoreMarkup\(\{ plan, archways, width: W, height: H \}\)/);
  assert.match(generator, /<g opacity="0\.92">\$\{occultMarkup\}<\/g>\s*\$\{microLoreMarkup\}/);
});

await check("runtime markup carries all primitives inside the opacity guard", async () => {
  const microLoreModule = (await import(
    pathToFileURL(fileURLToPath(new URL("../../scripts/lib/lore-micro-lore.mjs", import.meta.url))).href
  )) as {
    buildMicroLoreMarkup: (layout: unknown, seed?: number) => string;
    MICRO_LORE_OPACITY: number;
  };
  const markup = microLoreModule.buildMicroLoreMarkup({
    plan: { x: 60, y: 90, w: 660, h: 840 },
    archways: [
      [1240, 920, 360, 560],
      [1410, 880, 280, 460],
      [1550, 840, 210, 360],
      [1655, 800, 150, 270],
      [1730, 770, 100, 190],
    ],
    width: 1920,
    height: 1080,
  });
  assert.ok(markup.startsWith(`<g opacity="${microLoreModule.MICRO_LORE_OPACITY}">`));
  assert.ok(markup.length > 40_000, `markup too sparse: ${markup.length} chars`);
  assert.ok((markup.match(/<g /g) ?? []).length > 60, "expected dense nested detail groups");
  assert.match(markup, /CASE FILE 13/);
  assert.match(markup, /SEALED/);
  const opacities = [...markup.matchAll(/opacity="([0-9.]+)"/g)].map((match) => Number(match[1]));
  assert.ok(opacities.every((value) => value <= 0.9), "individual detail opacity must stay <= 0.9");
  assert.ok(microLoreModule.MICRO_LORE_OPACITY >= 0.1 && microLoreModule.MICRO_LORE_OPACITY <= 0.2);
});

await check("centre crop is textured, not a plain dark gradient", async () => {
  const stats = await zoneStats(760, 250, 380, 650);
  assert.ok(stats.mean > 6, `centre mean too dark: ${stats.mean}`);
  assert.ok(stats.stdev > 1.8, `centre lacks variance: ${stats.stdev}`);
});

await check("archway crop keeps dragged handprints and scratches", async () => {
  const stats = await zoneStats(1100, 280, 760, 650);
  assert.ok(stats.mean > 6, `arch mean too dark: ${stats.mean}`);
  assert.ok(stats.stdev > 2.5, `arch lacks variance: ${stats.stdev}`);
});

await check("borders carry visible micro-lore on every side", async () => {
  const left = await zoneStats(0, 80, 90, 920);
  const right = await zoneStats(1830, 80, 90, 920);
  const top = await zoneStats(650, 0, 600, 220);
  const bottom = await zoneStats(200, 950, 1500, 130);
  assert.ok(left.stdev > 2.5, `left border plain: ${left.stdev}`);
  assert.ok(right.stdev > 1.2, `right border plain: ${right.stdev}`);
  assert.ok(top.stdev > 3.5, `top border plain: ${top.stdev}`);
  assert.ok(bottom.stdev > 5, `bottom border plain: ${bottom.stdev}`);
});

await check("texture remains full-bleed and centred for every viewport crop", () => {
  const revealBlock = css.match(/\.global-torch-reveal \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(revealBlock, /background-size: cover;/);
  assert.match(revealBlock, /background-position: center;/);
  assert.match(revealBlock, /background-repeat: no-repeat;/);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
