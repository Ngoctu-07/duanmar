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

// Container + grid geometry: max-w-7xl shell, flush outer edges, uniform gap-8,
// and footer column headings synced to the homepage "Stories & Inspiration" title.
const measure = (tagline, storyTitle) => {
  const footer = document.querySelector("footer");
  const shell = footer?.querySelector(":scope > div");
  const grid = document.querySelector("footer .grid");
  if (!grid || !shell) return null;
  const blocks = [...grid.children];
  const rects = blocks.map((b) => b.getBoundingClientRect());
  const wordmark = grid.querySelector("h3 span.font-brand") ?? grid.querySelector("span.font-brand");
  const wmStyle = wordmark ? getComputedStyle(wordmark) : null;
  const wmRect = wordmark?.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  const shellStyle = getComputedStyle(shell);
  const logoEl = grid.querySelector('img[src*="logo-duanmar"]');
  const logoR = logoEl?.getBoundingClientRect();
  const heading = blocks[1]?.querySelector("h3");
  const hStyle = heading ? getComputedStyle(heading) : null;
  const story = [...document.querySelectorAll("h2")].find(
    (h) => h.textContent.trim() === storyTitle
  );
  const sStyle = story ? getComputedStyle(story) : null;
  return {
    children: blocks.length,
    titles: blocks.map((b) => (b.querySelector("h3")?.textContent ?? "").trim()),
    shell: {
      left: shellRect.left,
      right: shellRect.right,
      width: shellRect.width,
      maxWidth: shellStyle.maxWidth,
      padL: parseFloat(shellStyle.paddingLeft),
      padR: parseFloat(shellStyle.paddingRight),
      padT: parseFloat(shellStyle.paddingTop),
      padB: parseFloat(shellStyle.paddingBottom),
      marginX: `${shellStyle.marginLeft} ${shellStyle.marginRight}`,
    },
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
    heading: hStyle
      ? { fontSize: parseFloat(hStyle.fontSize), fontWeight: Number(hStyle.fontWeight) }
      : null,
    story: sStyle
      ? { fontSize: parseFloat(sStyle.fontSize), fontWeight: Number(sStyle.fontWeight) }
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
  const d = await page.evaluate(measure, msg.vi.footer.tagline, msg.vi.blog.title);

  check(
    "Q1a shell = max-w-7xl mx-auto @1280",
    d?.shell && d.shell.maxWidth === "1280px" && d.shell.width <= 1280 && d.shell.width >= 1279,
    `max=${d?.shell?.maxWidth} w=${d?.shell?.width?.toFixed(0)} margin=${d?.shell?.marginX}`
  );
  check(
    "Q1b shell padding px-8 @lg + py-8",
    d?.shell && d.shell.padL === 32 && d.shell.padR === 32 && d.shell.padT === 32 && d.shell.padB === 32,
    `pad=${d?.shell?.padL}/${d?.shell?.padR} py=${d?.shell?.padT}/${d?.shell?.padB}`
  );
  check(
    "Q1c grid fills shell content box",
    d && Math.abs(d.gridLeft - (d.shell.left + d.shell.padL)) <= 1 && Math.abs(d.gridRight - (d.shell.right - d.shell.padR)) <= 1,
    `grid=${d?.gridLeft?.toFixed(0)}..${d?.gridRight?.toFixed(0)} shell=${d?.shell?.left?.toFixed(0)}..${d?.shell?.right?.toFixed(0)}`
  );

  check("Q2 structure: exactly 5 children", d.children === 5, String(d.children));
  check(
    "Q3 title order = brand, tours, contact, info, policies",
    JSON.stringify(d.titles) ===
      JSON.stringify(["DuanMar", msg.vi.footer.tours, msg.vi.footer.contact, msg.vi.footer.info, msg.vi.footer.policies]),
    JSON.stringify(d.titles)
  );

  check(
    "Q4 left-most column flush with left container edge",
    Math.abs(d.childRects[0].left - d.gridLeft) <= 1,
    `col=${d.childRects[0].left?.toFixed(1)} edge=${d.gridLeft?.toFixed(1)}`
  );
  check(
    "Q5 right-most column flush with right container edge",
    Math.abs(d.childRects[4].right - d.gridRight) <= 1,
    `col=${d.childRects[4].right?.toFixed(1)} edge=${d.gridRight?.toFixed(1)}`
  );

  const gaps = [0, 1, 2, 3].map((i) => d.childRects[i + 1].left - d.childRects[i].right);
  check(
    "Q6 uniform gap-8 (32px) between all columns",
    gaps.every((g) => Math.abs(g - 32) <= 1),
    gaps.map((g) => g.toFixed(1)).join("/")
  );
  const widths = d.childRects.map((r) => r.width);
  check(
    "Q7 five equal columns @1280",
    Math.max(...widths) - Math.min(...widths) <= 1,
    widths.map((w) => w.toFixed(1)).join("/")
  );

  check("Q8 logo = 72x72 +/- 2 @1280", !!d.logo && Math.abs(d.logo.width - 72) <= 2 && Math.abs(d.logo.height - 72) <= 2, `w=${d.logo?.width?.toFixed(1)} h=${d.logo?.height?.toFixed(1)}`);
  check("Q9 wordmark = 40px +/- 0.5 @1280", d.wm && d.wm.fontSize >= 39.5 && d.wm.fontSize <= 40.5, `fontSize=${d.wm?.fontSize}`);
  check(
    "Q10 wordmark fits brand column",
    d.wm && d.wm.right <= d.childRects[0].right + 1,
    `wmRight=${d.wm?.right?.toFixed(1)} colRight=${d.childRects[0].right?.toFixed(1)}`
  );
  check("Q11 logo + tagline present", !!d.logo && d.tagline, `logo=${!!d.logo} tagline=${d.tagline}`);
  check(
    "Q12 brand block left of next column",
    d.childRects[0].right <= d.childRects[1].left + 1,
    `brandRight=${d.childRects[0].right?.toFixed(0)} nextLeft=${d.childRects[1].left?.toFixed(0)}`
  );
  check(
    "Q13 column heading synced to stories title (30px/700)",
    d.heading && d.story &&
      Math.abs(d.heading.fontSize - d.story.fontSize) <= 0.5 &&
      d.heading.fontWeight === d.story.fontWeight,
    `footer=${d.heading?.fontSize}/${d.heading?.fontWeight} stories=${d.story?.fontSize}/${d.story?.fontWeight}`
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/q-footer-01-1280.png` });

  // ---------- @768 tablet (md, 2 columns) ----------
  await page.setViewport({ width: 768, height: 1024 });
  let t = await page.evaluate(measure, msg.vi.footer.tagline, msg.vi.blog.title);
  let guard = "";
  if (!t.mdMatch) {
    await page.setViewport({ width: 800, height: 1024 });
    t = await page.evaluate(measure, msg.vi.footer.tagline, msg.vi.blog.title);
    guard = " (bumped to 800)";
  }
  const tGaps = [0, 1, 2, 3].map((i) => t.childRects[i + 1].left - t.childRects[i].right);
  const tRowGaps = tGaps.filter((g) => g > 0);
  const tRight = Math.max(...t.childRects.map((r) => r.right));
  check(
    "Q14 md: 2 columns + no overflow + gap-8 between side-by-side pairs",
    t.mdMatch === true && t.overflow <= 1 && tRowGaps.length === 2 && tRowGaps.every((g) => Math.abs(g - 32) <= 1),
    `rowGaps=${tRowGaps.map((g) => g.toFixed(1)).join("/")} overflow=${t.overflow}${guard}`
  );
  check(
    "Q15 md: right-most block flush with grid right edge",
    Math.abs(tRight - t.gridRight) <= 1,
    `maxRight=${tRight?.toFixed(1)} gridRight=${t.gridRight?.toFixed(1)}`
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/q-footer-02-768.png` });

  // ---------- @375 mobile (1 column) ----------
  await page.setViewport({ width: 375, height: 812 });
  const m = await page.evaluate(measure, msg.vi.footer.tagline, msg.vi.blog.title);
  check("Q16 logo = 72x72 +/- 2 @375", !!m?.logo && Math.abs(m.logo.width - 72) <= 2 && Math.abs(m.logo.height - 72) <= 2, `w=${m?.logo?.width?.toFixed(1)} h=${m?.logo?.height?.toFixed(1)}`);
  check("Q17 no horizontal overflow @375", m.overflow <= 1, `overflow=${m.overflow} vw=${m.innerWidth}`);
  check(
    "Q18 brand block spans full width (grid-cols-1)",
    Math.abs(m.childRects[0].width - m.gridW) <= 2,
    `brand=${m.childRects[0].width?.toFixed(0)} grid=${m.gridW.toFixed(0)}`
  );
  check(
    "Q19 logo fits brand block @375",
    !!m.logo && m.logo.right <= m.childRects[0].right + 1,
    `logoRight=${m.logo?.right?.toFixed(0)} colRight=${m.childRects[0].right?.toFixed(0)}`
  );
  // sticky header occludes the top of the footer element-shot at 375 (footer taller than viewport)
  await page.evaluate(() => {
    const header = document.querySelector("header");
    if (header) header.style.visibility = "hidden";
  });
  await (await page.$("footer")).screenshot({ path: `${OUT}/q-footer-03-375.png` });

  check("Q20 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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
