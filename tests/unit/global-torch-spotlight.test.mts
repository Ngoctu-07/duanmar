import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";

/**
 * Global torch spotlight contract.
 *
 * The hidden lore texture is revealed by a 200px radial mask that follows the
 * pointer through --mouse-x / --mouse-y, updated once per animation frame. The
 * layer is mounted in the root layout behind every page, is pitch black outside
 * the beam, and pauses while any form/dialog owns focus. Touch and reduced
 * motion get a static centred glow.
 */

const req = createRequire(new URL("../../package.json", import.meta.url));
const sharp = req("sharp") as typeof import("sharp");

const root = new URL("../../", import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, root), "utf8");
const asset = new URL("public/images/global-lore-texture.jpg", root).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1"
);

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

const component = read("src/components/layout/global-torch-spotlight.tsx");
const rootLayout = read("src/app/layout.tsx");
const css = read("src/app/globals.css");
const heroBackdrop = read("src/components/homepage/hero-ambient-backdrop.tsx");

await check("lore texture exists at 1920x1080 and stays lightweight", async () => {
  assert.ok(existsSync(asset), "asset missing");
  assert.ok(statSync(asset).size < 400 * 1024, "asset should stay under 400 KB");
  const meta = await sharp(asset).metadata();
  assert.equal(meta.width, 1920);
  assert.equal(meta.height, 1080);
});

await check("component is a client leaf with rAF-throttled pointer tracking", () => {
  assert.match(component, /^"use client";/m);
  assert.match(component, /addEventListener\("pointermove", onPointerMove, \{ passive: true \}\)/);
  assert.match(component, /if \(frame === 0\) frame = window\.requestAnimationFrame\(paint\)/);
  assert.match(component, /setProperty\("--mouse-x"/);
  assert.match(component, /setProperty\("--mouse-y"/);
});

await check("forms, inputs, contenteditable and dialogs pause the torch", () => {
  for (const token of ['"input"', '"textarea"', '"select"', '"form"', '"[contenteditable=\'true\']"', '"[role=\'dialog\']"']) {
    assert.ok(component.includes(token), `missing exclusion token ${token}`);
  }
  assert.match(component, /document\.addEventListener\("focusin", syncExclusion\)/);
  assert.match(component, /document\.addEventListener\("focusout", onFocusOut\)/);
  assert.match(component, /layer\.dataset\.paused = paused \? "true" : "false"/);
  assert.match(component, /if \(paused \|\| event\.pointerType === "touch"\) return/);
});

await check("touch pointers and reduced motion fall back to a static glow", () => {
  assert.match(component, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /removeEventListener\("pointermove", onPointerMove\)/);
  assert.match(component, /removeProperty\("--mouse-x"\)/);
});

await check("layer is decorative and cannot intercept the UI", () => {
  assert.match(component, /aria-hidden/);
  assert.match(component, /pointer-events-none fixed inset-0 overflow-hidden/);
  assert.match(component, /className="global-torch-reveal"/);
  assert.match(component, /className="global-torch-glow"/);
});

await check("mask is the 200px emissive torch on --mouse-x/--mouse-y", () => {
  assert.match(css, /\.global-torch-reveal \{/);
  assert.match(css, /circle 200px at var\(--mouse-x, 50%\) var\(--mouse-y, 50%\)/);
  assert.match(css, /rgb\(255 255 255 \/ 100%\) 0%/);
  assert.match(css, /rgb\(255 255 255 \/ 40%\) 50%/);
  assert.match(css, /transparent 100%/);
});

await check("outside the beam stays pitch black #060606 with a warm glow", () => {
  assert.match(css, /\.global-torch \{[\s\S]*?background-color: #060606;/);
  assert.match(css, /\.global-torch-glow \{/);
  assert.match(css, /rgb\(255 232 190 \/ 12%\)/);
});

await check("CSS pauses the reveal while a form owns focus", () => {
  assert.match(css, /\.global-torch\[data-paused="true"\] \.global-torch-reveal/);
  assert.match(css, /\.global-torch\[data-paused="true"\] \.global-torch-glow/);
});

await check("coarse pointers and reduced motion pin a static centred torch", () => {
  assert.match(css, /@media \(hover: none\), \(pointer: coarse\)/);
  assert.match(css, /circle 260px at 50% 38%/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /circle 220px at 50% 38%/);
});

await check("root layout mounts the torch globally, behind the app", () => {
  assert.match(rootLayout, /import \{ GlobalTorchSpotlight \}/);
  const torch = rootLayout.indexOf("<GlobalTorchSpotlight />");
  const children = rootLayout.indexOf("{children}");
  assert.ok(torch > -1 && children > torch, "torch must render before page children");
  assert.match(css, /\.global-torch \{[\s\S]*?position: fixed;[\s\S]*?z-index: -1;/);
});

await check("homepage canvas no longer hides the global layer or keeps the old mask", () => {
  assert.match(css, /\.horror-canvas \{[\s\S]*?background-color: transparent;/);
  assert.doesNotMatch(css, /spotlight-blueprint/);
  assert.doesNotMatch(heroBackdrop, /SpotlightBlueprint/);
  assert.doesNotMatch(heroBackdrop, /spotlight-blueprint/);
});

await check("generator reproduces the shipped lore texture", () => {
  const script = read("scripts/generate-global-lore-texture.mjs");
  assert.match(script, /public\/images\/global-lore-texture\.jpg/);
  assert.match(script, /#060606/);
  assert.match(script, /LAWANG SEWU/);
  assert.match(script, /MAE NAK/);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
