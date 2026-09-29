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

  // --- G6 desktop header
  await page.goto("http://localhost:3000/vi", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const links = await page.$$eval("header a", (els) => els.map((el) => el.getAttribute("href")));
  check("G6 no /trip-planner link in header", !links.some((h) => h && h.includes("trip-planner")), JSON.stringify(links));
  check("G6 search icon kept", Boolean(await page.$('header a[aria-label="Tìm kiếm"]')));
  check("G6 My Trips icon kept", Boolean(await page.$('header a[aria-label="Chuyến đi của tôi"]')));
  const headerText = await page.$eval("header", (el) => el.textContent);
  check("G6 no trip badge text leak", !headerText.includes("My trip"), headerText.slice(0, 120));
  check("G6 zero trip-planner anchors site-wide", !(await page.$('a[href*="trip-planner"]')));
  await (await page.$("header")).screenshot({ path: `${OUT}/g6-header-desktop.png` });

  // --- G6 mobile sheet
  await page.setViewport({ width: 390, height: 844 });
  await sleep(300);
  await page.click('button[data-slot="sheet-trigger"]');
  await sleep(600);
  const sheet = await page.$('[role="dialog"]');
  check("G6 mobile sheet opens", Boolean(sheet));
  if (sheet) {
    const sheetLinks = await sheet.evaluate((el) => [...el.querySelectorAll("a")].map((a) => a.getAttribute("href")));
    check("G6 sheet has no /trip-planner", !sheetLinks.some((h) => h && h.includes("trip-planner")), JSON.stringify(sheetLinks));
    check("G6 sheet keeps /my-trips", sheetLinks.some((h) => h && h.includes("my-trips")), JSON.stringify(sheetLinks));
    check("G6 sheet keeps /search", sheetLinks.some((h) => h && h.includes("/search")));
    await sheet.screenshot({ path: `${OUT}/g6-header-mobile-sheet.png` });
  }

  // --- G8 sitemap section
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto("http://localhost:3000/vi/sitemap", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const sitemapText = await page.$eval("body", (el) => el.textContent);
  const sitemapHtml = await page.content();
  check("G8 sitemap has no trip-planner entry", !sitemapText.includes("trip-planner") && !sitemapHtml.includes("/trip-planner"), "");
  check("G8 sitemap still lists search tool", sitemapText.includes("Tìm kiếm"));

  // --- 404 page behaviour
  await page.goto("http://localhost:3000/vi/trip-planner", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const body = await page.$eval("body", (el) => el.textContent);
  check("G4 /vi/trip-planner renders 404", (await page.$('main')) !== null && body.length > 0, `len=${body.length}`);
  check("G4 404 not a crash", !body.includes("Application error"), body.slice(0, 80));
} catch (e) {
  errors.push(`exception: ${e.message}`);
} finally {
  await closeBrowser();
}

console.log(results.join("\n"));
if (errors.length) console.log("\nERRORS:\n" + errors.join("\n"));
process.exit(errors.length ? 1 : 0);
