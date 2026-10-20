import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const browserLib = new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url);
const { getBrowser, getPage, closeBrowser } = await import(pathToFileURL(fileURLToPath(browserLib)).href);

const results = [];
const errors = []; const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

// Tailwind v4 tokens compute as lab()/oklab() in this Chrome → paint through a
// canvas to normalize any color expression to sRGB bytes before comparing.
const srgb = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const near = (rgb, expected, tol = 3) => rgb.every((v, i) => Math.abs(v - expected[i]) <= tol);

const RED = [127, 29, 29];        // #7f1d1d footer canvas (== --primary)
const WHITE_20 = [153, 74, 74];   // white/20 over red (main top border)
const WHITE_15 = [146, 63, 63];   // white/15 over red (bottom divider)
const WHITE_80 = [229, 210, 210]; // white/80 text composited over red

const go = async (page, locale) => {
  await page.setCookie({ name: "NEXT_LOCALE", value: locale, url: "http://localhost:3000" });
  await page.goto(`http://localhost:3000/${locale}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
};

let browser = null;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await go(page, "vi");
  if (!page.url().endsWith("/vi")) throw new Error(`locale mismatch: ${page.url()}`);

  const p = await page.evaluate(() => {
    const paint = (layers) => {
      const c = document.createElement("canvas"); c.width = c.height = 1;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      for (const color of layers) { ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); }
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const ref = document.createElement("div");
    ref.style.background = "var(--primary)";
    document.body.appendChild(ref);
    const primary = getComputedStyle(ref).backgroundColor;
    ref.remove();

    const footer = document.querySelector("footer");
    const bg = getComputedStyle(footer).backgroundColor;
    const bottom = footer.querySelector('[data-testid="footer-bottom"]');
    const heading = footer.querySelector("h3");
    const link = footer.querySelectorAll(".grid a")[1];
    const wordmark = footer.querySelector("span.font-brand");
    return {
      bg,
      bgRgb: paint([bg]),
      primaryRgb: paint([primary]),
      border: getComputedStyle(footer).borderTopColor,
      borderRgb: paint([bg, getComputedStyle(footer).borderTopColor]),
      bottomBorder: getComputedStyle(bottom).borderTopColor,
      bottomBorderRgb: paint([bg, getComputedStyle(bottom).borderTopColor]),
      headingColor: paint([getComputedStyle(heading).color]),
      linkColor: paint([bg, getComputedStyle(link).color]),
      headingXform: getComputedStyle(heading).textTransform,
      headingWeight: Number(getComputedStyle(heading).fontWeight),
      headingSize: parseFloat(getComputedStyle(heading).fontSize),
      linkSize: parseFloat(getComputedStyle(link).fontSize),
      wordmarkColor: paint([getComputedStyle(wordmark).color]),
      wordmarkSize: parseFloat(getComputedStyle(wordmark).fontSize),
      primary,
    };
  });

  check("K1 footer canvas = brand red #7f1d1d (== --primary)", near(p.bgRgb, RED) && near(p.bgRgb, p.primaryRgb), `rgb=${p.bgRgb} primary=${p.primaryRgb}`);
  check("K2 main top border = white/20 over red", near(p.borderRgb, WHITE_20), `rgb=${p.borderRgb} color=${p.border}`);
  check("K3 bottom utility divider = white/15 over red", near(p.bottomBorderRgb, WHITE_15), `composite=${p.bottomBorderRgb} color=${p.bottomBorder}`);
  check("K4 column labels: 12px / 600 / uppercase", p.headingSize === 12 && p.headingWeight === 600 && p.headingXform === "uppercase", `${p.headingSize}px/${p.headingWeight}/${p.headingXform}`);
  check("K5 labels = white, body links = white/80", near(p.headingColor, [255, 255, 255]) && near(p.linkColor, WHITE_80), `heading=${p.headingColor} link=${p.linkColor}`);
  check("K6 body links = text-sm (14px)", p.linkSize === 14, `${p.linkSize}px`);
  check("K7 brand wordmark = white, text-xl (20px)", near(p.wordmarkColor, [255, 255, 255]) && p.wordmarkSize === 20, `rgb=${p.wordmarkColor} size=${p.wordmarkSize}`);
  check("K8 white/80 body text on red >= 4.5:1", contrast(p.linkColor, p.bgRgb) >= 4.5, `${contrast(p.linkColor, p.bgRgb).toFixed(2)}:1`);

  // Knockout mark: the footer keeps the white-stroke rendition on the dark canvas;
  // the header logo must stay untouched.
  const k4 = await page.evaluate(async () => {
    const img = new Image();
    img.src = "/images/logo-duanmar-white.png";
    await img.decode();
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let t = 0; let w = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 10) t += 1;
      else if (d[i + 3] > 245 && d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) w += 1;
    }
    return {
      src: document.querySelector("footer img")?.getAttribute("src") ?? "",
      hsrc: document.querySelector("header a img")?.getAttribute("src") ?? "",
      corner: d[3], size: `${c.width}x${c.height}`,
      transparent: (t / (d.length / 4)) * 100, white: (w / (d.length / 4)) * 100,
    };
  });
  check("K9a footer mark is knockout (logo-duanmar-white)", k4.src.includes("logo-duanmar-white"), k4.src);
  check("K9b corner alpha<10, transparent>=40%, opaque-white>=10%", k4.corner < 10 && k4.transparent >= 40 && k4.white >= 10, `${k4.size} corner=${k4.corner} transparent=${k4.transparent.toFixed(1)}% white=${k4.white.toFixed(1)}%`);
  check("K9c header logo unchanged (logo-duanmar.png)", k4.hsrc.includes("logo-duanmar.png") && !k4.hsrc.includes("logo-duanmar-white"), k4.hsrc);

  // No newsletter CTA in either locale (visible body text).
  for (const locale of ["vi", "en"]) {
    if (!page.url().endsWith(`/${locale}`)) await go(page, locale);
    const text = await page.evaluate(() => document.body.innerText);
    check(`K10 ${locale}: no "Stay Updated"`, !text.includes("Stay Updated"), `len=${text.length}`);
    check(`K10 ${locale}: no "Subscribe"`, !text.includes("Subscribe"), `len=${text.length}`);
  }

  // Shots + no horizontal overflow + zero pageerrors.
  await page.evaluate(() => document.querySelector("footer").scrollIntoView());
  await new Promise((r) => setTimeout(r, 300));
  await (await page.$("footer")).screenshot({ path: `${OUT}/m2-footer-minimal-01-1280.png` });
  await page.setViewport({ width: 375, height: 812 });
  await new Promise((r) => setTimeout(r, 300));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("K11 no h-overflow @375", overflow <= 0, `overflow=${overflow}`);
  await page.screenshot({ path: `${OUT}/m2-footer-minimal-02-375.png` });
  check("K11 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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
