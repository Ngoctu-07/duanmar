import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const vi = JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8"));
const LABELS = [vi.common.home, vi.common.domesticTours, vi.common.internationalTours, vi.common.deals, vi.common.blog];
const HREFS = ["/vi", "/vi/tours/domestic", "/vi/tours/international", "/vi/deals", "/vi/blog"];
const LEGACY = ["/vi/explore", "/vi/plan-your-trip", "/vi/culture", "/vi/news"];

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // --- L1 desktop: exactly 5 nav links, exact order, exact labels
  await page.goto("http://localhost:3000/vi", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const nav = await page.$$eval("header nav a", (els) =>
    els.map((a) => ({ href: a.getAttribute("href"), label: a.textContent.trim() }))
  );
  check("L1 desktop nav has exactly 5 links", nav.length === 5, JSON.stringify(nav));
  check("L1 hrefs in required order", JSON.stringify(nav.map((n) => n.href)) === JSON.stringify(HREFS), JSON.stringify(nav.map((n) => n.href)));
  check("L1 labels in required order", JSON.stringify(nav.map((n) => n.label)) === JSON.stringify(LABELS), JSON.stringify(nav.map((n) => n.label)));
  await (await page.$("header")).screenshot({ path: `${OUT}/l-navbar-01-desktop.png` });

  // --- L2 legacy purge from the header
  const allHeader = await page.$$eval("header a", (els) => els.map((a) => a.getAttribute("href")));
  check("L2 no legacy href anywhere in header", !allHeader.some((h) => LEGACY.includes(h)), JSON.stringify(allHeader));
  check("L2 nav contains none of the legacy 4", !nav.some((n) => LEGACY.includes(n.href)), JSON.stringify(nav.map((n) => n.href)));

  // --- L3 mobile sheet: same 5, same order, no legacy
  await page.setViewport({ width: 390, height: 844 });
  await sleep(300);
  await page.click('button[data-slot="sheet-trigger"]');
  await sleep(600);
  const sheet = await page.$('[role="dialog"]');
  check("L3 mobile sheet opens", Boolean(sheet));
  if (sheet) {
    const sheetLinks = await sheet.evaluate((el) => [...el.querySelectorAll("a")].map((a) => a.getAttribute("href")));
    check("L3 sheet last 5 = required order", JSON.stringify(sheetLinks.slice(-5)) === JSON.stringify(HREFS), JSON.stringify(sheetLinks));
    check("L3 sheet has no legacy href", !sheetLinks.some((h) => LEGACY.includes(h)), JSON.stringify(sheetLinks));
    await sheet.screenshot({ path: `${OUT}/l-navbar-02-sheet.png` });
  }

  // --- L4 routing: each nav node → distinct 200 page with distinct h1
  const pages = await page.evaluate(async (urls) => {
    const out = [];
    for (const url of urls) {
      const r = await fetch(url);
      const doc = new DOMParser().parseFromString(await r.text(), "text/html");
      out.push({ url, status: r.status, h1: (doc.querySelector("h1")?.textContent ?? "").trim() });
    }
    return out;
  }, HREFS);
  for (const p of pages) check(`L4 ${p.url} → 200`, p.status === 200, `status=${p.status}`);
  check("L4 all five h1 texts distinct", new Set(pages.map((p) => p.h1)).size === 5, JSON.stringify(pages.map((p) => p.h1)));
  check("L4 home h1 non-empty (CMS hero fallback)", pages[0].h1.length > 0, pages[0].h1);
  check("L4 domestic/international h1 from i18n", pages[1].h1 === vi.tours.domestic.title && pages[2].h1 === vi.tours.international.title, `${pages[1].h1} | ${pages[2].h1}`);
  check("L4 deals + blog h1 from i18n", pages[3].h1 === vi.deals.title && pages[4].h1 === vi.blog.title, `${pages[3].h1} | ${pages[4].h1}`);

  // --- L5 header chrome preserved
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto("http://localhost:3000/vi", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  check("L5 search entry kept", Boolean(await page.$('header a[aria-label="Tìm kiếm"]')));
  check("L5 my-trips entry kept", Boolean(await page.$('header a[aria-label="Chuyến đi của tôi"]')));

  // --- L6 Home self-refresh: hard reload when already on home, plain nav otherwise
  await page.evaluate(() => {
    window.__l6 = 1;
  });
  await page.click('header nav a[href="/vi"]');
  await page.waitForFunction(() => window.__l6 === undefined, { timeout: 30000 });
  const markerAfterReload = await page.evaluate(() => window.__l6);
  check("L6 home click on /vi hard-reloads (marker wiped)", markerAfterReload === undefined, String(markerAfterReload));
  check("L6 still on /vi after reload", page.url().replace(/\/$/, "").endsWith("/vi"), page.url());

  await page.goto("http://localhost:3000/vi/tours/domestic", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.evaluate(() => {
    window.__l6 = 2;
  });
  await page.click('header nav a[href="/vi"]');
  await page.waitForFunction(() => window.location.pathname === "/vi", { timeout: 30000 });
  const markerAfterNav = await page.evaluate(() => window.__l6);
  check("L6 home click away from home navigates (marker preserved)", markerAfterNav === 2, String(markerAfterNav));

  check("L5 zero pageerrors", errors.length === 0, errors.join("; "));
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
