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

/**
 * Behance-style hierarchy: tiny uppercase white column labels, white/80 text-sm
 * body links, a compact white wordmark, and a thin translucent white divider.
 */
const measure = (tagline) => {
  const paint = (...layers) => {
    const c = document.createElement("canvas"); c.width = c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    for (const color of layers) { ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); }
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  };
  const footer = document.querySelector("footer");
  const grid = footer.querySelector(".grid");
  if (!grid) return null;
  const bg = getComputedStyle(footer).backgroundColor;
  const blocks = [...grid.children];
  const rects = blocks.map((b) => b.getBoundingClientRect());
  const heading = grid.querySelector("h3");
  const link = grid.children[1]?.querySelector("a");
  const wordmark = grid.querySelector("span.font-brand");
  const bottom = footer.querySelector('[data-testid="footer-bottom"]');
  const hs = heading ? getComputedStyle(heading) : null;
  const ls = link ? getComputedStyle(link) : null;
  const ws = wordmark ? getComputedStyle(wordmark) : null;
  return {
    children: blocks.length,
    headings: [...grid.querySelectorAll("h3")].map((h) => h.textContent.trim()),
    gridW: grid.getBoundingClientRect().width,
    childRects: rects.map((r) => ({ left: r.left, right: r.right, width: r.width })),
    heading: hs
      ? {
          size: parseFloat(hs.fontSize),
          weight: Number(hs.fontWeight),
          transform: hs.textTransform,
          trackingEm: parseFloat(hs.letterSpacing) / parseFloat(hs.fontSize),
          color: paint(bg, hs.color),
        }
      : null,
    link: ls
      ? { size: parseFloat(ls.fontSize), color: paint(bg, ls.color), transition: ls.transitionDuration }
      : null,
    wordmark: ws
      ? { size: parseFloat(ws.fontSize), weight: Number(ws.fontWeight), color: paint(ws.color) }
      : null,
    bottom: bottom
      ? {
          borderWidth: getComputedStyle(bottom).borderTopWidth,
          links: [...bottom.querySelectorAll("a")].map((a) => a.getAttribute("href")),
          localeButtons: [...bottom.querySelectorAll('[role="group"] button')].map((b) => b.textContent.trim()),
        }
      : null,
    tagline: (grid.textContent ?? "").includes(tagline),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    mdMatch: matchMedia("(min-width: 768px)").matches,
    lgMatch: matchMedia("(min-width: 1024px)").matches,
  };
};

const WHITE = [255, 255, 255];
const WHITE_80 = [229, 210, 210];
const near = (rgb, expected, tol = 3) => rgb.every((v, i) => Math.abs(v - expected[i]) <= tol);

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

  check("O1a footer grid has exactly 5 children", d?.children === 5, String(d?.children));
  check(
    "O1b label order = tours, info, connect, policies",
    JSON.stringify(d?.headings) ===
      JSON.stringify([msg.vi.footer.tours, msg.vi.footer.info, msg.vi.footer.connect, msg.vi.footer.policies]),
    JSON.stringify(d?.headings)
  );

  check(
    "O2a labels = 12px / 600 / uppercase / wide tracking",
    d?.heading && d.heading.size === 12 && d.heading.weight === 600 && d.heading.transform === "uppercase" && d.heading.trackingEm >= 0.04 && d.heading.trackingEm <= 0.08,
    JSON.stringify(d?.heading)
  );
  check("O2b labels = white", d?.heading && near(d.heading.color, WHITE), JSON.stringify(d?.heading?.color));

  check("O3a body links = text-sm (14px)", d?.link && d.link.size === 14, `size=${d?.link?.size}`);
  check("O3b body links = white/80", d?.link && near(d.link.color, WHITE_80), JSON.stringify(d?.link?.color));
  check("O3c body links transition on hover", d?.link && d.link.transition !== "0s", String(d?.link?.transition));

  check(
    "O4 wordmark = white / text-xl (20px) / bold",
    d?.wordmark && d.wordmark.size === 20 && d.wordmark.weight >= 700 && near(d.wordmark.color, [255, 255, 255]),
    JSON.stringify(d?.wordmark)
  );

  const gaps = [0, 1, 2, 3].map((i) => d.childRects[i + 1].left - d.childRects[i].right);
  check("O5 uniform gap-8 (32px) @1280", gaps.every((g) => Math.abs(g - 32) <= 1), gaps.map((g) => g.toFixed(1)).join("/"));
  check("O6 brand + tagline present", d.tagline, `tagline=${d?.tagline}`);

  check(
    "O7 bottom bar: 1px divider + legal links + locale switch",
    d?.bottom && d.bottom.borderWidth === "1px" && d.bottom.links.length === 3 && JSON.stringify(d.bottom.localeButtons) === JSON.stringify(["en", "vi"]),
    JSON.stringify(d?.bottom)
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/o-footer-01-1280.png` });

  // ---------- @768 tablet (md) ----------
  await page.setViewport({ width: 768, height: 1024 });
  let t = await page.evaluate(measure, msg.vi.footer.tagline);
  let guard = "";
  if (!t.mdMatch) {
    await page.setViewport({ width: 800, height: 1024 });
    t = await page.evaluate(measure, msg.vi.footer.tagline);
    guard = " (bumped to 800)";
  }
  const navRowGaps = [1, 2, 3].map((i) => t.childRects[i + 1].left - t.childRects[i].right);
  check(
    "O8 md: brand spans full width, 4 nav columns in a row, gap-8",
    t.mdMatch === true &&
      Math.abs(t.childRects[0].width - t.gridW) <= 2 &&
      navRowGaps.every((g) => Math.abs(g - 32) <= 1),
    `brand=${t.childRects[0].width?.toFixed(0)} grid=${t.gridW.toFixed(0)} gaps=${navRowGaps.map((g) => g.toFixed(1)).join("/")}${guard}`
  );
  check("O8b no overflow @768", t.overflow <= 1, `overflow=${t.overflow}`);
  await (await page.$("footer")).screenshot({ path: `${OUT}/o-footer-02-768.png` });

  // ---------- @375 mobile ----------
  await page.setViewport({ width: 375, height: 812 });
  const m = await page.evaluate(measure, msg.vi.footer.tagline);
  check("O9a no horizontal overflow @375", m.overflow <= 1, `overflow=${m.overflow}`);
  check(
    "O9b brand block spans full width (2-col grid)",
    Math.abs(m.childRects[0].width - m.gridW) <= 2,
    `brand=${m.childRects[0].width?.toFixed(0)} grid=${m.gridW.toFixed(0)}`
  );
  check("O9c wordmark stays 20px @375", m.wordmark && m.wordmark.size === 20, `size=${m?.wordmark?.size}`);
  await (await page.$("footer")).screenshot({ path: `${OUT}/o-footer-03-375.png` });

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
