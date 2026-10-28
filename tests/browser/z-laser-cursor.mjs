import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Inverted laser cursor.
 *
 * A. One 8px white disc, difference blend, no rings/halos, inert.
 * B. `pointermove` -> --cursor-x / --cursor-y -> translate3d, with the exact
 *    viewport position and a 8x8 bounding box.
 * C. The native cursor is hidden on fine pointers.
 * D. Pixel proof: the dot renders black over white and white over black.
 * E. Blur hides it; touch devices get no custom cursor and keep the native one.
 */

const { getBrowser, closeBrowser } = await import(
  pathToFileURL("D:/tour/.claude/skills/chrome-devtools/scripts/lib/browser.js").href
);

const BASE = "http://localhost:3000";
const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readDot = (page) =>
  page.evaluate(() => {
    const dot = document.querySelector('[data-testid="laser-cursor"]');
    if (!dot) return null;
    const style = getComputedStyle(dot);
    return {
      visible: dot.getAttribute("data-visible"),
      enabled: dot.getAttribute("data-enabled"),
      x: style.getPropertyValue("--cursor-x").trim(),
      y: style.getPropertyValue("--cursor-y").trim(),
      width: style.width,
      height: style.height,
      radius: style.borderRadius,
      background: style.backgroundColor,
      blend: style.mixBlendMode,
      pointerEvents: style.pointerEvents,
      opacity: style.opacity,
      boxShadow: style.boxShadow,
      borderWidth: style.borderWidth,
      outlineWidth: style.outlineWidth,
      display: style.display,
      htmlClass: document.documentElement.classList.contains("laser-cursor-active"),
      htmlCursor: getComputedStyle(document.documentElement).cursor,
      bodyCursor: getComputedStyle(document.body).cursor,
    };
  });

const meanOf = async (buffer, left, top, size) => {
  const stats = await sharp(buffer)
    .extract({ left, top, width: size, height: size })
    .greyscale()
    .stats();
  return Math.round(stats.channels[0].mean * 100) / 100;
};

let browser;
try {
  browser = await getBrowser({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto(`${BASE}/en/tours`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.waitForSelector('[data-testid="laser-cursor"]', { timeout: 30000 });
  await page.waitForFunction(() => {
    const dot = document.querySelector('[data-testid="laser-cursor"]');
    return dot?.getAttribute("data-enabled") === "true";
  });

  const initial = await readDot(page);
  check(
    "one compact 8px white dot with difference blend",
    initial.width === "8px" &&
      initial.height === "8px" &&
      Number.parseFloat(initial.radius) >= 4 &&
      initial.background === "rgb(255, 255, 255)" &&
      initial.blend === "difference",
    JSON.stringify({
      width: initial.width,
      height: initial.height,
      radius: initial.radius,
      background: initial.background,
      blend: initial.blend,
    })
  );
  check(
    "no rings, halos, borders or shadows",
    initial.boxShadow === "none" && initial.borderWidth === "0px" && initial.outlineWidth === "0px",
    JSON.stringify({
      boxShadow: initial.boxShadow,
      borderWidth: initial.borderWidth,
      outlineWidth: initial.outlineWidth,
    })
  );
  check(
    "cursor is inert and starts hidden",
    initial.pointerEvents === "none" && initial.visible === "false" && initial.opacity === "0",
    JSON.stringify({ pointerEvents: initial.pointerEvents, visible: initial.visible, opacity: initial.opacity })
  );
  check(
    "native cursor stays until the dot replaces it",
    !initial.htmlClass && initial.bodyCursor !== "none",
    JSON.stringify({ htmlClass: initial.htmlClass, bodyCursor: initial.bodyCursor })
  );

  await dismissPromo(page);
  await page.mouse.move(720, 450);
  await page.waitForFunction(() => {
    const dot = document.querySelector('[data-testid="laser-cursor"]');
    return dot?.getAttribute("data-visible") === "true";
  });
  await sleep(80);
  const moved = await readDot(page);
  check(
    "pointermove writes --cursor-x / --cursor-y and shows the dot",
    moved.x === "720px" && moved.y === "450px" && moved.visible === "true" && moved.opacity === "1",
    JSON.stringify({ x: moved.x, y: moved.y, visible: moved.visible, opacity: moved.opacity })
  );
  check(
    "native cursor is hidden while the dot follows the pointer",
    moved.htmlClass && moved.htmlCursor === "none" && moved.bodyCursor === "none",
    JSON.stringify({ htmlClass: moved.htmlClass, htmlCursor: moved.htmlCursor, bodyCursor: moved.bodyCursor })
  );

  const box = await page.$eval('[data-testid="laser-cursor"]', (dot) => {
    const rect = dot.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  check(
    "dot is centred on the pointer via translate3d + translate(-50%, -50%)",
    Math.abs(box.x - 716) < 0.6 && Math.abs(box.y - 446) < 0.6 && box.width === 8 && box.height === 8,
    JSON.stringify(box)
  );

  // Difference proof with a controlled surface beneath the dot.
  await page.evaluate(() => {
    document.getElementById("laser-cursor-test-surface")?.remove();
    const surface = document.createElement("div");
    surface.id = "laser-cursor-test-surface";
    Object.assign(surface.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      background: "#ffffff",
      pointerEvents: "none",
    });
    document.body.appendChild(surface);
  });
  await page.mouse.move(720, 450);
  await sleep(150);
  const overWhite = await page.screenshot({ clip: { x: 718, y: 448, width: 4, height: 4 } });
  const overWhiteMean = await meanOf(overWhite, 0, 0, 4);

  await page.evaluate(() => {
    const surface = document.getElementById("laser-cursor-test-surface");
    if (surface) surface.style.background = "#000000";
  });
  await sleep(150);
  const overBlack = await page.screenshot({ clip: { x: 718, y: 448, width: 4, height: 4 } });
  const overBlackMean = await meanOf(overBlack, 0, 0, 4);
  check(
    "difference flips the dot black over white and white over black",
    overWhiteMean < 40 && overBlackMean > 215,
    JSON.stringify({ overWhiteMean, overBlackMean })
  );
  await page.evaluate(() => document.getElementById("laser-cursor-test-surface")?.remove());

  await page.screenshot({ path: `${OUT}/laser-cursor-tours.png` });

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await sleep(150);
  const blurred = await readDot(page);
  check(
    "window blur hides the dot and restores the native cursor",
    blurred.visible === "false" && blurred.opacity === "0" && !blurred.htmlClass && blurred.bodyCursor !== "none",
    JSON.stringify({ visible: blurred.visible, opacity: blurred.opacity, htmlClass: blurred.htmlClass })
  );

  // Touch device: no dot, no hidden native cursor, no tracking listeners.
  const touchPage = await browser.newPage();
  await touchPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await touchPage.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  );
  await touchPage.goto(`${BASE}/en/tours`, { waitUntil: "networkidle2", timeout: 120000 });
  await dismissPromo(touchPage);
  await sleep(250);
  const touch = await readDot(touchPage);
  check(
    "touch devices hide the dot and keep the platform cursor",
    touch.display === "none" && !touch.htmlClass && touch.bodyCursor !== "none",
    JSON.stringify({ display: touch.display, htmlClass: touch.htmlClass, bodyCursor: touch.bodyCursor })
  );
  await touchPage.screenshot({ path: `${OUT}/laser-cursor-touch.png` });

  check("no page errors while the cursor is active", pageErrors.length === 0, pageErrors.join(" | "));
} catch (error) {
  check("verification script completed", false, String(error?.stack ?? error));
} finally {
  if (browser) await closeBrowser(browser);
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} check(s) failed: ${errors.join(", ")}`);
  process.exit(1);
}
console.log("\nall inverted laser cursor checks passed");
