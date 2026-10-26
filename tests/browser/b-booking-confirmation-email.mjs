import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";
import { selectDifficulty } from "../helpers/difficulty.mjs";

/**
 * Plan 260929-2229 — delayed booking-confirmation email.
 * Part 1: API contract (405/415/400/202 + 2-min sendAt) — always runs.
 * Part 2: booking flow dispatch spy — data-driven (needs a live priced,
 * priced destination; skips honestly when none exists).
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const results = [];
const errors = [];
const pageErrors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

async function sanityQuery(query) {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing");
  const url = `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return (await res.json()).result;
}

const validPayload = {
  reference: "VN-EMTEST",
  slug: "hcm",
  tourName: "Sai Gon City Tour",
  fullName: "Nguyen Van Email",
  email: "emailtest@example.com",
  phone: "0912345678",
  travelDate: "2026-10-10",
  guests: 2,
  total: 1_200_000,
  currency: "VND",
  paymentMethod: "momo",
  notes: "Window seat please",
  locale: "vi",
};

const postJson = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

// ---------- Part 1: API contract ----------
{
  const get = await fetch(`${BASE}/api/booking-confirmation`);
  check("B1 GET → 405", get.status === 405, `status=${get.status}`);

  const ct = await fetch(`${BASE}/api/booking-confirmation`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "hi",
  });
  check("B2 non-JSON content-type → 415", ct.status === 415, `status=${ct.status}`);

  const bad = await postJson("/api/booking-confirmation", "{not json");
  check("B3 malformed JSON → 400", bad.status === 400, `status=${bad.status}`);

  const missing = await postJson("/api/booking-confirmation", { ...validPayload, email: "" });
  const missingBody = await missing.json().catch(() => null);
  check("B4 invalid email → 400 {errors.email}", missing.status === 400 && Boolean(missingBody?.errors?.email),
    JSON.stringify({ status: missing.status, body: missingBody }));

  const badRef = await postJson("/api/booking-confirmation", { ...validPayload, reference: "ORDER-1" });
  const badRefBody = await badRef.json().catch(() => null);
  check("B5 bad reference → 400 {errors.reference}", badRef.status === 400 && Boolean(badRefBody?.errors?.reference),
    JSON.stringify({ status: badRef.status, body: badRefBody }));

  const before = Date.now();
  const okRes = await postJson("/api/booking-confirmation", validPayload);
  const okBody = await okRes.json().catch(() => null);
  const sendAt = okBody?.sendAt ? Date.parse(okBody.sendAt) : NaN;
  const delta = sendAt - before;
  // The delay is env-driven (dev often shortens it); assert the configured
  // contract instead of the production default.
  const expectedDelay = Number(envValue("BOOKING_EMAIL_DELAY_MS") ?? 120_000);
  const tolerance = Math.max(5_000, Math.round(expectedDelay * 0.1));
  check("B6 valid payload → 202 {queued,jobId,sendAt}",
    okRes.status === 202 && okBody?.queued === true && typeof okBody?.jobId === "string",
    JSON.stringify({ status: okRes.status, body: okBody }));
  check(`B7 sendAt ≈ now + ${expectedDelay} ms (configured delay)`,
    Number.isFinite(delta) &&
      delta >= expectedDelay - tolerance &&
      delta <= expectedDelay + tolerance,
    `delta=${delta}ms expected=${expectedDelay}ms`);
}

// ---------- Part 2: booking-flow dispatch spy ----------
{
  const destinations = await sanityQuery('*[_type == "destination"]{ "slug": slug.current }');
  const pricingSlugs = await sanityQuery('*[_type == "tourPricing"].tourSlug') ?? [];
  const priced = new Set(pricingSlugs);
  // Any priced destination works: every checkout now includes the universal
  // difficulty step and the confirmation POST needs a priced tour.
  const slug =
    (destinations ?? [])
      .map((d) => d.slug)
      .filter((s) => priced.has(s))
      .sort()[0] ?? null;

  if (!slug) {
    check("B8 priced destination exists (flow spy skipped honestly)",
      false, `pricing=${JSON.stringify(pricingSlugs)} destinations=${JSON.stringify(destinations)}`);
  } else {
    const { getBrowser, getPage, closeBrowser } = await import(
      pathToFileURL(
        fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
      ).href
    );

    const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1100 } });
    const page = await getPage(browser);
    page.on("pageerror", (e) => pageErrors.push(e.message));

    /** Captured POST /api/booking-confirmation requests. */
    const posts = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/booking-confirmation") && req.method() === "POST") {
        try {
          posts.push(JSON.parse(req.postData() ?? "{}"));
        } catch {
          posts.push({ parseError: true });
        }
      }
    });

    await page.goto(`${BASE}/vi/booking/checkout?tour=${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);

    const fill = async (selector, value) => {
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

    await fill("#booking-full-name", "Nguyen Van Email");
    await fill("#booking-email", "emailtest@example.com");
    await fill("#booking-phone", "0912345678");

    const difficultySelect = await page.$("#booking-difficulty");
    check("B8 difficulty dropdown present in the universal booking form", Boolean(difficultySelect), `slug=${slug}`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    await page.click(`td[data-day="${iso}"] button`);
    await selectDifficulty(page, "Medium");
    await sleep(200);
    await page.click('button[type="submit"]');
    await sleep(400);
    check("B9 valid form → summary", Boolean(await page.$("#booking-summary-heading")));

    await page.click('input[name="payment-method"][value="momo"]');
    await sleep(3400); // mock webhook VERIFY_DELAY_MS (3000) + buffer
    await page.screenshot({ path: `${OUT}/b-booking-email-paid.png` });

    check("B10 exactly 1 confirmation POST dispatched", posts.length === 1, `posts=${posts.length}`);
    const sent = posts[0] ?? {};
    check("B11 payload contract (reference/slug/email/difficulty/payment/total/locale)",
      /^VN-[0-9A-Z]+$/.test(sent.reference ?? "") &&
        sent.slug === slug &&
        sent.email === "emailtest@example.com" &&
        sent.difficulty === "Medium" &&
        sent.paymentMethod === "momo" &&
        typeof sent.total === "number" && sent.total > 0 &&
        sent.locale === "vi" &&
        typeof sent.guests === "number" && sent.guests >= 1 &&
        /^\d{4}-\d{2}-\d{2}$/.test(sent.travelDate ?? ""),
      JSON.stringify(sent));

    // cleanup so shared-profile My Trips tests stay deterministic
    await page.evaluate((slug) => {
      try {
        const key = "vn-my-trips:v1";
        const list = JSON.parse(localStorage.getItem(key) || "[]").filter((r) => r.slug !== slug);
        localStorage.setItem(key, JSON.stringify(list));
      } catch { /* storage unavailable */ }
    }, slug);

    check("B12 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
    await closeBrowser(browser);
  }
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);
