import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Task D — full-viewport video hero, scroll-triggered header reveal, and the
 * standalone minimalist search.
 *
 * The live CMS has no hero promo video configured, so the hero degrades to the
 * hero image / gradient; the video element itself is asserted only when present.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const headerState = (page) =>
  page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return null;
    const rect = header.getBoundingClientRect();
    return {
      revealed: header.getAttribute("data-header-revealed"),
      home: header.getAttribute("data-header-home"),
      // Tailwind v4 translate utilities use the `translate` property, so read
      // the visual box instead of the `transform` matrix.
      rectTop: Math.round(rect.top),
      height: Math.round(rect.height),
    };
  });

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // ---------- V1 full-viewport hero ----------
  await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const hero = await page.evaluate(() => {
    const el = document.getElementById("home-hero");
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const h1 = el.querySelector("h1");
    const display = el.querySelector('[data-testid="hero-display"]');
    return {
      top: Math.round(rect.top),
      height: Math.round(rect.height),
      viewport: window.innerHeight,
      hasH1: Boolean(h1),
      h1Text: h1?.textContent?.trim() ?? "",
      displayIsH1: Boolean(display && h1 && display === h1),
      hasSlogan: Boolean(el.querySelector('[data-testid="hero-slogan"]')),
      hasArrow: Boolean(el.querySelector('[data-testid="hero-scroll-down"]')),
      hasVideo: Boolean(el.querySelector('[data-testid="hero-video"]')),
    };
  });
  check("V1 hero section present", Boolean(hero), JSON.stringify(hero));
  check("V2 hero fills the viewport (height ≈ viewport)", hero && Math.abs(hero.height - hero.viewport) <= 2, JSON.stringify({ h: hero?.height, v: hero?.viewport }));
  check("V2b hero starts at the top of the page (under the transparent header)", hero && Math.abs(hero.top) <= 2, `top=${hero?.top}`);
  check("V3 hero H1 = giant display wordmark, subtitle slogan removed", hero && hero.displayIsH1 && hero.h1Text === "DECODE TRAVEL" && hero.hasSlogan === false, JSON.stringify({ text: hero?.h1Text, isH1: hero?.displayIsH1, hasSlogan: hero?.hasSlogan }));
  check("V4 hero has a scroll-down affordance", hero?.hasArrow === true);
  if (hero?.hasVideo) check("V4b hero video is muted + looping + inline", await page.$eval('[data-testid="hero-video"]', (v) => v.muted && v.loop && v.playsInline), "video attrs");

  // ---------- V5 header hidden at top of the homepage ----------
  const top = await headerState(page);
  check("V5 header exists on homepage", Boolean(top), JSON.stringify(top));
  check("V5b header marked home + not revealed at scroll 0", top && top.home === "true" && top.revealed === "false", JSON.stringify(top));
  check("V5c header slid fully out of view (rect top ≈ -height)", top && top.rectTop <= -(top.height - 4), JSON.stringify(top));
  await page.screenshot({ path: `${OUT}/v-home-hero-top.png` });

  // ---------- V6 header reveals past 50% of the hero ----------
  await page.evaluate(() => {
    const el = document.getElementById("home-hero");
    window.scrollTo(0, Math.ceil((el ? el.offsetHeight : window.innerHeight) * 0.5) + 80);
  });
  await page
    .waitForFunction(() => document.querySelector("header")?.getAttribute("data-header-revealed") === "true", { timeout: 5000 })
    .catch(() => null);
  await sleep(400);
  const revealed = await headerState(page);
  check("V6 header reveals after scrolling past 50% of the hero", revealed?.revealed === "true" && Math.abs(revealed.rectTop) <= 2, JSON.stringify(revealed));
  await page.screenshot({ path: `${OUT}/v-home-hero-revealed.png` });

  // ---------- V7 header always visible off the homepage ----------
  await page.goto(`${BASE}/vi/tours/domestic`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const offHome = await headerState(page);
  check("V7 header always revealed off the homepage", offHome?.revealed === "true" && Math.abs(offHome.rectTop) <= 2, JSON.stringify(offHome));

  // ---------- V8 minimalist search section ----------
  await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const search = await page.evaluate(() => {
    const section = document.querySelector('[data-testid="home-search"]');
    const input = section?.querySelector("input");
    const form = section?.querySelector("form");
    if (!section || !input || !form) return null;
    const style = getComputedStyle(input);
    return {
      inputType: input.getAttribute("type"),
      buttons: form.querySelectorAll("button").length,
      borderWidth: style.borderTopWidth,
      borderColor: style.borderTopColor,
      background: style.backgroundColor,
    };
  });
  check("V8 standalone search present above Featured", Boolean(search), JSON.stringify(search));
  check("V8b border-only input, no CTA button", search && Number.parseFloat(search.borderWidth) > 0 && search.buttons === 0, JSON.stringify(search));
  check("V8c input background transparent (border-only)", search && search.background === "rgba(0, 0, 0, 0)", search?.background);

  // ---------- V9 Enter redirects to the search results page ----------
  await page.click('[data-testid="home-search"] input');
  await page.type('[data-testid="home-search"] input', "hcm");
  await page.keyboard.press("Enter");
  const navigated = await page
    .waitForFunction(() => location.pathname === "/vi/search", { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  check("V9 Enter redirects to the search results page", navigated, page.url());
  check("V9b query carried into ?q=", decodeURIComponent(page.url()).includes("q=hcm"), page.url());

  // ---------- V10 scroll-down affordance advances the fold ----------
  await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.click('[data-testid="hero-scroll-down"]');
  await sleep(900);
  const scrolled = await page.evaluate(() => window.scrollY);
  check("V10 scroll-down arrow advances past the hero", scrolled > 100, `scrollY=${scrolled}`);

  // ---------- V12 giant wordmark: condensed display, fluid, unclipped ----------
  const widths = [320, 375, 768, 1280, 1920, 2560];
  for (const width of widths) {
    await page.setViewport({ width, height: 900 });
    await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);
    const m = await page.evaluate(() => {
      const h1 = document.querySelector('[data-testid="hero-display"]');
      if (!h1) return null;
      const cs = getComputedStyle(h1);
      const range = document.createRange();
      range.selectNodeContents(h1);
      const text = range.getBoundingClientRect();
      const lineRects = range.getClientRects().length;
      const fs = parseFloat(cs.fontSize);
      return {
        text: h1.textContent.trim(),
        fontSize: fs,
        fontFamily: cs.fontFamily,
        fontWeight: Number(cs.fontWeight),
        letterSpacingEm: parseFloat(cs.letterSpacing) / fs,
        textTransform: cs.textTransform,
        whiteSpace: cs.whiteSpace,
        textLeft: text.left,
        textRight: text.right,
        textWidth: text.width,
        lineRects,
        fill: text.width / window.innerWidth,
        docOverflow: document.documentElement.scrollWidth - window.innerWidth,
        viewport: window.innerWidth,
      };
    });
    const expected = Math.min(Math.max(48, 0.15 * width), 320);
    check(`V12 @${width}px condensed display font (Bebas Neue, weight 400)`, m && /Bebas Neue/.test(m.fontFamily) && m.fontWeight === 400, JSON.stringify({ family: m?.fontFamily, weight: m?.fontWeight }));
    check(`V12 @${width}px fluid size ≈ clamp(3rem,15vw,20rem)`, m && Math.abs(m.fontSize - expected) <= 3, JSON.stringify({ fs: m?.fontSize, expected: +expected.toFixed(1) }));
    check(`V12 @${width}px wide tracking (0.10–0.14em) + uppercase + nowrap`, m && m.letterSpacingEm >= 0.1 && m.letterSpacingEm <= 0.14 && m.textTransform === "uppercase" && m.whiteSpace === "nowrap" && m.text === "DECODE TRAVEL", JSON.stringify({ ls: +m?.letterSpacingEm?.toFixed(3), tt: m?.textTransform, ws: m?.whiteSpace }));
    check(`V12 @${width}px single line + unclipped + edge-to-edge fill`, m && m.lineRects === 1 && m.textLeft >= -1 && m.textRight <= width + 1 && m.fill >= 0.6, JSON.stringify({ rects: m?.lineRects, left: Math.round(m?.textLeft), right: Math.round(m?.textRight), fill: +m?.fill?.toFixed(3) }));
    check(`V12 @${width}px no horizontal page overflow`, m && m.docOverflow <= 0, JSON.stringify({ overflow: m?.docOverflow }));
  }
  await page.setViewport({ width: 1280, height: 900 });

  check("V11 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
  await closeBrowser(browser);
} catch (error) {
  errors.push(`fatal: ${error.message}`);
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);
