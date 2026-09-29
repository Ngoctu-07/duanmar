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

// Asymmetric-layout geometry: logo box, X/2X gaps, right-flush margin, brand block.
const measure = (tagline) => {
  const grid = document.querySelector("footer .grid");
  if (!grid) return null;
  const blocks = [...grid.children];
  const rects = blocks.map((b) => b.getBoundingClientRect());
  const wordmark = grid.querySelector("h3 span.font-brand") ?? grid.querySelector("span.font-brand");
  const wmStyle = wordmark ? getComputedStyle(wordmark) : null;
  const wmRect = wordmark?.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const logoEl = grid.querySelector('img[src*="logo-duanmar"]');
  const logoR = logoEl?.getBoundingClientRect();
  return {
    children: blocks.length,
    titles: blocks.map((b) => (b.querySelector("h3")?.textContent ?? "").trim()),
    gridLeft: gridRect.left,
    gridW: gridRect.width,
    gridRight: gridRect.right,
    childRects: rects.map((r) => ({ left: r.left, right: r.right, width: r.width })),
    wm: wmStyle
      ? {
          fontSize: parseFloat(wmStyle.fontSize),
          width: wmRect.width,
          right: wmRect.right,
        }
      : null,
    logo: logoR ? { width: logoR.width, height: logoR.height, right: logoR.right } : null,
    tagline: (grid.textContent ?? "").includes(tagline),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    mdMatch: matchMedia("(min-width: 768px)").matches,
    innerWidth: window.innerWidth,
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

  check(
    "Q1a logo = 88x88 +/- 2 @1280",
    !!d?.logo && Math.abs(d.logo.width - 88) <= 2 && Math.abs(d.logo.height - 88) <= 2,
    `w=${d?.logo?.width?.toFixed(1)} h=${d?.logo?.height?.toFixed(1)}`
  );

  const brandGap = d.childRects[1].left - d.childRects[0].right;
  const gap1 = d.childRects[2].left - d.childRects[1].right;
  const gap2 = d.childRects[3].left - d.childRects[2].right;

  check("Q2 brand->nav1 gap = 48px (2X) +/- 2 @1280", Math.abs(brandGap - 48) <= 2, `gap=${brandGap.toFixed(1)}`);
  check("Q3 nav1->nav2 gap = 24px (X) +/- 2 @1280", Math.abs(gap1 - 24) <= 2, `gap=${gap1.toFixed(1)}`);
  check("Q4 nav2->nav3 gap = 24px (X) +/- 2 @1280", Math.abs(gap2 - 24) <= 2, `gap=${gap2.toFixed(1)}`);
  const ratio = navGap => brandGap / navGap;
  check(
    "Q5 asymmetry ratio brandGap/navGap in [1.9, 2.1] @1280",
    ratio(gap1) >= 1.9 && ratio(gap1) <= 2.1 && ratio(gap2) >= 1.9 && ratio(gap2) <= 2.1,
    `ratio1=${ratio(gap1).toFixed(2)} ratio2=${ratio(gap2).toFixed(2)}`
  );

  const clusterCenter = (d.childRects[1].left + d.childRects[3].right) / 2;
  const gridCenter = d.gridLeft + d.gridW / 2;
  check(
    "Q6 cluster center >= 50px right of grid center @1280",
    clusterCenter - gridCenter >= 50,
    `delta=${(clusterCenter - gridCenter).toFixed(0)}`
  );
  const rightMargin = d.gridRight - d.childRects[3].right;
  check("Q7 right margin (flush-avoidance) >= 60px @1280", rightMargin >= 60, `margin=${rightMargin.toFixed(0)}`);

  check("Q8a structure: exactly 4 children", d.children === 4, String(d.children));
  check(
    "Q8b title order unchanged",
    JSON.stringify(d.titles) === JSON.stringify(["DuanMar", msg.vi.footer.tours, msg.vi.footer.contact, msg.vi.footer.info]),
    JSON.stringify(d.titles)
  );
  check("Q9 wordmark = 48px +/- 0.5 @1280", d.wm && d.wm.fontSize >= 47.5 && d.wm.fontSize <= 48.5, `fontSize=${d.wm?.fontSize}`);
  check(
    "Q10 wordmark fits brand column",
    d.wm && d.wm.right <= d.childRects[0].right + 1,
    `wmRight=${d.wm?.right?.toFixed(1)} colRight=${d.childRects[0].right?.toFixed(1)}`
  );
  check("Q11 logo + tagline present", !!d.logo && d.tagline, `logo=${!!d.logo} tagline=${d.tagline}`);
  check(
    "Q17 brand block left of nav cluster",
    d.childRects[0].right <= d.childRects[1].left + 1,
    `brandRight=${d.childRects[0].right?.toFixed(0)} navLeft=${d.childRects[1].left?.toFixed(0)}`
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/q-footer-01-1280.png` });

  // ---------- @768 tablet (md) ----------
  await page.setViewport({ width: 768, height: 1024 });
  let t = await page.evaluate(measure, msg.vi.footer.tagline);
  let guard = "";
  if (!t.mdMatch) {
    await page.setViewport({ width: 800, height: 1024 });
    t = await page.evaluate(measure, msg.vi.footer.tagline);
    guard = " (bumped to 800)";
  }
  const tBrandGap = t.childRects[1].left - t.childRects[0].right;
  const tGaps = [1, 2].map(i => t.childRects[i + 1].left - t.childRects[i].right);
  check(
    "Q12 md: brand gap 48 +/- 2 + nav gaps <= 25 @768",
    t.mdMatch === true && Math.abs(tBrandGap - 48) <= 2 && tGaps.every(g => g <= 25) && t.overflow <= 1,
    `brand=${tBrandGap.toFixed(1)} nav=${tGaps.map(g => g.toFixed(1)).join("/")} overflow=${t.overflow}${guard}`
  );
  check(
    "Q13 right margin >= 60px @768",
    t.gridRight - t.childRects[3].right >= 60,
    `margin=${(t.gridRight - t.childRects[3].right).toFixed(0)}`
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/q-footer-02-768.png` });

  // ---------- @375 mobile ----------
  await page.setViewport({ width: 375, height: 812 });
  const m = await page.evaluate(measure, msg.vi.footer.tagline);
  check(
    "Q1b logo = 88x88 +/- 2 @375",
    !!m?.logo && Math.abs(m.logo.width - 88) <= 2 && Math.abs(m.logo.height - 88) <= 2,
    `w=${m?.logo?.width?.toFixed(1)} h=${m?.logo?.height?.toFixed(1)}`
  );
  check("Q14 no horizontal overflow @375", m.overflow <= 1, `overflow=${m.overflow} vw=${m.innerWidth}`);
  check(
    "Q15 brand block spans full width (col-span-2 intact)",
    Math.abs(m.childRects[0].width - m.gridW) <= 2,
    `brand=${m.childRects[0].width?.toFixed(0)} grid=${m.gridW.toFixed(0)}`
  );
  check(
    "Q16 logo fits brand block @375",
    !!m.logo && m.logo.right <= m.childRects[0].right + 1,
    `logoRight=${m.logo?.right?.toFixed(0)} colRight=${m.childRects[0].right?.toFixed(0)}`
  );
  // sticky header occludes the top of the footer element-shot at 375 (footer taller than viewport)
  await page.evaluate(() => {
    const header = document.querySelector("header");
    if (header) header.style.visibility = "hidden";
  });
  await (await page.$("footer")).screenshot({ path: `${OUT}/q-footer-03-375.png` });

  check("Q18 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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
