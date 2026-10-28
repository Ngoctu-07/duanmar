import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Inverted laser cursor contract.
 *
 * One 8px white disc with `mix-blend-mode: difference`, no rings/halos/trails,
 * `pointer-events: none`, hidden native cursor only on fine pointers, and
 * `translate3d(var(--cursor-x), var(--cursor-y), 0)` tracking written once per
 * pointermove frame. The hidden lore asset must carry the new occult detailing.
 */

const root = new URL("../../", import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, root), "utf8");

const component = read("src/components/layout/inverted-laser-cursor.tsx");
const css = read("src/app/globals.css");
const layout = read("src/app/layout.tsx");
const generator = read("scripts/generate-global-lore-texture.mjs");
const occult = read("scripts/lib/lore-occult-markup.mjs");

const laserBlock = css.match(/\.laser-cursor \{[\s\S]*?\n\}/)?.[0] ?? "";

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

check("cursor is a single 8px solid round dot with no rings or halos", () => {
  assert.match(component, /className="laser-cursor h-2 w-2 rounded-full"/);
  assert.match(laserBlock, /width: 8px;/);
  assert.match(laserBlock, /height: 8px;/);
  assert.match(laserBlock, /border-radius: 9999px;/);
  assert.match(laserBlock, /border: 0;/);
  assert.match(laserBlock, /outline: 0;/);
  assert.match(laserBlock, /box-shadow: none;/);
  assert.doesNotMatch(laserBlock, /box-shadow: (?!none)/);
  assert.doesNotMatch(laserBlock, /::before|::after/);
  assert.doesNotMatch(component, /cursor-(ring|halo|trail)|data-testid="cursor-(ring|halo|trail)"/i);
  assert.equal((component.match(/data-testid="laser-cursor"/g) ?? []).length, 1);
});

check("dot is pure white and inverts its backdrop with difference", () => {
  assert.match(laserBlock, /background-color: #ffffff;/);
  assert.match(laserBlock, /mix-blend-mode: difference;/);
});

check("dot never intercepts pointer input", () => {
  assert.match(laserBlock, /pointer-events: none;/);
  assert.match(component, /className="laser-cursor h-2 w-2 rounded-full"/);
});

check("tracking uses translate3d driven by --cursor-x / --cursor-y", () => {
  assert.match(
    laserBlock,
    /transform: translate3d\(var\(--cursor-x, -100px\), var\(--cursor-y, -100px\), 0\)\s+translate\(-50%, -50%\)/
  );
  assert.match(component, /setProperty\("--cursor-x", `\$\{x\}px`\)/);
  assert.match(component, /setProperty\("--cursor-y", `\$\{y\}px`\)/);
  assert.match(component, /if \(frame === 0\) frame = window\.requestAnimationFrame\(paint\)/);
  assert.match(component, /addEventListener\("pointermove", showAt, \{ passive: true \}\)/);
  assert.match(laserBlock, /will-change: transform;/);
});

check("hidden native cursor is gated to fine pointers only", () => {
  assert.match(component, /const FINE_POINTER = "\(hover: hover\) and \(pointer: fine\)"/);
  assert.match(component, /root\.classList\.add\("laser-cursor-active"\)/);
  assert.match(component, /root\.classList\.remove\("laser-cursor-active"\)/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{\s*html\.laser-cursor-active,/);
  assert.match(css, /html\.laser-cursor-active \*/);
  assert.match(css, /html\.laser-cursor-active \* \{\s*cursor: none !important;/);
});

check("touch and coarse pointers keep the platform cursor", () => {
  assert.match(css, /@media \(hover: none\), \(pointer: coarse\) \{\s*\.laser-cursor \{\s*display: none;/);
  assert.match(component, /if \(event\.pointerType === "touch"\) return;/);
  assert.match(component, /window\.removeEventListener\("pointermove", showAt\)/);
  assert.match(component, /root\.classList\.remove\("laser-cursor-active"\)/);
});

check("dot hides until first move and on leave/blur", () => {
  assert.match(component, /data-visible="false"/);
  assert.match(component, /if \(dot\.dataset\.visible !== "true"\) dot\.dataset\.visible = "true"/);
  assert.match(component, /addEventListener\("pointerleave", onLeave\)/);
  assert.match(component, /addEventListener\("blur", onBlur\)/);
  assert.match(component, /const onLeave = \(\) => hide\(\)/);
  assert.match(component, /const onBlur = \(\) => hide\(\)/);
  assert.match(css, /\.laser-cursor\[data-visible="true"\] \{\s*opacity: 1;/);
});

check("cursor is mounted once in the root layout after the CRT overlay", () => {
  assert.match(layout, /import \{ InvertedLaserCursor \}/);
  const crt = layout.indexOf("<CrtStaticOverlay />");
  const cursor = layout.indexOf("<InvertedLaserCursor />");
  assert.ok(crt > -1 && cursor > crt, "cursor must be the last fixed layer");
});

check("lore generator composes the new occult pass", () => {
  assert.match(generator, /import \{ buildOccultMarkup \} from "\.\/lib\/lore-occult-markup\.mjs"/);
  assert.match(generator, /const occultMarkup = buildOccultMarkup\(plan\)/);
  assert.match(generator, /<g opacity="0\.92">\$\{occultMarkup\}<\/g>/);
  assert.match(occult, /SANGUIS MEMORIAE/);
  assert.match(occult, /SOLVE ET COAGULA/);
  assert.match(occult, /CODEX XIII/);
  assert.match(occult, /function fingerprint/);
  assert.match(occult, /function runeBand/);
  assert.match(occult, /polygon points=.*star/);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
