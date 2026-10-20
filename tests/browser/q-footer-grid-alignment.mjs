import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

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

/** Shell + grid geometry: max-w-7xl, responsive px/py, flush edges, uniform gap-8. */
const measure = () => {
  const footer = document.querySelector("footer");
  const shell = footer?.querySelector(":scope > div");
  const grid = footer?.querySelector(".grid");
  if (!grid || !shell) return null;
  const blocks = [...grid.children];
  const rects = blocks.map((b) => b.getBoundingClientRect());
  const gridRect = grid.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  const shellStyle = getComputedStyle(shell);
  return {
    children: blocks.length,
    testids: blocks.map((b) => b.getAttribute("data-testid") ?? ""),
    shell: {
      left: shellRect.left,
      right: shellRect.right,
      width: shellRect.width,
      maxWidth: shellStyle.maxWidth,
      padL: parseFloat(shellStyle.paddingLeft),
      padR: parseFloat(shellStyle.paddingRight),
      padT: parseFloat(shellStyle.paddingTop),
      padB: parseFloat(shellStyle.paddingBottom),
    },
    gridLeft: gridRect.left,
    gridRight: gridRect.right,
    gridW: gridRect.width,
    childRects: rects.map((r) => ({ left: r.left, right: r.right, width: r.width, top: r.top })),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    mdMatch: matchMedia("(min-width: 768px)").matches,
    lgMatch: matchMedia("(min-width: 1024px)").matches,
  };
};

let browser = null;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // ---------- @1280 desktop (lg: 5 columns) ----------
  await go(page, "vi");
  await page.evaluate(() => document.querySelector("footer")?.scrollIntoView());
  const d = await page.evaluate(measure);

  check(
    "Q1a shell = max-w-7xl mx-auto @1280",
    d?.shell && d.shell.maxWidth === "1280px" && d.shell.width <= 1280 && d.shell.width >= 1279,
    `max=${d?.shell?.maxWidth} w=${d?.shell?.width?.toFixed(0)}`
  );
  check(
    "Q1b shell padding = lg:px-12 (48) + py-12 (48)",
    d?.shell && d.shell.padL === 48 && d.shell.padR === 48 && d.shell.padT === 48 && d.shell.padB === 48,
    `pad=${d?.shell?.padL}/${d?.shell?.padR} py=${d?.shell?.padT}/${d?.shell?.padB} lg=${d?.lgMatch}`
  );
  check(
    "Q1c grid fills shell content box",
    d && Math.abs(d.gridLeft - (d.shell.left + d.shell.padL)) <= 1 && Math.abs(d.gridRight - (d.shell.right - d.shell.padR)) <= 1,
    `grid=${d?.gridLeft?.toFixed(0)}..${d?.gridRight?.toFixed(0)} shell=${d?.shell?.left?.toFixed(0)}..${d?.shell?.right?.toFixed(0)}`
  );

  check("Q2 exactly 5 children", d?.children === 5, String(d?.children));
  const gaps = [0, 1, 2, 3].map((i) => d.childRects[i + 1].left - d.childRects[i].right);
  check("Q3 uniform gap-8 (32px)", gaps.every((g) => Math.abs(g - 32) <= 1), gaps.map((g) => g.toFixed(1)).join("/"));
  const widths = d.childRects.map((r) => r.width);
  check("Q4 five equal columns @1280", Math.max(...widths) - Math.min(...widths) <= 1, widths.map((w) => w.toFixed(1)).join("/"));
  check(
    "Q5 brand flush left, policies flush right",
    Math.abs(d.childRects[0].left - d.gridLeft) <= 1 && Math.abs(d.childRects[4].right - d.gridRight) <= 1,
    `brand=${d.childRects[0].left?.toFixed(1)} edge=${d.gridLeft?.toFixed(1)} last=${d.childRects[4].right?.toFixed(1)} edge=${d.gridRight?.toFixed(1)}`
  );
  check("Q6 brand block carries the brand testid", d?.testids?.[0] === "footer-brand", JSON.stringify(d?.testids));
  await (await page.$("footer")).screenshot({ path: `${OUT}/q-footer-01-1280.png` });

  // ---------- @800 tablet (md: 4 columns, brand spans the row) ----------
  await page.setViewport({ width: 800, height: 1024 });
  const t = await page.evaluate(measure);
  const tNavGaps = [1, 2, 3].map((i) => t.childRects[i + 1].left - t.childRects[i].right);
  check(
    "Q7a md: brand spans full width (col-span-4)",
    t.mdMatch === true && Math.abs(t.childRects[0].width - t.gridW) <= 2,
    `brand=${t.childRects[0].width?.toFixed(0)} grid=${t.gridW.toFixed(0)} md=${t.mdMatch}`
  );
  check(
    "Q7b md: 4 nav columns share the second row with gap-8 + flush right",
    tNavGaps.every((g) => Math.abs(g - 32) <= 1) && Math.abs(t.childRects[4].right - t.gridRight) <= 1,
    `gaps=${tNavGaps.map((g) => g.toFixed(1)).join("/")} last=${t.childRects[4].right?.toFixed(0)} edge=${t.gridRight.toFixed(0)}`
  );
  check("Q7c md: px-6 (24) shell padding", t.shell.padL === 24 && t.shell.padR === 24, `pad=${t.shell.padL}/${t.shell.padR}`);
  check("Q7d no overflow @800", t.overflow <= 1, `overflow=${t.overflow}`);
  await (await page.$("footer")).screenshot({ path: `${OUT}/q-footer-02-768.png` });

  // ---------- @375 mobile (2 columns) ----------
  await page.setViewport({ width: 375, height: 812 });
  const m = await page.evaluate(measure);
  check("Q8a no horizontal overflow @375", m.overflow <= 1, `overflow=${m.overflow}`);
  check(
    "Q8b brand block spans full width (col-span-2)",
    Math.abs(m.childRects[0].width - m.gridW) <= 2,
    `brand=${m.childRects[0].width?.toFixed(0)} grid=${m.gridW.toFixed(0)}`
  );
  check(
    "Q8c mobile grid = 2 equal columns",
    Math.abs(m.childRects[1].width - m.childRects[2].width) <= 1,
    `${m.childRects[1].width?.toFixed(1)} / ${m.childRects[2].width?.toFixed(1)}`
  );
  // sticky header occludes the top of the footer element-shot at 375 (footer taller than viewport)
  await page.evaluate(() => {
    const header = document.querySelector("header");
    if (header) header.style.visibility = "hidden";
  });
  await (await page.$("footer")).screenshot({ path: `${OUT}/q-footer-03-375.png` });

  check("Q9 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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
