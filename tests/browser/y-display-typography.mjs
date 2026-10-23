import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Y — global display typography contract.
 *
 * Verifies the rendered result of the typography refactor:
 * - every primary section title uses the localized Gypsy Curse face;
 * - heading ink is white (no red font/color coupling);
 * - the featured heading size is the shared section scale (48 → 60 → 72px);
 * - tour cards and tour-detail heroes use Gypsy too;
 * - the large titles never introduce horizontal overflow at 1280 or 375.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
const isGypsy = (font) => /gypsy.?curse/i.test(font ?? "");
const isWhite = (color) => color === "rgb(255, 255, 255)";

async function readTitle(page, selector) {
  return page.$eval(selector, (el) => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      text: el.textContent.trim(),
      font: cs.fontFamily,
      size: Number.parseFloat(cs.fontSize),
      lineHeight: Number.parseFloat(cs.lineHeight),
      color: cs.color,
      width: rect.width,
      height: rect.height,
    };
  });
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

let browser = null;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  const primaryTitles = [
    { path: "/vi/tours/domestic", selector: "h1", text: "Tour trong nước" },
    { path: "/vi/tours/international", selector: "h1", text: "Tour nước ngoài" },
    { path: "/vi/deals", selector: "h1", text: "Ưu đãi & Gói tour" },
    {
      path: "/vi/support#how-to-book",
      selector: '[data-testid="how-to-book-stepper"] h2',
      text: "Hướng dẫn đặt tour",
    },
    { path: "/vi/blog", selector: "h1", text: "Câu chuyện & cảm hứng" },
    { path: "/vi/contact", selector: "h1", text: "Liên hệ với chúng tôi" },
  ];

  for (const title of primaryTitles) {
    const status = (
      await page.goto(`${BASE}${title.path}`, { waitUntil: "networkidle2", timeout: 60000 })
    )?.status();
    await dismissPromo(page);
    const rendered = await readTitle(page, title.selector);
    check(
      `Y1 ${title.text}: white Gypsy primary title at the shared 72px scale`,
      status === 200 &&
        rendered.text === title.text &&
        isGypsy(rendered.font) &&
        isWhite(rendered.color) &&
        rendered.size >= 70 &&
        rendered.size <= 74,
      JSON.stringify({ status, ...rendered })
    );
    check(
      `Y2 ${title.text}: no horizontal overflow @1280`,
      (await overflow(page)) <= 0,
      String(await overflow(page))
    );
  }

  // Homepage About section: the other "Về chúng tôi" heading. The Stories
  // section is covered by W15c, but repeat the shared-size check here.
  await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const homeSections = await page.evaluate(() => {
    const about = document.querySelector('[data-testid="about-us-section"] h2');
    const stories = document.querySelector('[data-testid="stories-section"] h2');
    const read = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        text: el.textContent.trim(),
        font: cs.fontFamily,
        size: Number.parseFloat(cs.fontSize),
        color: cs.color,
      };
    };
    return { about: read(about), stories: read(stories) };
  });
  for (const [name, data] of Object.entries(homeSections)) {
    check(
      `Y3 homepage ${name} section: white Gypsy at the shared scale`,
      data &&
        isGypsy(data.font) &&
        isWhite(data.color) &&
        data.size >= 70 &&
        data.size <= 74 &&
        data.text.length > 0,
      JSON.stringify(data)
    );
  }

  // Light informational pages that have not opted into the shared section
  // scale: color must be white, but keep their own page-title size.
  for (const title of [{ path: "/vi/about", text: "Về chúng tôi" }]) {
    await page.goto(`${BASE}${title.path}`, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);
    const rendered = await readTitle(page, "h1");
    check(
      `Y4 ${title.text}: Gypsy heading defaults to white (no red token)`,
      rendered.text === title.text &&
        isGypsy(rendered.font) &&
        isWhite(rendered.color),
      JSON.stringify(rendered)
    );
  }

  // Tour detail hero shares the same white Gypsy display scale → 72px @1280.
  const detail = await page.goto(`${BASE}/vi/explore/destinations/mat-ma-do-thi`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await dismissPromo(page);
  const detailTitle = await readTitle(page, "h1");
  check(
    "Y5 tour detail hero: white Gypsy 72px @1280",
    detail?.status() === 200 &&
      detailTitle.text === "Mật Mã Đô Thị" &&
      isGypsy(detailTitle.font) &&
      isWhite(detailTitle.color) &&
      detailTitle.size >= 70 &&
      detailTitle.size <= 74,
    JSON.stringify(detailTitle)
  );
  check(
    "Y6 tour detail hero: no horizontal overflow @1280",
    (await overflow(page)) <= 0,
    String(await overflow(page))
  );

  // Listing pages must inherit the homepage spotlight card exactly (open box,
  // 21:9 poster, large Gypsy title).
  await page.goto(`${BASE}/vi/tours/domestic`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const cardTitle = await page.$eval('[data-slot="card"] h3', (el) => {
    const cs = getComputedStyle(el);
    return {
      text: el.textContent.trim(),
      font: cs.fontFamily,
      size: Number.parseFloat(cs.fontSize),
      color: cs.color,
    };
  });
  check(
    "Y7 listing tour card titles inherit the homepage Gypsy scale",
    cardTitle.text.length > 0 &&
      isGypsy(cardTitle.font) &&
      isWhite(cardTitle.color) &&
      cardTitle.size >= 24 &&
      cardTitle.size <= 40,
    JSON.stringify(cardTitle)
  );

  // Mobile: the shared scale steps down to 48px for every page header —
  // including the tour detail title, which now shares the same token.
  await page.setViewport({ width: 375, height: 812 });
  for (const title of [
    { path: "/vi/tours/domestic", selector: "h1", text: "Tour trong nước" },
    {
      path: "/vi/support#how-to-book",
      selector: '[data-testid="how-to-book-stepper"] h2',
      text: "Hướng dẫn đặt tour",
    },
    { path: "/vi/blog", selector: "h1", text: "Câu chuyện & cảm hứng" },
    { path: "/vi/contact", selector: "h1", text: "Liên hệ với chúng tôi" },
    {
      path: "/vi/explore/destinations/mat-ma-do-thi",
      selector: "h1",
      text: "Mật Mã Đô Thị",
      size: 48,
    },
  ]) {
    await page.goto(`${BASE}${title.path}`, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);
    const rendered = await readTitle(page, title.selector);
    const expected = title.size ?? 48;
    check(
      `Y8 ${title.text}: ${expected}px white Gypsy @375`,
      rendered.text === title.text &&
        isGypsy(rendered.font) &&
        isWhite(rendered.color) &&
        rendered.size >= expected - 2 &&
        rendered.size <= expected + 2,
      JSON.stringify(rendered)
    );
    check(
      `Y9 ${title.text}: no horizontal overflow @375`,
      (await overflow(page)) <= 0,
      String(await overflow(page))
    );
  }

  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/vi/tours/domestic`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.screenshot({ path: `${OUT}/y-display-typography.png` });

  check("Y10 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
  await closeBrowser(browser);
  browser = null;
} catch (error) {
  errors.push(`fatal: ${error.message}`);
} finally {
  if (browser) await closeBrowser(browser).catch(() => {});
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);
