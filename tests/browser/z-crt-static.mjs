import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const BASE = "http://localhost:3000";
const results = [];
const errors = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let browser;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (error) => pageErrors.push(error.message));

  // Record every burst with its declared duration before the app boots.
  await page.evaluateOnNewDocument(() => {
    window.__crtBursts = [];
    const watch = () => {
      const el = document.querySelector('[data-testid="crt-static"]');
      if (!el) {
        setTimeout(watch, 20);
        return;
      }
      window.__crtEl = el;
      const record = () => {
        if (el.dataset.active !== "true") return;
        const style = getComputedStyle(el);
        window.__crtBursts.push({
          at: Math.round(performance.now()),
          declared: Number(el.dataset.duration || 0),
          cssMs: Number.parseFloat(style.animationDuration || "0") * 1000,
        });
      };
      new MutationObserver(record).observe(el, {
        attributes: true,
        attributeFilter: ["data-active"],
      });
      record();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", watch);
    } else {
      watch();
    }
  });

  const bursts = () =>
    page.evaluate(() => ({
      list: window.__crtBursts ?? [],
      active: document.querySelector('[data-testid="crt-static"]')?.dataset.active ?? null,
      splashKey: window.sessionStorage.getItem("duanmar:crt-splash-played"),
    }));

  // --- G1: first landing splash (500ms, once per session)
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await sleep(1200);
  const landing = await bursts();
  const splash = landing.list[0] ?? null;
  check(
    "G1 first landing plays the 500ms static splash",
    landing.list.length === 1 && splash?.declared === 500,
    JSON.stringify(landing.list)
  );
  check(
    "G2 splash CSS animation matches the 500ms contract",
    splash !== null && Math.round(splash.cssMs) === 500,
    `cssMs=${splash?.cssMs}`
  );
  check(
    "G3 splash marks the session and releases the overlay",
    landing.splashKey === "1" && landing.active === "false",
    JSON.stringify({ key: landing.splashKey, active: landing.active })
  );

  // --- G4: normal navigation is silent
  await page.evaluate(() => {
    window.__crtBursts = [];
  });
  await page.evaluate(() => {
    const links = [...document.querySelectorAll('header a[href="/en/deals"]')];
    const link = links.find((el) => el.getBoundingClientRect().width > 0);
    link?.click();
  });
  await page.waitForFunction(() => location.pathname === "/en/deals", { timeout: 20000 });
  await sleep(700);
  const nav = await bursts();
  check(
    "G4 standard navigation fires no static burst",
    nav.list.length === 0 && nav.active === "false",
    JSON.stringify(nav.list)
  );

  // --- G5: the BOOK TOUR CTA still bursts (300ms)
  await page.goto(`${BASE}/en/tours`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  const destinationHref = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/explore/destinations/"]');
    return link ? link.getAttribute("href") : null;
  });
  check("G5 tour listing exposes a destination link", Boolean(destinationHref), String(destinationHref));
  if (destinationHref) {
    await page.goto(`${BASE}${destinationHref}`, { waitUntil: "networkidle2", timeout: 90000 });
    await dismissPromo(page);
    await page.evaluate(() => {
      window.__crtBursts = [];
    });
    await page.click('a[href*="/booking/checkout"]');
    await sleep(450);
    const cta = await bursts();
    check(
      "G6 BOOK TOUR fires a 300ms burst",
      cta.list.length === 1 && cta.list[0]?.declared === 300,
      JSON.stringify(cta.list)
    );
    check(
      "G7 CTA burst uses the 300ms CSS animation",
      cta.list[0] !== undefined && Math.round(cta.list[0].cssMs) === 300,
      `cssMs=${cta.list[0]?.cssMs}`
    );
  }

  // --- G8: reduced motion disables the effect entirely
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.evaluate(() => {
    window.__crtBursts = [];
  });
  await page.goto(`${BASE}/en/tours`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.evaluate(() => {
    window.__crtBursts = [];
  });
  const reducedTarget = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/explore/destinations/"]');
    return link ? link.getAttribute("href") : null;
  });
  if (reducedTarget) {
    await page.goto(`${BASE}${reducedTarget}`, { waitUntil: "networkidle2", timeout: 90000 });
    await dismissPromo(page);
    await page.evaluate(() => {
      window.__crtBursts = [];
    });
    await page.click('a[href*="/booking/checkout"]');
    await sleep(400);
  }
  const reduced = await bursts();
  check(
    "G8 reduced motion keeps the overlay hidden on CTAs",
    reduced.list.length === 0 && reduced.active === "false",
    JSON.stringify(reduced.list)
  );

  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.screenshot({ path: `${OUT}/z-crt-static.png` });
  check("G9 zero pageerrors", pageErrors.length === 0, pageErrors.join(" | "));
} catch (error) {
  check("verification script completed", false, String(error?.stack ?? error));
} finally {
  if (browser) await closeBrowser();
}

console.log(results.join("\n"));
const failed = results.filter((line) => line.startsWith("FAIL"));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
