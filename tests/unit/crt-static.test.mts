import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const contract = read("../../src/lib/crt-static.ts");
const overlay = read("../../src/components/layout/crt-static-overlay.tsx");
const audio = read("../../src/components/layout/use-static-burst-audio.ts");
const css = read("../../src/app/globals.css");
const rootLayout = read("../../src/app/layout.tsx");
const widget = read("../../src/components/assistant/assistant-widget.tsx");
const bookCta = read("../../src/components/booking/book-ticket-button.tsx");
const bookingForm = read("../../src/components/booking/booking-form.tsx");
const authModal = read("../../src/components/auth/auth-modal.tsx");
const solidAsset = read("../../public/images/ghost-icon.svg");
const outlineAsset = read("../../public/images/ghost-icon-outline.svg");

check("durations match the spec: 500ms splash + 300ms CTA", () => {
  assert.match(contract, /export const CRT_SPLASH_MS = 500;/);
  assert.match(contract, /export const CRT_ACTION_MS = 300;/);
});

check("overlay is mounted globally and is event-driven", () => {
  assert.match(rootLayout, /<CrtStaticOverlay \/>/);
  assert.match(contract, /export const CRT_STATIC_EVENT/);
  assert.match(overlay, /addEventListener\(CRT_STATIC_EVENT, onBurst\)/);
  assert.match(overlay, /data-crt-static/);
});

check("navigation no longer triggers the effect", () => {
  assert.doesNotMatch(overlay, /usePathname/);
  assert.doesNotMatch(css, /route-glitch/);
  assert.doesNotMatch(overlay, /route-glitching/);
  assert.doesNotMatch(rootLayout, /RouteGlitchTransition/);
});

check("landing splash plays once per session", () => {
  assert.match(overlay, /sessionStorage\.getItem\(CRT_SPLASH_KEY\)/);
  assert.match(overlay, /sessionStorage\.setItem\(CRT_SPLASH_KEY, "1"\)/);
  assert.match(overlay, /run\(CRT_SPLASH_MS\)/);
});

check("critical CTAs carry the 300ms trigger", () => {
  assert.match(bookCta, /data-crt-static="300"/);
  assert.match(bookingForm, /data-crt-static="300"/);
  assert.match(authModal, /data-crt-static="300"/);
});

check("audio burst follows the visual duration", () => {
  assert.match(audio, /AudioContext/);
  assert.match(audio, /createBufferSource\(/);
  assert.match(audio, /const SOUND_GAIN = 0\.0[0-9]+;/);
  assert.match(audio, /durationMs: number = CRT_ACTION_MS/);
  assert.match(overlay, /playStatic\(duration\)/);
});

check("reduced motion skips visuals and audio", () => {
  assert.match(overlay, /if \(prefersReducedMotion\(\)\) return;/);
  assert.match(contract, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/);
});

check("CRT filter: scanlines + RGB split + static noise, no page displacement", () => {
  assert.match(css, /\.crt-static__scanlines/);
  assert.match(css, /repeating-linear-gradient\(/);
  assert.match(css, /\.crt-static__chroma::before/);
  assert.match(css, /\.crt-static__chroma::after/);
  assert.match(css, /--crt-noise:/);
  assert.match(css, /@keyframes crt-static-grain/);
  assert.match(css, /@keyframes crt-static-roll/);
  assert.doesNotMatch(css, /html\.crt-static[^{]*main/);
  assert.doesNotMatch(css, /crt-static-page/);
});

check("overlay is inert and cleaned up on unmount", () => {
  assert.match(overlay, /aria-hidden="true"/);
  assert.match(css, /\.crt-static \{[\s\S]*?pointer-events: none;/);
  assert.match(audio, /ctx\.close\(\)/);
});

check("chatbot paints the symmetrical brand-red ghost artwork without clipping", () => {
  assert.match(widget, /assistant-ghost-solid/);
  assert.match(widget, /assistant-ghost-outline/);
  assert.match(css, /url\("\/images\/ghost-icon\.svg"\)/);
  assert.match(css, /url\("\/images\/ghost-icon-outline\.svg"\)/);
  assert.match(css, /background-size: contain;/);
  assert.match(solidAsset, /fill="#8B0000"/);
  assert.match(solidAsset, /<ellipse[^>]*fill="#120A0A"/);
  // Levitating silhouette redrawn from scratch: elongated curved shoulders,
  // tapering torso, three-lobe hem dipping to 55.5, mirror-symmetric about
  // x = 32, every coordinate inside x 13.4..50.6 / y 9..55.5 so the 64-unit
  // viewBox keeps ≥ 8 units of margin.
  const SYMMETRIC_PATH =
    'd="M14 49C13.4 41 13.8 32.8 15.6 25.4C17.8 15.2 23.6 9 32 9C40.4 9 46.2 15.2 48.4 25.4C50.2 32.8 50.6 41 50 49C50 52.5 47.6 55.5 44 55.5C40.4 55.5 38 52.5 38 49C38 52.5 35.6 55.5 32 55.5C28.4 55.5 26 52.5 26 49C26 52.5 23.6 55.5 20 55.5C16.4 55.5 14 52.5 14 49Z"';
  assert.ok(solidAsset.includes(SYMMETRIC_PATH), "solid path is the rebuilt ghost path");
  assert.ok(outlineAsset.includes(SYMMETRIC_PATH), "outline twin shares the same geometry");
  // Face contract: exactly two small oval eyes plus one small open mouth,
  // sized down relative to the longer torso so they never dominate the body.
  assert.match(solidAsset, /<ellipse cx="26" cy="26.5" rx="2.4" ry="2.9"/);
  assert.match(solidAsset, /<ellipse cx="38" cy="26.5" rx="2.4" ry="2.9"/);
  assert.match(solidAsset, /<ellipse cx="32" cy="37" rx="3.1" ry="3.6"/);
  assert.equal((solidAsset.match(/<ellipse/g) ?? []).length, 3, "two eyes + one mouth");
  assert.doesNotMatch(solidAsset, /cx="23"|cx="41"/);
  assert.match(outlineAsset, /stroke="#ffffff"/);
  // 64px square trigger, overflow visible on the whole FAB chain, snug 20px inset.
  assert.match(widget, /className="relative size-16 aspect-square overflow-visible/);
  assert.match(widget, /relative size-16 overflow-visible transition-transform/);
  assert.match(widget, /fixed right-5 bottom-5 z-40 overflow-visible/);
});

check("footer inversion still clips both layers independently", () => {
  assert.match(widget, /useFabFooterInversion\(/);
  assert.match(widget, /clipPath: "inset\(100% 0 0 0\)"/);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
