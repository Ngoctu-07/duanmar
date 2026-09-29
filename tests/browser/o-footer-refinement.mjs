import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const msg = {
  vi: JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")),
};

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const go = async (page, locale) => {
  await page.setCookie({ name: "NEXT_LOCALE", value: locale, url: "http://localhost:3000" });
  await page.goto(`http://localhost:3000/${locale}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
};

// geometry of the footer grid: wordmark type + nav-cluster compactness
const measure = (tagline) => {
  const grid = document.querySelector("footer .grid");
  if (!grid) return null;
  const blocks = [...grid.children];
  const rects = blocks.map((b) => b.getBoundingClientRect());
  const wordmark = grid.querySelector("h3 span.font-brand") ?? grid.querySelector("span.font-brand");
  const headerWordmark = document.querySelector("header span.font-brand:not([aria-hidden])");
  const wmStyle = wordmark ? getComputedStyle(wordmark) : null;
  const wmRect = wordmark?.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  return {
    children: blocks.length,
    titles: blocks.map((b) => (b.querySelector("h3")?.textContent ?? "").trim()),
    gridW: gridRect.width,
    gridRight: gridRect.right,
    childRects: rects.map((r) => ({ left: r.left, right: r.right, width: r.width })),
    wm: wmStyle
      ? {
          fontSize: parseFloat(wmStyle.fontSize),
          letterSpacing: parseFloat(wmStyle.letterSpacing),
          lineHeight: parseFloat(wmStyle.lineHeight),
          fontWeight: Number(wmStyle.fontWeight),
          width: wmRect.width,
          right: wmRect.right,
        }
      : null,
    headerFontSize: headerWordmark ? parseFloat(getComputedStyle(headerWordmark).fontSize) : 0,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    mdMatch: matchMedia("(min-width: 768px)").matches,
    innerWidth: window.innerWidth,
    logo: grid.querySelector('img[src*="logo-duanmar"]') !== null,
    tagline: (grid.textContent ?? "").includes(tagline),
  };
};

let browser = null;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // ---------- @1280 desktop ----------
  await go(page, "vi");
  await page.evaluate(() => document.querySelector("footer")?.scrollIntoView());
  const d = await page.evaluate(measure, msg.vi.footer.tagline);
  check("O1a footer .grid has exactly 4 children", d?.children === 4, String(d?.children));
  check(
    "O1b title order unchanged",
    JSON.stringify(d?.titles) === JSON.stringify(["DuanMar", msg.vi.footer.tours, msg.vi.footer.contact, msg.vi.footer.info]),
    JSON.stringify(d?.titles)
  );

  check(
    "O2a wordmark = text-5xl 48px (300%) @1280",
    d?.wm && d.wm.fontSize >= 47.5 && d.wm.fontSize <= 48.5,
    `fontSize=${d?.wm?.fontSize}`
  );
  check("O2b footer wordmark >= header wordmark", d?.wm && d.wm.fontSize >= d.headerFontSize, `footer=${d?.wm?.fontSize} header=${d?.headerFontSize}`);

  check("O3a letter-spacing negative", d?.wm && d.wm.letterSpacing < 0, `letterSpacing=${d?.wm?.letterSpacing}`);
  check(
    "O3b line-height <= 1.15x font-size",
    d?.wm && d.wm.lineHeight <= d.wm.fontSize * 1.15,
    `lh=${d?.wm?.lineHeight} fs=${d?.wm?.fontSize}`
  );
  check("O3c font-weight >= 600", d?.wm && d.wm.fontWeight >= 600, `weight=${d?.wm?.fontWeight}`);

  check("O4a wordmark wider than 150px", d?.wm && d.wm.width > 150, `width=${d?.wm?.width?.toFixed(1)}`);
  check(
    "O4b wordmark fits its column (no spill)",
    d?.wm && d.wm.right <= d.childRects[0].right + 1 && d.wm.right <= d.gridRight + 1,
    `wmRight=${d?.wm?.right?.toFixed(1)} colRight=${d?.childRects[0].right?.toFixed(1)} gridRight=${d?.gridRight?.toFixed(1)}`
  );

  const gaps1280 = [1, 2].map((i) => d.childRects[i + 1].left - d.childRects[i].right);
  check("O5a nav gaps <= 25px @1280", gaps1280.every((g) => g <= 25), gaps1280.map((g) => g.toFixed(1)).join("/"));
  const cluster1280 = d.childRects[3].right - d.childRects[1].left;
  check(
    "O5b nav cluster <= 65% of grid width @1280",
    cluster1280 <= d.gridW * 0.65,
    `cluster=${cluster1280.toFixed(0)} grid=${d.gridW.toFixed(0)} ratio=${((cluster1280 / d.gridW) * 100).toFixed(0)}%`
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/o-footer-01-1280.png` });

  // ---------- @768 tablet (md) ----------
  await page.setViewport({ width: 768, height: 1024 });
  let t = await page.evaluate(measure, msg.vi.footer.tagline);
  let guard = "";
  if (!t.mdMatch) {
    // classic scrollbar can push clientWidth under 768 → bump viewport so md: applies
    await page.setViewport({ width: 800, height: 1024 });
    t = await page.evaluate(measure, msg.vi.footer.tagline);
    guard = " (bumped to 800)";
  }
  const gaps768 = [1, 2].map((i) => t.childRects[i + 1].left - t.childRects[i].right);
  check(
    "O6a md: matched + nav gaps <= 25px @768",
    t.mdMatch === true && gaps768.every((g) => g <= 25),
    `${gaps768.map((g) => g.toFixed(1)).join("/")} md=${t.mdMatch}${guard}`
  );
  check(
    "O6b tablet no overflow + brand left of cluster",
    t.overflow <= 1 && t.childRects[0].right <= t.childRects[1].left + 1,
    `overflow=${t.overflow} brandRight=${t.childRects[0].right?.toFixed(0)} navLeft=${t.childRects[1].left?.toFixed(0)} vw=${t.innerWidth}`
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/o-footer-02-768.png` });

  // ---------- @375 mobile ----------
  await page.setViewport({ width: 375, height: 812 });
  const m = await page.evaluate(measure, msg.vi.footer.tagline);
  check("O7a no horizontal overflow @375", m.overflow <= 1, `overflow=${m.overflow} vw=${m.innerWidth}`);
  check(
    "O7b brand block spans full width (col-span-2 intact)",
    Math.abs(m.childRects[0].width - m.gridW) <= 2,
    `brand=${m.childRects[0].width?.toFixed(0)} grid=${m.gridW.toFixed(0)}`
  );
  check(
    "O7c mobile wordmark = text-4xl 36px (225%)",
    m.wm && m.wm.fontSize >= 35.5 && m.wm.fontSize <= 36.5,
    `fontSize=${m?.wm?.fontSize}`
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/o-footer-03-375.png` });

  // ---------- brand + bottom bar regression ----------
  check("O8a logo + tagline still present", d.logo && d.tagline, `logo=${d.logo} tagline=${d.tagline}`);
  const bottomHrefs = await page.$$eval("footer .mt-8 a", (as) => as.map((a) => a.getAttribute("href")));
  check(
    "O8b bottom bar intact",
    ["/vi/support", "/vi/privacy", "/vi/accessibility", "/vi/sitemap"].every((h) => bottomHrefs.includes(h)),
    JSON.stringify(bottomHrefs)
  );

  check("O10 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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
