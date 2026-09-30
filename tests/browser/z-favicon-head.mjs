/**
 * Plan 260930-1402 — favicon/web-app icon head injection.
 *
 * Always asserts the link tags + asset delivery over HTTP (fetch only).
 * Chromium screenshot harness runs when `puppeteer` is installed; otherwise the
 * visual checks are reported as skipped instead of failing the suite.
 */
import { pathToFileURL, fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
const BASE = "http://localhost:3000";
const BROWSER_LIB = pathToFileURL(
  fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
).href;

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const EXPECTED = [
  '<link rel="icon" href="/favicon.ico" sizes="any"',
  '<link rel="icon" href="/icon.svg" type="image/svg+xml"',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png"',
];

const count = (haystack, needle) => haystack.split(needle).length - 1;

let browser = null;
let closeBrowser = null;

try {
  for (const route of ["", "en", "vi"]) {
    const label = route ? `/${route}` : "/ (redirect)";
    const res = await fetch(`${BASE}/${route}`, { redirect: "follow" });
    const html = await res.text();
    check(`${label}: page 200`, res.status === 200, String(res.status));
    for (const tag of EXPECTED) {
      check(`${label}: ${tag.slice(0, 44)}…`, count(html, tag) === 1, `found ${count(html, tag)}`);
    }
    check(
      `${label}: no stray icon links`,
      count(html, 'rel="icon"') === 2 && count(html, 'rel="apple-touch-icon"') === 1,
      `icon=${count(html, 'rel="icon"')} apple=${count(html, 'rel="apple-touch-icon"')}`
    );
  }

  const assets = {
    "/favicon.ico": [0x00, 0x00, 0x01, 0x00],
    "/icon.svg": null,
    "/apple-touch-icon.png": [0x89, 0x50, 0x4e, 0x47],
    "/icon-192.png": [0x89, 0x50, 0x4e, 0x47],
    "/icon-512.png": [0x89, 0x50, 0x4e, 0x47],
  };
  for (const [path, magic] of Object.entries(assets)) {
    const res = await fetch(`${BASE}${path}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    check(`GET ${path} → 200`, res.status === 200, String(res.status));
    if (magic) {
      check(
        `${path} magic bytes`,
        magic.every((byte, index) => buffer[index] === byte)
      );
    } else {
      check(`${path} is svg+xml`, (res.headers.get("content-type") ?? "").includes("image/svg+xml"));
    }
  }

  try {
    const browserLib = await import(BROWSER_LIB);
    browser = await browserLib.getBrowser({ headless: true });
    closeBrowser = browserLib.closeBrowser;
  } catch (error) {
    results.push(`skip visual harness :: puppeteer unavailable (${error.code ?? error.message})`);
  }

  if (browser) {
    const { getPage } = await import(BROWSER_LIB);
    const page = await getPage(browser);

    // Render every resolution beside the page title; `data-natural` is the
    // intrinsic square size each source must decode to (Chromium picks the
    // 32px frame from the multi-size .ico, so both ico rows expect 32).
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff;
        font:16px/1.4 system-ui;display:flex;align-items:center;gap:12px;padding:16px">
      <img src="${BASE}/favicon.ico" width="16" height="16" data-natural="32" alt="">
      <img src="${BASE}/favicon.ico" width="32" height="32" data-natural="32" alt="">
      <img src="${BASE}/icon.svg" width="32" height="32" data-natural="512" alt="">
      <img src="${BASE}/icon-192.png" width="32" height="32" data-natural="192" alt="">
      <img src="${BASE}/apple-touch-icon.png" width="48" height="48" data-natural="180" alt="">
      <strong>DuanMar</strong></body></html>`);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const metrics = await page.evaluate(() =>
      [...document.images].map((img) => ({
        natural: [img.naturalWidth, img.naturalHeight],
        rendered: [img.width, img.height],
        expected: Number(img.dataset.natural),
        complete: img.complete,
      }))
    );
    check("all icons decoded", metrics.every((m) => m.complete && m.natural[0] > 0));
    metrics.forEach((metric, index) => {
      check(
        `icon #${index} intrinsic ${metric.expected}px square (undistorted)`,
        metric.natural[0] === metric.expected && metric.natural[1] === metric.expected,
        JSON.stringify(metric)
      );
    });
    await page.screenshot({ path: `${OUT}/z-favicon-row.png` });

    await page.goto(`${BASE}/en`, { waitUntil: "domcontentloaded" });
    const links = await page.evaluate(() =>
      [...document.querySelectorAll("link[rel='icon'], link[rel='apple-touch-icon']")].map(
        (el) => `${el.getAttribute("rel")}|${el.getAttribute("href")}|${el.getAttribute("sizes") ?? ""}|${el.getAttribute("type") ?? ""}`
      )
    );
    check("rendered head has exactly 3 icon links", links.length === 3, JSON.stringify(links));
  }
} catch (error) {
  errors.push(`fatal: ${error.message}`);
} finally {
  if (browser && closeBrowser) await closeBrowser(browser).catch(() => {});
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);
