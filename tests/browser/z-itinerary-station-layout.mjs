import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Tour detail: itinerary station + poster column regression.
 *
 * A. Stations whose CMS `details` field is blank (Sanity still stores one empty
 *    block) must render as static rows: no disclosure button, no chevron, and
 *    no empty panel.
 * B. The two-column grid must keep the poster column independent: growing the
 *    left column (simulated with a tall spacer) must not stretch the poster.
 * C. The poster is a static 2:3 frame: top flush with the text column, fixed
 *    height while the page scrolls, and `object-cover` (crop, never distort).
 *
 * The live "TRẠM" tours are the fixture for A. B/C are structural and do not
 * depend on CMS copy.
 */

const { getBrowser, getPage, closeBrowser } = await import(
  new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url).href
);

const BASE = "http://localhost:3000";
const PATH = "/vi/explore/destinations/bangkok-tam-linh";

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readLayout = (page) =>
  page.evaluate(() => {
    const article = document.querySelector("article");
    const grid = article?.parentElement ?? null;
    const poster = document.querySelector('[data-testid="tour-poster"]');
    const frame = poster?.querySelector("div") ?? null;
    const image = poster?.querySelector("img") ?? null;
    const rect = (el) => {
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return {
        top: Math.round(box.top * 100) / 100,
        left: Math.round(box.left * 100) / 100,
        width: Math.round(box.width * 100) / 100,
        height: Math.round(box.height * 100) / 100,
        bottom: Math.round(box.bottom * 100) / 100,
      };
    };
    return {
      scrollY: window.scrollY,
      gridAlignItems: grid ? getComputedStyle(grid).alignItems : null,
      article: rect(article),
      poster: rect(poster),
      frame: rect(frame),
      posterPosition: poster ? getComputedStyle(poster).position : null,
      posterAlignSelf: poster ? getComputedStyle(poster).alignSelf : null,
      imageFit: image ? getComputedStyle(image).objectFit : null,
      imageNaturalWidth: image?.naturalWidth ?? 0,
      imageNaturalHeight: image?.naturalHeight ?? 0,
    };
  });

const readRows = (page) =>
  page.evaluate(() => {
    const rows = [...document.querySelectorAll("#tour-itinerary-heading + ul > li")];
    return rows.map((row) => {
      const button = row.querySelector("button[aria-controls]");
      const panel = button
        ? document.getElementById(button.getAttribute("aria-controls") ?? "")
        : null;
      return {
        title: (row.querySelector("h3")?.textContent ?? "").trim(),
        hasButton: Boolean(button),
        hasChevron: Boolean(row.querySelector("svg")),
        panelText: (panel?.textContent ?? "").trim(),
      };
    });
  });

let browser;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1000 } });
  const page = await getPage(browser);

  await page.goto(`${BASE}${PATH}`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.waitForSelector('[data-testid="tour-poster"]', { timeout: 30000 });
  await page.waitForSelector("#tour-itinerary-heading", { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const image = document.querySelector('[data-testid="tour-poster"] img');
      return Boolean(image && image.complete && image.naturalWidth > 0);
    },
    { timeout: 30000 }
  );
  await sleep(300);

  // --- A. itinerary station rows
  const rows = await readRows(page);
  check("A0 itinerary stations rendered", rows.length > 0, `rows=${rows.length}`);
  const deadRows = rows.filter(
    (row) => (row.hasButton && row.panelText === "") || (!row.hasButton && row.hasChevron)
  );
  check(
    "A1 no station has a dead chevron / empty disclosure panel",
    deadRows.length === 0,
    JSON.stringify(deadRows)
  );
  check(
    "A2 every station has a visible title",
    rows.every((row) => row.title.length > 0),
    JSON.stringify(rows.map((row) => row.title))
  );
  const emptyStations = rows.filter((row) => !row.hasButton);
  check(
    "A3 blank stations are static (no button, no chevron)",
    emptyStations.every((row) => !row.hasChevron),
    JSON.stringify(emptyStations)
  );

  // --- B. left-column growth must not stretch the poster
  const before = await readLayout(page);
  check(
    "B0 grid uses items-start (columns decoupled)",
    before.gridAlignItems === "flex-start" || before.gridAlignItems === "start",
    `align-items=${before.gridAlignItems}`
  );
  check(
    "B1 poster top is flush with the text column top",
    Boolean(before.article && before.poster) &&
      Math.abs(before.article.top - before.poster.top) <= 1,
    JSON.stringify({ article: before.article?.top, poster: before.poster?.top })
  );
  check(
    "B2 poster opts out of stretch (align-self is not stretch)",
    before.posterAlignSelf !== "stretch",
    `align-self=${before.posterAlignSelf}`
  );

  await page.evaluate(() => {
    const article = document.querySelector("article");
    const spacer = document.createElement("div");
    spacer.dataset.testid = "layout-growth-spacer";
    spacer.style.height = "700px";
    article?.appendChild(spacer);
  });
  await sleep(300);
  const grown = await readLayout(page);
  check(
    "B3 growing the text column does not resize or move the poster",
    Boolean(before.poster && grown.poster) &&
      Math.abs(before.poster.height - grown.poster.height) <= 1 &&
      Math.abs(before.poster.top - grown.poster.top) <= 1,
    JSON.stringify({ before: before.poster, grown: grown.poster })
  );
  check(
    "B4 poster keeps its 2:3 aspect ratio after growth",
    Boolean(grown.frame) &&
      Math.abs(grown.frame.width / grown.frame.height - 2 / 3) < 0.01,
    JSON.stringify(grown.frame)
  );
  check(
    "B5 poster image crops to fill (object-cover, no distortion)",
    grown.imageFit === "cover" &&
      grown.imageNaturalWidth > 0 &&
      grown.imageNaturalHeight > 0,
    JSON.stringify({
      fit: grown.imageFit,
      natural: [grown.imageNaturalWidth, grown.imageNaturalHeight],
    })
  );

  await page.evaluate(() => {
    document.querySelector('[data-testid="layout-growth-spacer"]')?.remove();
  });
  await sleep(200);

  // --- C. static poster while scrolling
  check(
    "C0 poster is not sticky/fixed",
    before.posterPosition === "static",
    `position=${before.posterPosition}`
  );
  const scrollBefore = await readLayout(page);
  await page.evaluate(() => window.scrollTo(0, 500));
  await sleep(400);
  const scrollAfter = await readLayout(page);
  const scrollDelta = scrollAfter.scrollY - scrollBefore.scrollY;
  check(
    "C1 poster height is fixed while scrolling",
    Boolean(scrollBefore.poster && scrollAfter.poster) &&
      Math.abs(scrollBefore.poster.height - scrollAfter.poster.height) <= 1,
    JSON.stringify({ before: scrollBefore.poster, after: scrollAfter.poster })
  );
  check(
    "C2 poster follows the page (static), it does not stick or drag",
    scrollDelta > 0 &&
      Boolean(scrollBefore.poster && scrollAfter.poster) &&
      Math.abs(
        scrollBefore.poster.top - scrollAfter.poster.top - scrollDelta
      ) <= 2,
    JSON.stringify({
      delta: scrollDelta,
      beforeTop: scrollBefore.poster?.top,
      afterTop: scrollAfter.poster?.top,
    })
  );
} catch (error) {
  check("verification script completed", false, String(error?.stack ?? error));
} finally {
  if (browser) await closeBrowser(browser);
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} check(s) failed: ${errors.join(", ")}`);
  process.exit(1);
}
console.log("\nall itinerary/poster layout checks passed");
