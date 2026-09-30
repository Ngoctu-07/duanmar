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
const srgb = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const parseRgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
const contrast = (fg, bg) => { const [l1, l2] = [luminance(parseRgb(fg)), luminance(parseRgb(bg))].sort((a, b) => b - a); return (l1 + 0.05) / (l2 + 0.05); };
const overWhite = (a, bg) => `rgb(${parseRgb(bg).map((v) => Math.round(255 * a + v * (1 - a))).join(", ")})`;
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

  // K1/K2/K6 paint audit — oklch/oklab tokens compute as lab()/oklab() in this Chrome, so canvas paints normalize to srgb bytes
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
    const token = getComputedStyle(ref).backgroundColor;
    ref.remove();
    const bg = getComputedStyle(document.querySelector("footer")).backgroundColor;
    const nodes = [...document.querySelectorAll("footer, footer h3, footer a, footer p, footer .font-brand")];
    const border = getComputedStyle(document.querySelector("footer .mt-8")).borderTopColor;
    return {
      token, bg, rgb: `rgb(${paint([bg]).join(", ")})`, border,
      n: nodes.length,
      bad: nodes.filter((n) => getComputedStyle(n).color !== "rgb(255, 255, 255)").map((n) => `${n.tagName}:${getComputedStyle(n).color}`),
      painted: paint([bg, border]), ideal: paint([bg, "rgba(255, 255, 255, 0.2)"]),
    };
  });
  check("K1 footer bg == --primary token, opaque", p.bg === p.token && p.bg !== "transparent" && p.bg !== "rgba(0, 0, 0, 0)", `computed=${p.bg} token=${p.token} srgb=${p.rgb}`);
  check("K2 all footer typography white", p.n >= 15 && p.bad.length === 0, `n=${p.n} bad=[${p.bad.join(", ")}]`);
  const cBase = contrast("rgb(255, 255, 255)", p.rgb); const cHover = contrast(overWhite(0.8, p.rgb), p.rgb);
  check("K3 contrast white-on-red >= 4.5", cBase >= 4.5, `${cBase.toFixed(2)} (fg rgb(255, 255, 255) / bg ${p.rgb})`);
  check("K3 contrast white/80-hover-on-red >= 4.5", cHover >= 4.5, `${cHover.toFixed(2)} (fg ${overWhite(0.8, p.rgb)} / bg ${p.rgb})`);
  check("K6 bottom bar border-top = white/20 over footer bg", p.painted.every((v, i) => Math.abs(v - p.ideal[i]) <= 1), `border=${p.border} painted=${p.painted} white/20=${p.ideal}`);

  // K4 knockout logo: src substring + canvas histogram of the raw png + header logo untouched
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
      src: document.querySelector("footer img")?.getAttribute("src") ?? "", hsrc: document.querySelector("header a img")?.getAttribute("src") ?? "",
      corner: d[3], size: `${c.width}x${c.height}`, transparent: (t / (d.length / 4)) * 100, white: (w / (d.length / 4)) * 100,
    };
  });
  check("K4a footer img is knockout (logo-duanmar-white)", k4.src.includes("logo-duanmar-white"), k4.src);
  check("K4b corner alpha<10, transparent>=40%, opaque-white>=10%", k4.corner < 10 && k4.transparent >= 40 && k4.white >= 10, `${k4.size} corner=${k4.corner} transparent=${k4.transparent.toFixed(1)}% white=${k4.white.toFixed(1)}%`);
  check("K4c header logo unchanged (logo-duanmar.png, not -white)", k4.hsrc.includes("logo-duanmar.png") && !k4.hsrc.includes("logo-duanmar-white"), k4.hsrc);

  // K5 newsletter CTA absent in both locales (visible body text)
  for (const locale of ["vi", "en"]) {
    if (!page.url().endsWith(`/${locale}`)) await go(page, locale);
    const text = await page.evaluate(() => document.body.innerText);
    check(`K5 ${locale}: no "Stay Updated"`, !text.includes("Stay Updated"), `len=${text.length}`);
    check(`K5 ${locale}: no "Subscribe"`, !text.includes("Subscribe"), `len=${text.length}`);
  }

  // K7 shots: 1280 knockout legibility + 375 no h-overflow + zero pageerrors
  await page.evaluate(() => document.querySelector("footer").scrollIntoView());
  await new Promise((r) => setTimeout(r, 300));
  await (await page.$("footer")).screenshot({ path: `${OUT}/m2-footer-red-01-1280.png` });
  await page.setViewport({ width: 375, height: 812 });
  await new Promise((r) => setTimeout(r, 300));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check("K7 no h-overflow @375", overflow <= 0, `overflow=${overflow}`);
  await page.screenshot({ path: `${OUT}/m2-footer-red-02-375.png` });
  check("K7 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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
