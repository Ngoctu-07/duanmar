import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Task D — full-viewport video hero, scroll-triggered header reveal, and the
 * standalone minimalist search.
 *
 * The hero is CMS-media driven and paints no static display wordmark, so the
 * suite asserts the breakout promo film geometry (60% inside / 40% below the
 * hero) instead of hardcoded copy.
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
const near = (a, b, tol = 3) => typeof a === "number" && Math.abs(a - b) <= tol;

const headerState = (page) =>
  page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return null;
    const rect = header.getBoundingClientRect();
    const backdrop = document.querySelector('[data-testid="header-backdrop"]');
    const backdropRect = backdrop?.getBoundingClientRect();
    const nav = document.querySelector('[data-testid="header-nav"]');
    const navRect = nav?.getBoundingClientRect();
    const logo = header.querySelector('a[aria-label="DuanMar"]');
    const logoStyle = logo ? getComputedStyle(logo) : null;
    const utilities = document.querySelector('[data-testid="header-utilities"]');
    const utilitiesStyle = utilities ? getComputedStyle(utilities) : null;
    return {
      revealed: header.getAttribute("data-header-revealed"),
      home: header.getAttribute("data-header-home"),
      floating: header.getAttribute("data-header-floating"),
      // Tailwind v4 translate utilities use the `translate` property, so read
      // the visual box instead of the `transform` matrix.
      rectTop: Math.round(rect.top),
      height: Math.round(rect.height),
      headerBg: getComputedStyle(header).backgroundColor,
      headerBorder: parseFloat(getComputedStyle(header).borderBottomWidth) || 0,
      backdropTop: backdropRect ? Math.round(backdropRect.top) : null,
      backdropBottom: backdropRect ? Math.round(backdropRect.bottom) : null,
      backdropBg: backdrop ? getComputedStyle(backdrop).backgroundColor : null,
      backdropBorder: backdrop ? parseFloat(getComputedStyle(backdrop).borderBottomWidth) || 0 : null,
      navCenterX: navRect ? Math.round(navRect.left + navRect.width / 2) : null,
      logoVisible: logoStyle ? logoStyle.visibility !== "hidden" && Number(logoStyle.opacity) > 0.05 : null,
      utilitiesVisible: utilitiesStyle
        ? utilitiesStyle.visibility !== "hidden" && Number(utilitiesStyle.opacity) > 0.05
        : null,
      viewportW: window.innerWidth,
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
      h1SrOnly: Boolean(h1 && h1.className.includes("sr-only")),
      displayPresent: Boolean(display),
      textHasWordmark: (el.textContent ?? "").includes("DECODE TRAVEL"),
      hasSlogan: Boolean(el.querySelector('[data-testid="hero-slogan"]')),
      hasArrow: Boolean(el.querySelector('[data-testid="hero-scroll-down"]')),
      hasVideo: Boolean(el.querySelector('[data-testid="hero-video"]')),
    };
  });
  check("V1 hero section present", Boolean(hero), JSON.stringify(hero));
  check("V2 hero fills the viewport (height ≈ viewport)", hero && Math.abs(hero.height - hero.viewport) <= 2, JSON.stringify({ h: hero?.height, v: hero?.viewport }));
  check("V2b hero starts at the top of the page (under the transparent header)", hero && Math.abs(hero.top) <= 2, `top=${hero?.top}`);
  check("V3 no static display wordmark; only a visually hidden CMS H1 remains", hero && hero.displayPresent === false && hero.textHasWordmark === false && hero.hasH1 && hero.h1SrOnly && hero.h1Text.length > 0 && hero.hasSlogan === false, JSON.stringify({ display: hero?.displayPresent, wordmark: hero?.textHasWordmark, h1: hero?.h1Text, srOnly: hero?.h1SrOnly, slogan: hero?.hasSlogan }));
  check("V4 hero has a scroll-down affordance", hero?.hasArrow === true);
  if (hero?.hasVideo) check("V4b hero video is autoplaying, muted, looping, inline", await page.$eval('[data-testid="hero-video"]', (v) => v.autoplay && v.muted && v.loop && v.playsInline), "video attrs");

  // ---------- V5 hero state: frameless transparent overlay, centered links only ----------
  const top = await headerState(page);
  check("V5 header exists on homepage", Boolean(top), JSON.stringify(top));
  check("V5b header marked home + floating (not revealed) at scroll 0", top && top.home === "true" && top.revealed === "false" && top.floating === "true", JSON.stringify(top));
  check("V5c hero nav stays at the top edge of the page", top && Math.abs(top.rectTop) <= 2, JSON.stringify(top));
  check("V5d header is 100% transparent (no fill, no border)", top && top.headerBg === "rgba(0, 0, 0, 0)" && top.headerBorder === 0, JSON.stringify({ bg: top?.headerBg, border: top?.headerBorder }));
  check("V5e solid backdrop is parked above the viewport", top && top.backdropBottom <= 1, JSON.stringify({ top: top?.backdropTop, bottom: top?.backdropBottom }));
  check("V5f only the centered nav links are painted", top && top.logoVisible === false && top.utilitiesVisible === false && top.navCenterX !== null && Math.abs(top.navCenterX - top.viewportW / 2) <= 2, JSON.stringify({ logo: top?.logoVisible, utilities: top?.utilitiesVisible, navCenter: top?.navCenterX, viewportCenter: top && top.viewportW / 2 }));
  await page.screenshot({ path: `${OUT}/v-home-hero-top.png` });

  // ---------- V6 header reveals past 50% of the hero ----------
  await page.evaluate(() => {
    const el = document.getElementById("home-hero");
    window.scrollTo(0, Math.ceil((el ? el.offsetHeight : window.innerHeight) * 0.5) + 80);
  });
  await page
    .waitForFunction(() => document.querySelector("header")?.getAttribute("data-header-revealed") === "true", { timeout: 5000 })
    .catch(() => null);
  // The 300ms slide-in starts on the frame after the attribute flip; allow a
  // full transition window before measuring the settled position.
  await sleep(700);
  const revealed = await headerState(page);
  check("V6 header reveals after scrolling past 50% of the hero", revealed?.revealed === "true" && Math.abs(revealed.rectTop) <= 2, JSON.stringify(revealed));
  check("V6b solid navbar slid down into place (opaque, full chrome)",
    revealed && revealed.floating === "false" && revealed.backdropTop === 0 && revealed.backdropBg !== "rgba(0, 0, 0, 0)" && revealed.backdropBorder > 0 && revealed.logoVisible === true && revealed.utilitiesVisible === true,
    JSON.stringify({ floating: revealed?.floating, backdropTop: revealed?.backdropTop, backdropBg: revealed?.backdropBg, border: revealed?.backdropBorder, logo: revealed?.logoVisible, utilities: revealed?.utilitiesVisible }));
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

  // ---------- V12 centered promo film: 50vw, borderless, no wordmark ----------
  const widths = [320, 375, 768, 1280, 1920, 2560];
  for (const width of widths) {
    await page.setViewport({ width, height: 900 });
    await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);
    const m = await page.evaluate(() => {
      const hero = document.getElementById("home-hero");
      const frame = document.querySelector('[data-testid="hero-video-frame"]');
      const video = document.querySelector('[data-testid="hero-video"]');
      if (!frame || !video) return null;
      const fr = frame.getBoundingClientRect();
      const hr = hero.getBoundingClientRect();
      const wrapper = getComputedStyle(video.parentElement);
      return {
        frameWidth: fr.width,
        frameCenterX: fr.left + fr.width / 2,
        frameTop: fr.top,
        frameBottom: fr.bottom,
        frameHeight: fr.height,
        heroBottom: hr.bottom,
        overlap: (hr.bottom - fr.top) / fr.height,
        outside: (fr.bottom - hr.bottom) / fr.height,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        border: wrapper.borderTopWidth,
        radius: parseFloat(wrapper.borderTopLeftRadius),
        muted: video.muted,
        loop: video.loop,
        playsInline: video.playsInline,
        autoplay: video.autoplay,
        wordmark: Boolean(document.querySelector('[data-testid="hero-display"]')),
        textHasWordmark: (hero?.textContent ?? "").includes("DECODE TRAVEL"),
        docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    const expectedW = Math.min(width * 0.5, 768);
    check(`V12 @${width}px promo film ≈ 50vw (capped at 768px)`, m && near(m.frameWidth, expectedW), JSON.stringify({ w: m?.frameWidth, expected: expectedW }));
    check(`V12 @${width}px promo film breakout (60% inside / 40% below)`, m && near(m.frameCenterX, m.viewportW / 2) && near(m.overlap, 0.6, 0.02) && near(m.outside, 0.4, 0.02), JSON.stringify({ cx: m?.frameCenterX, overlap: m?.overlap, outside: m?.outside, frame: [m?.frameTop, m?.frameBottom], heroBottom: m?.heroBottom }));
    check(`V12 @${width}px promo film borderless + autoplay/muted/loop/inline`, m && m.border === "0px" && m.autoplay && m.muted && m.loop && m.playsInline, JSON.stringify({ border: m?.border, autoplay: m?.autoplay, muted: m?.muted, loop: m?.loop, inline: m?.playsInline }));
    check(`V12 @${width}px no static wordmark in the hero`, m && !m.wordmark && !m.textHasWordmark, JSON.stringify({ display: m?.wordmark, text: m?.textHasWordmark }));
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
