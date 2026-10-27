import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
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

let browser;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${BASE}/vi/deals`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);

  const layout = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("article")];
    const pick = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        text: el.textContent?.trim() ?? "",
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        letterSpacing: s.letterSpacing,
        textTransform: s.textTransform,
        bg: s.backgroundColor,
        box: { x: box.x, y: box.y, w: box.width, h: box.height, bottom: box.bottom },
      };
    };
    const first = cards[0];
    const cta = first?.querySelector("a");
    const cardBox = first?.getBoundingClientRect();
    const ctaBox = cta?.getBoundingClientRect();
    // The description now lives in its own wrapper, so `p:last-of-type` would
    // match the nested description instead of the expiry line. Take the last
    // paragraph in document order (description → expiry).
    const paragraphs = first ? [...first.querySelectorAll("p")] : [];
    return {
      count: cards.length,
      cardBg: first ? getComputedStyle(first).backgroundColor : null,
      radius: first ? getComputedStyle(first).borderTopLeftRadius : null,
      hasImage: Boolean(first?.querySelector("img")),
      coverSource: first?.querySelector('[data-testid="deal-cover"]')?.getAttribute("data-cover-source") ?? null,
      coverFirst: first ? first.firstElementChild?.getAttribute("data-testid") === "deal-cover" : false,
      title: first?.querySelector("h2")?.textContent?.trim() ?? null,
      description:
        first?.querySelector('[data-testid="deal-description"]')?.textContent?.trim() ?? null,
      expiry: paragraphs.at(-1)?.textContent?.trim() ?? null,
      cta: pick(cta),
      href: cta?.getAttribute("href") ?? null,
      cardBox: cardBox
        ? { x: cardBox.x, y: cardBox.y, w: cardBox.width, bottom: cardBox.bottom }
        : null,
      ctaBox: ctaBox
        ? { x: ctaBox.x, y: ctaBox.y, w: ctaBox.width, bottom: ctaBox.bottom }
        : null,
      columns: cards.slice(0, 6).map((card) => Math.round(card.getBoundingClientRect().x)),
      rows: cards.slice(0, 6).map((card) => Math.round(card.getBoundingClientRect().y)),
      ctaCount: cards.filter((card) => card.querySelector("a")).length,
      ctaTexts: cards.slice(0, 3).map((card) => card.querySelector("a")?.textContent?.trim() ?? null),
      badgeCount: cards.filter((card) => card.querySelector("span.bg-primary")).length,
    };
  });

  check("D1 deals page renders promo cards", layout.count > 0, `count=${layout.count}`);
  check("D2 every card has a CTA link", layout.ctaCount === layout.count, `${layout.ctaCount}/${layout.count}`);
  const cardLuma = (() => {
    const [r, g, b] = (layout.cardBg ?? "rgb(0,0,0)").match(/\d+/g)?.map(Number) ?? [0, 0, 0];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  })();
  check(
    "D3 cards use the dark palette + sharp corners",
    cardLuma < 70 && layout.radius === "0px",
    `bg=${layout.cardBg} luma=${cardLuma.toFixed(1)} radius=${layout.radius}`
  );
  check(
    "D4 cover thumbnail is the first block (CMS image or dark fallback)",
    layout.coverFirst && (layout.hasImage || layout.coverSource === "fallback"),
    JSON.stringify({ coverFirst: layout.coverFirst, image: layout.hasImage, source: layout.coverSource })
  );
  check(
    "D5 body carries title, description and expiry",
    Boolean(layout.title) &&
      Boolean(layout.description) &&
      Boolean(layout.expiry) &&
      layout.expiry !== layout.description,
    JSON.stringify({ title: layout.title, description: layout.description, expiry: layout.expiry })
  );
  check(
    "D6 3-column grid at 1280px",
    layout.columns.length >= 3 &&
      layout.columns[0] < layout.columns[1] &&
      layout.columns[1] < layout.columns[2] &&
      (layout.count < 4 ||
        (layout.columns[3] === layout.columns[0] && layout.rows[3] > layout.rows[0])),
    JSON.stringify({ columns: layout.columns.slice(0, 4), rows: layout.rows.slice(0, 4) })
  );

  const cta = layout.cta;
  check("D7 CTA text is NHẬN NGAY", (layout.ctaTexts[0] ?? "").toLowerCase() === "nhận ngay", JSON.stringify(layout.ctaTexts));
  check(
    "D8 CTA is full-width and anchored to the card bottom",
    Boolean(cta && layout.cardBox) &&
      Math.abs(cta.box.w - (layout.cardBox.w - 48)) <= 2 &&
      Math.abs(layout.cardBox.bottom - cta.box.bottom - 24) <= 2,
    JSON.stringify({ card: layout.cardBox, cta: layout.ctaBox })
  );
  const [cr, cg, cb] = (cta?.bg ?? "rgb(0,0,0)").match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  check(
    "D9 CTA keeps the dark-theme red primary surface",
    cr > cg && cr > cb && cr < 200,
    `bg=${cta?.bg}`
  );
  check(
    "D10 CTA is upper-case, condensed, 15px / 500 / 0.22em",
    cta?.textTransform === "uppercase" &&
      cta?.fontSize === "15px" &&
      cta?.fontWeight === "500" &&
      cta?.letterSpacing === "3.3px" &&
      /(condensed|oswald)/i.test(cta?.fontFamily ?? ""),
    JSON.stringify({ size: cta?.fontSize, weight: cta?.fontWeight, spacing: cta?.letterSpacing, family: cta?.fontFamily, transform: cta?.textTransform })
  );
  check(
    "D11 CTA targets a tour, or contact without one",
    (layout.href ?? "").includes("/explore/destinations/") || (layout.href ?? "").includes("/contact"),
    layout.href ?? "null"
  );

  // Typography parity with the homepage KHÁM PHÁ NGAY button.
  await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.evaluate(() => {
    document.querySelector('[data-testid="featured-destinations"]')?.scrollIntoView({ block: "center", behavior: "instant" });
  });
  const tourCta = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="card"] span.bg-primary');
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      text: el.textContent?.trim() ?? "",
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      letterSpacing: s.letterSpacing,
      textTransform: s.textTransform,
      bg: s.backgroundColor,
    };
  });
  check(
    "D12 deal CTA typography === homepage KHÁM PHÁ NGAY",
    Boolean(tourCta) &&
      tourCta.fontFamily === cta?.fontFamily &&
      tourCta.fontSize === cta?.fontSize &&
      tourCta.fontWeight === cta?.fontWeight &&
      tourCta.letterSpacing === cta?.letterSpacing &&
      tourCta.textTransform === cta?.textTransform,
    JSON.stringify({ tour: tourCta, deal: cta })
  );

  await page.goto(`${BASE}/vi/deals`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.screenshot({ path: `${OUT}/d-deals-grid.png`, fullPage: false });

  await page.setViewport({ width: 375, height: 812 });
  await page.reload({ waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  const mobile = await page.evaluate(() => {
    const card = document.querySelector("article");
    const cta = card?.querySelector("a");
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      ctaFull:
        Boolean(card && cta) &&
        Math.abs(cta.getBoundingClientRect().width - (card.getBoundingClientRect().width - 48)) <= 2,
    };
  });
  check(
    "D13 mobile 375px: single column, full-width CTA, no overflow",
    mobile.overflow <= 0 && mobile.ctaFull,
    JSON.stringify(mobile)
  );
  check("D14 zero pageerrors", pageErrors.length === 0, JSON.stringify(pageErrors));
} catch (error) {
  errors.push(`exception: ${error.message}`);
} finally {
  await closeBrowser();
}

for (const line of results) console.log(line);
if (errors.length) {
  console.log("\nERRORS:");
  for (const error of errors) console.log(error);
  process.exitCode = 1;
} else {
  console.log(`\nall ${results.length} checks passed`);
}
