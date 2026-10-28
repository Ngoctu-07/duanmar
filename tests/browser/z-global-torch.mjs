import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Global torch spotlight.
 *
 * A. Mounted on every page (root layout) as a decorative, pointer-transparent
 *    fixed layer behind the app.
 * B. The 200px mask follows the pointer and the area inside the beam is
 *    measurably brighter than the pitch-black rest of the layer.
 * C. Focusing a real form input (auth modal) pauses/hides the reveal; leaving
 *    the field resumes it.
 * D. Touch/coarse pointers use the static centred 260px spot; reduced motion
 *    clears tracking.
 */

const { getBrowser, closeBrowser } = await import(
  new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url).href
);

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  sharp = null;
}

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

const readState = (page) =>
  page.evaluate(() => {
    const layer = document.querySelector('[data-testid="global-torch"]');
    const reveal = document.querySelector('[data-testid="global-torch-reveal"]');
    if (!layer || !reveal) return null;
    const style = getComputedStyle(reveal);
    return {
      x: getComputedStyle(layer).getPropertyValue("--mouse-x").trim(),
      y: getComputedStyle(layer).getPropertyValue("--mouse-y").trim(),
      mask: style.maskImage || style.webkitMaskImage || "",
      opacity: style.opacity,
      paused: layer.getAttribute("data-paused"),
      ariaHidden: layer.getAttribute("aria-hidden"),
      pointerEvents: getComputedStyle(layer).pointerEvents,
      position: getComputedStyle(layer).position,
      zIndex: getComputedStyle(layer).zIndex,
    };
  });

const brightness = async (buffer, left, top, size = 48) => {
  if (!sharp) return null;
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
  await dismissPromo(page);
  await page.waitForSelector('[data-testid="global-torch"]', { timeout: 30000 });

  const initial = await readState(page);
  check(
    "torch layer is mounted globally, fixed behind the app and inert",
    Boolean(initial) &&
      initial.ariaHidden === "true" &&
      initial.pointerEvents === "none" &&
      initial.position === "fixed" &&
      initial.zIndex === "-1",
    JSON.stringify(initial && {
      ariaHidden: initial.ariaHidden,
      pointerEvents: initial.pointerEvents,
      position: initial.position,
      zIndex: initial.zIndex,
    })
  );
  check(
    "mask is the 200px radial torch",
    Boolean(initial) && initial.mask.includes("200px") && initial.mask.includes("radial-gradient"),
    initial?.mask.slice(0, 110)
  );

  await page.mouse.move(300, 640);
  await page.waitForFunction(
    () => {
      const layer = document.querySelector('[data-testid="global-torch"]');
      return layer && getComputedStyle(layer).getPropertyValue("--mouse-x").trim() !== "";
    },
    { timeout: 5000 }
  );
  const moved = await readState(page);
  check(
    "pointermove tracks viewport coordinates on a non-home page",
    Math.abs(Number.parseFloat(moved.x) - (300 / 1440) * 100) < 0.5 &&
      Math.abs(Number.parseFloat(moved.y) - (640 / 900) * 100) < 0.5,
    JSON.stringify({ x: moved.x, y: moved.y })
  );

  // Pixel proof: same point, beam on it vs beam far away (empty area under the grid).
  const clip = { x: 676, y: 816, width: 48, height: 48 };
  await page.evaluate(() => {
    const layer = document.querySelector('[data-testid="global-torch"]');
    layer?.style.setProperty("--mouse-x", "100%");
    layer?.style.setProperty("--mouse-y", "4%");
  });
  await sleep(200);
  const darkShot = await page.screenshot({ clip });
  const darkMean = await brightness(darkShot, 0, 0, 48);

  await page.evaluate(() => {
    const layer = document.querySelector('[data-testid="global-torch"]');
    layer?.style.setProperty("--mouse-x", "48.61%");
    layer?.style.setProperty("--mouse-y", "93.33%");
  });
  await sleep(120);
  const litShot = await page.screenshot({ clip });
  const litMean = await brightness(litShot, 0, 0, 48);
  check(
    "hidden lore is revealed only inside the torch circle",
    darkMean !== null && litMean !== null && darkMean < 20 && litMean > darkMean + 2,
    JSON.stringify({ darkMean, litMean })
  );
  await page.screenshot({ path: `${OUT}/global-torch-tours.png` });

  // C. Form focus pauses and hides the reveal, blur resumes.
  await page.goto(`${BASE}/en/account`, { waitUntil: "networkidle2", timeout: 120000 });
  await dismissPromo(page);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) =>
      (el.textContent ?? "").toLowerCase().includes("sign in / register")
    );
    button?.click();
  });
  await page.waitForSelector("#auth-email", { timeout: 15000 });
  await page.focus("#auth-email");
  await sleep(300);
  const paused = await readState(page);
  check(
    "focus inside the auth form pauses and hides the torch",
    paused.paused === "true" && paused.opacity === "0",
    JSON.stringify({ paused: paused.paused, opacity: paused.opacity })
  );
  await page.screenshot({ path: `${OUT}/global-torch-form-paused.png` });

  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  await sleep(400);
  const resumed = await readState(page);
  check(
    "leaving the form resumes the torch",
    resumed.paused === "false" && resumed.opacity !== "0",
    JSON.stringify({ paused: resumed.paused, opacity: resumed.opacity })
  );
  await page.keyboard.press("Escape");
  await sleep(300);

  // D. Reduced motion clears tracking.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.waitForFunction(
    () => {
      const layer = document.querySelector('[data-testid="global-torch"]');
      return layer && getComputedStyle(layer).getPropertyValue("--mouse-x").trim() === "";
    },
    { timeout: 5000 }
  );
  const reduced = await readState(page);
  check(
    "reduced motion clears pointer tracking",
    reduced.x === "" && reduced.y === "",
    JSON.stringify({ x: reduced.x, y: reduced.y })
  );
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

  // A. Still global on a second route.
  await page.goto(`${BASE}/en/blog`, { waitUntil: "networkidle2", timeout: 120000 });
  await dismissPromo(page);
  const blog = await page.evaluate(() => Boolean(document.querySelector('[data-testid="global-torch"]')));
  check("torch layer is present on every route (blog)", blog);

  // Touch fallback.
  const touchPage = await browser.newPage();
  await touchPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await touchPage.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  );
  await touchPage.goto(`${BASE}/en/tours`, { waitUntil: "networkidle2", timeout: 120000 });
  await dismissPromo(touchPage);
  const touch = await touchPage.evaluate(() => {
    const layer = document.querySelector('[data-testid="global-torch"]');
    const reveal = document.querySelector('[data-testid="global-torch-reveal"]');
    const style = reveal ? getComputedStyle(reveal) : null;
    return {
      coarse: matchMedia("(hover: none), (pointer: coarse)").matches,
      x: layer ? getComputedStyle(layer).getPropertyValue("--mouse-x").trim() : "missing",
      mask: style ? style.maskImage || style.webkitMaskImage || "" : "",
    };
  });
  check(
    "touch screens use the static centred 260px ambient glow",
    touch.coarse && touch.x === "" && touch.mask.includes("260px") && touch.mask.includes("50% 38%"),
    JSON.stringify({ coarse: touch.coarse, x: touch.x, mask: touch.mask.slice(0, 110) })
  );
  await touchPage.screenshot({ path: `${OUT}/global-torch-touch.png` });

  check("no page errors while the torch is active", pageErrors.length === 0, pageErrors.join(" | "));
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
console.log("\nall global torch checks passed");
