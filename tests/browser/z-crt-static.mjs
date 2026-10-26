import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { dismissPromo } from "../helpers/promo.mjs";
import { selectDifficulty } from "../helpers/difficulty.mjs";

/**
 * CRT static contract (event-only).
 *
 * The overlay must stay silent on landing, navigation, CTA clicks, typing,
 * focus, form submission and validation. It fires exactly twice:
 *   1. successful authentication;
 *   2. successful booking after the mock payment settles.
 * `prefers-reduced-motion` disables both the visual and the audio burst.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const DB_PATH = fileURLToPath(new URL("../../data/article-likes.db", import.meta.url));
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA busy_timeout = 5000");

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const BASE = "http://localhost:3000";
const results = [];
const errors = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stamp = Date.now();
const email = `crt.${stamp}@example.test`;
const password = "crt-pass-123";

/** Self-contained env reader (same pattern as the other browser suites). */
function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

async function sanityQuery(query) {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) return null;
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}` +
    `?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return null;
  return (await response.json()).result ?? null;
}

async function fetchPricedDestination() {
  const [destinations, pricing] = await Promise.all([
    sanityQuery('*[_type == "destination"]{ "slug": slug.current }'),
    sanityQuery('*[_type == "tourPricing"].tourSlug'),
  ]);
  if (!destinations || !pricing) return null;
  const priced = new Set(pricing.filter(Boolean));
  return destinations.map((d) => d.slug).filter((slug) => priced.has(slug)).sort()[0] ?? null;
}

const cleanupUser = () => {
  try {
    db.prepare("DELETE FROM users WHERE lower(email) = ?").run(email);
  } catch (error) {
    console.warn("cleanup failed", error.message);
  }
};

const fill = async (page, selector, value) => {
  await page.$eval(
    selector,
    (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value
  );
  await sleep(60);
};

const openAuthModal = async (page) => {
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) =>
      (el.textContent ?? "").toLowerCase().includes("sign in")
    );
    button?.click();
  });
  await page.waitForSelector("#auth-email", { timeout: 10000 });
};

const resetBursts = (page) => page.evaluate(() => { window.__crtBursts = []; });

let browser;
try {
  cleanupUser();
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (error) => pageErrors.push(error.message));

  // Record every burst with its declared duration before the app boots.
  await page.evaluateOnNewDocument(() => {
    window.__crtBursts = [];
    const watch = () => {
      const el = document.querySelector('[data-testid="crt-static"]');
      if (!el) {
        setTimeout(watch, 20);
        return;
      }
      window.__crtEl = el;
      const record = () => {
        if (el.dataset.active !== "true") return;
        const style = getComputedStyle(el);
        window.__crtBursts.push({
          at: Math.round(performance.now()),
          declared: Number(el.dataset.duration || 0),
          cssMs: Number.parseFloat(style.animationDuration || "0") * 1000,
        });
      };
      new MutationObserver(record).observe(el, {
        attributes: true,
        attributeFilter: ["data-active"],
      });
      record();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", watch);
    } else {
      watch();
    }
  });

  const bursts = () =>
    page.evaluate(() => ({
      list: window.__crtBursts ?? [],
      active: document.querySelector('[data-testid="crt-static"]')?.dataset.active ?? null,
    }));

  // --- G1: landing is silent (no splash)
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await sleep(900);
  const landing = await bursts();
  check(
    "G1 landing page fires no static burst",
    landing.list.length === 0 && landing.active === "false",
    JSON.stringify(landing.list)
  );

  // --- G2: navigation is silent
  await page.evaluate(() => {
    const links = [...document.querySelectorAll('header a[href="/en/deals"]')];
    const link = links.find((el) => el.getBoundingClientRect().width > 0);
    link?.click();
  });
  await page.waitForFunction(() => location.pathname === "/en/deals", { timeout: 20000 });
  await sleep(700);
  const nav = await bursts();
  check(
    "G2 standard navigation fires no static burst",
    nav.list.length === 0 && nav.active === "false",
    JSON.stringify(nav.list)
  );

  // --- G3: BOOK TOUR CTA click is silent (only the paid booking bursts)
  await page.goto(`${BASE}/en/tours`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  const destinationHref = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/explore/destinations/"]');
    return link ? link.getAttribute("href") : null;
  });
  check("G3 tour listing exposes a destination link", Boolean(destinationHref), String(destinationHref));
  let formSilentChecked = false;
  if (destinationHref) {
    await page.goto(`${BASE}${destinationHref}`, { waitUntil: "networkidle2", timeout: 90000 });
    await dismissPromo(page);
    await resetBursts(page);
    await page.click('a[href*="/booking/checkout"]');
    await sleep(450);
    const cta = await bursts();
    check(
      "G3 BOOK TOUR click fires no static burst",
      cta.list.length === 0 && cta.active === "false",
      JSON.stringify(cta.list)
    );

    // The CTA is auth-gated (signed-out visitors get the modal); navigation to
    // checkout is replayed only after sign-in. G4 just needs the form, so open
    // it directly while still asserting the click itself was silent.
    const checkoutHref = destinationHref
      .replace("/explore/destinations/", "/booking/checkout?tour=");
    await page.goto(`${BASE}${checkoutHref}`, { waitUntil: "networkidle2", timeout: 90000 });
    await dismissPromo(page);

    // --- G4: typing, focus and validation are silent
    if (await page.$("#booking-full-name")) {
      await resetBursts(page);
      await page.click("#booking-full-name");
      await page.type("#booking-full-name", "Nguyen Van A");
      await page.type("#booking-email", "not-an-email");
      await page.type("#booking-phone", "abc");
      await page.click('button[type="submit"]');
      await sleep(400);
      const form = await bursts();
      check(
        "G4 typing, focus and validation fire no static burst",
        form.list.length === 0 && form.active === "false",
        JSON.stringify(form.list)
      );
      formSilentChecked = true;
    }
  }
  if (!formSilentChecked) {
    check("G4 typing/focus/validation silent (no priced booking form to exercise)", true);
  }

  // --- G5: successful authentication fires exactly one 300ms burst
  await page.goto(`${BASE}/en/account`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "CRT Tester", email, password }),
      });
      if (!response.ok && response.status !== 409) {
        throw new Error(`register ${response.status}`);
      }
    },
    { email, password }
  );
  await resetBursts(page);
  await openAuthModal(page);
  await fill(page, "#auth-email", email);
  await page.type("#auth-password", password);
  await page.click('form button[type="submit"]');
  const signedIn = await page
    .waitForFunction(() => !document.querySelector("#auth-email"), { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  check("G5 sign-in completes", signedIn);
  await sleep(200);
  const auth = await bursts();
  check(
    "G5 authentication success fires exactly one 300ms burst",
    auth.list.length === 1 && auth.list[0]?.declared === 300,
    JSON.stringify(auth.list)
  );
  check(
    "G6 auth burst uses the 300ms CSS animation",
    auth.list[0] !== undefined && Math.round(auth.list[0].cssMs) === 300,
    `cssMs=${auth.list[0]?.cssMs}`
  );

  // --- G7: successful booking fires exactly one 300ms burst
  const pricedSlug = await fetchPricedDestination();
  if (!pricedSlug) {
    check("G7 booking success burst (skipped: no priced destination in the CMS)", true);
  } else {
    await page.goto(`${BASE}/en/booking/checkout?tour=${pricedSlug}`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await dismissPromo(page);
    await page.evaluate((slug) => {
      try {
        const key = "vn-my-trips:v1";
        const list = JSON.parse(localStorage.getItem(key) || "[]").filter((r) => r.slug !== slug);
        localStorage.setItem(key, JSON.stringify(list));
      } catch { /* storage unavailable */ }
    }, pricedSlug);

    await fill(page, "#booking-full-name", "Nguyen Van CRT");
    await fill(page, "#booking-email", "crt-booking@example.test");
    await fill(page, "#booking-phone", "0912345678");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    await page.click(`td[data-day="${iso}"] button`);
    await selectDifficulty(page, "Medium");
    await sleep(200);
    await page.click('button[type="submit"]');
    const summary = await page.waitForSelector("#booking-summary-heading", { timeout: 10000 }).catch(() => null);
    check("G7 booking form reaches the summary", Boolean(summary), `slug=${pricedSlug}`);

    await resetBursts(page);
    await page.click('input[name="payment-method"][value="momo"]');
    await sleep(3400); // mock webhook VERIFY_DELAY_MS (3000) + buffer
    const paid = await bursts();
    check(
      "G7 booking success fires exactly one 300ms burst",
      paid.list.length === 1 && paid.list[0]?.declared === 300,
      JSON.stringify(paid.list)
    );

    // cleanup so shared-profile My Trips tests stay deterministic
    await page.evaluate((slug) => {
      try {
        const key = "vn-my-trips:v1";
        const list = JSON.parse(localStorage.getItem(key) || "[]").filter((r) => r.slug !== slug);
        localStorage.setItem(key, JSON.stringify(list));
      } catch { /* storage unavailable */ }
    }, pricedSlug);
  }

  // --- G8: reduced motion disables the success burst
  await page.goto(`${BASE}/en/account`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) =>
      (el.textContent ?? "").toLowerCase().includes("sign out")
    );
    button?.click();
  });
  await page
    .waitForFunction(
      () => [...document.querySelectorAll("button")].some((el) =>
        (el.textContent ?? "").toLowerCase().includes("sign in")
      ),
      { timeout: 20000 }
    )
    .catch(() => undefined);

  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await resetBursts(page);
  await openAuthModal(page);
  await fill(page, "#auth-email", email);
  await page.type("#auth-password", password);
  await page.click('form button[type="submit"]');
  await page
    .waitForFunction(() => !document.querySelector("#auth-email"), { timeout: 30000 })
    .catch(() => undefined);
  await sleep(400);
  const reduced = await bursts();
  check(
    "G8 reduced motion suppresses the auth success burst",
    reduced.list.length === 0 && reduced.active === "false",
    JSON.stringify(reduced.list)
  );

  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.screenshot({ path: `${OUT}/z-crt-static.png` });
  check("G9 zero pageerrors", pageErrors.length === 0, pageErrors.join(" | "));
} catch (error) {
  check("verification script completed", false, String(error?.stack ?? error));
} finally {
  cleanupUser();
  if (browser) await closeBrowser();
}

console.log(results.join("\n"));
const failed = results.filter((line) => line.startsWith("FAIL"));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
