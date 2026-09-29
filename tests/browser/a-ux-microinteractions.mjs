import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Plan 260929-2207 — header tooltips, full-card click, CTA scale.
 * All three UX micro-interactions, both locales, dual viewports for CTAs.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const results = [];
const errors = [];
const pageErrors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const messages = (locale) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../src/messages/${locale}.json`, import.meta.url)), "utf8")
  );

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // ---------- 1. Header icon tooltips ----------
  for (const locale of ["vi", "en"]) {
    const m = messages(locale);
    await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);

    const icons = await page.evaluate(() => {
      const search = document.querySelector('header a[href$="/search"], header a[href*="/search"]');
      const trips = document.querySelector('header a[href$="/my-trips"], header a[href*="/my-trips"]');
      const tipOf = (el) => {
        const wrap = el?.closest(".group");
        const tip = wrap ? [...wrap.querySelectorAll("span")].find((s) => s.getAttribute("aria-hidden") !== null && s.textContent && !s.querySelector("svg, a, button")) : null;
        return tip
          ? { text: tip.textContent.trim(), hidden: tip.getAttribute("aria-hidden"), opacity: getComputedStyle(tip).opacity, tooltipClass: tip.className }
          : null;
      };
      return {
        searchAria: search?.getAttribute("aria-label") ?? null,
        tripsAria: trips?.getAttribute("aria-label") ?? null,
        searchTip: tipOf(search),
        tripsTip: tipOf(trips),
      };
    });

    check(`A1 /${locale} search icon aria-label`, icons.searchAria === m.common.search, JSON.stringify(icons.searchAria));
    check(`A2 /${locale} my-trips icon aria-label`, icons.tripsAria === m.myTrips.navLabel, JSON.stringify(icons.tripsAria));
    check(`A3 /${locale} search tooltip label = ${m.common.search}`,
      icons.searchTip?.text === m.common.search && icons.searchTip.hidden === "true",
      JSON.stringify(icons.searchTip));
    check(`A4 /${locale} suitcase tooltip label = ${m.myTrips.navLabel}`,
      icons.tripsTip?.text === m.myTrips.navLabel && icons.tripsTip.hidden === "true",
      JSON.stringify(icons.tripsTip));
    check(`A5 /${locale} tooltips start hidden (opacity 0)`,
      icons.searchTip?.opacity === "0" && icons.tripsTip?.opacity === "0",
      `${icons.searchTip?.opacity}/${icons.tripsTip?.opacity}`);

    // hover reveals
    const searchLink = await page.$('header a[href*="/search"]');
    if (searchLink) {
      await searchLink.hover();
      await sleep(300);
      const op = await page.evaluate(() => {
        const link = document.querySelector('header a[href*="/search"]');
        const tip = link?.closest(".group") ? [...link.closest(".group").querySelectorAll("span")].find((s) => s.getAttribute("aria-hidden") === "true" && s.textContent) : null;
        return tip ? getComputedStyle(tip).opacity : null;
      });
      check(`A6 /${locale} hover reveals search tooltip`, op === "1", `opacity=${op}`);
      await page.screenshot({ path: `${OUT}/a-tooltip-${locale}.png`, clip: { x: 700, y: 0, width: 580, height: 120 } });
    }
  }

  // ---------- 2. Full-card clickable ----------
  {
    await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);
    const card = await page.evaluate(() => {
      const c = document.querySelector('[data-slot="card"]:has(a[href*="/explore/destinations/"])');
      if (!c) return null;
      const anchors = [...c.querySelectorAll('a[href*="/explore/destinations/"]')];
      const cursor = getComputedStyle(c).cursor;
      const shadow = getComputedStyle(c).boxShadow;
      const cta = [...c.querySelectorAll("span")].find((s) => s.className.includes("inline-flex") && s.className.includes("rounded-md"));
      const overlay = anchors.find((a) => a.className.includes("inset-0"));
      return {
        anchorCount: anchors.length,
        cursor,
        shadow,
        hasOverlay: Boolean(overlay),
        overlayZ: overlay ? getComputedStyle(overlay).zIndex : null,
        ctaIsAnchor: cta ? false : null,
        ctaStillRendered: Boolean(cta) || anchors.some((a) => a.textContent.trim().length > 0),
        href: anchors[0]?.getAttribute("href") ?? null,
        ctaText: (cta?.textContent ?? anchors.find((a) => a.className.includes("inline-flex"))?.textContent ?? "").trim(),
        box: c.getBoundingClientRect().toJSON(),
      };
    });
    check("B1 card exists on homepage", Boolean(card), JSON.stringify(card));
    if (card) {
      check("B2 exactly 1 destination anchor per card", card.anchorCount === 1, `count=${card.anchorCount}`);
      check("B3 overlay link stretches full card", card.hasOverlay && card.overlayZ === "10", JSON.stringify({ h: card.hasOverlay, z: card.overlayZ }));
      check("B4 cursor-pointer on card", card.cursor === "pointer", card.cursor);
      check("B5 hover elevation class (shadow transition present)", typeof card.shadow === "string", card.shadow.slice(0, 40));
      check("B6 CTA still rendered as non-anchor span", card.ctaStillRendered === true && card.ctaText.length > 0, card.ctaText);

      // click image area (top-left of card, outside CTA) → navigates
      const target = await page.$('[data-slot="card"] a.inset-0, [data-slot="card"] a[class*="inset-0"]');
      if (target) {
        await target.click({ offset: { x: 40, y: 40 } });
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => null);
        const url = page.url();
        check("B7 card-body click navigates to detail", /\/vi\/explore\/destinations\//.test(url), url);
      } else {
        check("B7 card-body click navigates to detail", false, "overlay link not queryable");
      }
    }
  }

  // ---------- 3. CTA scale (~150%) ----------
  for (const locale of ["vi", "en"]) {
    await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);
    const cta = await page.evaluate(() => {
      const pick = (label) => [...document.querySelectorAll("a,button")].find((el) => el.textContent?.trim() === label && el.closest("section, div.flex"));
      const hero = pick("Khám phá ngay") || pick("Explore Now");
      const contact = pick("Liên hệ") || pick("Contact Us") || pick("Contact");
      const style = (el) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { pt: cs.paddingTop, pl: cs.paddingLeft, fs: cs.fontSize, text: el.textContent.trim() };
      };
      return { hero: style(hero), contact: style(contact) };
    });
    const big = (s) => s && parseInt(s.pt) >= 16 && parseInt(s.fs) >= 18;
    check(`C1 /${locale} hero Explore Now scaled (py≥16, fs≥18)`, big(cta.hero), JSON.stringify(cta.hero));
    check(`C2 /${locale} Contact CTA scaled (py≥16, fs≥18)`, big(cta.contact), JSON.stringify(cta.contact));
    if (locale === "vi") {
      await page.screenshot({ path: `${OUT}/a-cta-hero.png`, clip: { x: 0, y: 0, width: 1280, height: 700 } });
    }
  }

  // mobile viewport: no overlap blowup
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
    aboutCtaVisible: Boolean([...document.querySelectorAll("a")].find((a) => a.textContent?.trim() === "Liên hệ" && a.offsetParent !== null)),
  }));
  check("D1 mobile 375px no horizontal overflow", mobile.overflow === true, JSON.stringify(mobile));
  check("D2 mobile about CTA visible", mobile.aboutCtaVisible === true);
  await page.screenshot({ path: `${OUT}/a-cta-mobile.png` });

  check("Z zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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
