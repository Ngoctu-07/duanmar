import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expectedBreakdown, fetchTourPricing, fmtVnd } from "../helpers/cms-expectations.mjs";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const vi = JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8"));

/** Self-contained env reader (same pattern as tests/helpers/cms-expectations.mjs). */
function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

/**
 * Live isSpecialTour flag for a slug: decides whether the booking form shows
 * Section 4 (Challenge Level) — data-driven, so flipping the flag in Studio
 * flips this test's contract automatically.
 */
async function fetchSpecialTour(slug) {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing");
  const query = `*[_type == "destination" && slug.current == "${slug}"][0].isSpecialTour`;
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}` +
    `?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const json = await res.json();
  return json.result === true;
}

/** Live destination flags [{slug, special}] — powers the B13 subject pick. */
async function fetchDestinations() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing");
  const query =
    '*[_type == "destination"]{ "slug": slug.current, isSpecialTour }';
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}` +
    `?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const json = await res.json();
  return (json.result ?? []).map((d) => ({ slug: d.slug, special: d.isSpecialTour === true }));
}

/** Live slugs that have a pricing doc (payment UI + totals require one). */
async function fetchPricingSlugs() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing");
  const query = '*[_type == "tourPricing"].tourSlug';
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}` +
    `?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const json = await res.json();
  return (json.result ?? []).filter(Boolean);
}

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];

const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

try {
  // Published CMS doc = source of truth; totals are derived, not hardcoded,
  // so a Studio publish (plan 260927-1645) never silently breaks this test.
  const cmsDoc = await fetchTourPricing("hcm");
  const bd = (n) => expectedBreakdown(cmsDoc, n);
  const SPECIAL = await fetchSpecialTour("hcm");

  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1100 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // --- B6: button on detail page
  await page.goto("http://localhost:3000/vi/explore/destinations/hcm", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const btn = await page.$('a[href="/vi/booking/checkout?tour=hcm"]');
  check("B6 button exists with checkout href", Boolean(btn));
  if (btn) {
    const text = (await btn.evaluate((el) => el.textContent)).trim();
    check("B6 button label is Đặt vé", text.includes("Đặt vé"), text);
    await btn.scrollIntoView();
    await btn.screenshot({ path: `${OUT}/booking-b6-button.png` });
  }
  // Review star toggles also use aria-pressed; the old add-to-trip toggle did not.
  const oldBtns = await page.$$eval("button[aria-pressed]", (els) =>
    els.filter((el) => !el.closest("#customer-reviews"))
  );
  check("B6 old Add-to-trip toggle gone", oldBtns.length === 0);

  // --- B7: checkout sections
  await page.goto("http://localhost:3000/vi/booking/checkout?tour=hcm", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const headings = await page.$$eval("section h2", (els) => els.map((e) => e.textContent.trim()));
  check(
    SPECIAL ? "B7 four sections (special tour)" : "B7 three sections (standard tour)",
    headings.length === (SPECIAL ? 4 : 3),
    JSON.stringify(headings)
  );
  check("B7 section 1 contact", headings[0]?.startsWith("1. Thông tin liên hệ"), headings[0]);
  check("B7 section 2 travel date", headings[1]?.startsWith("2. Ngày khởi hành"), headings[1]);
  check("B7 section 3 pricing", headings[2]?.startsWith("3. Số khách"), headings[2]);
  const difficultyField = await page.$("#booking-difficulty");
  if (SPECIAL) {
    check("B7 section 4 difficulty", headings[3]?.startsWith("4. Mức độ"), headings[3]);
    check("B7 difficulty field shown (special tour)", Boolean(difficultyField));
  } else {
    check("B7 difficulty field absent (standard tour)", !difficultyField);
  }
  const tourName = await page.$eval("h1 + p", (el) => el.textContent.trim());
  check("B7 tour name shown", tourName === "HCM", tourName);

  const setGuests = async (value) => {
    await page.$eval("#booking-guests", (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, String(value));
    await sleep(120);
  };
  const pricingText = async () => {
    const raw = await page.$eval("#booking-pricing-heading", (el) => el.closest("section").textContent);
    return raw.replace(/ /g, " ");
  };

  // --- B8: live total = published CMS tier × guests (freshness contract)
  // Counts above the 99 cap are unsubmittable → no fabricated total (review m5).
  await setGuests(100000);
  let text = await pricingText();
  check(
    "B8 guests above the 99 cap get no total",
    !text.includes(fmtVnd(bd(100000).rate * 100000)),
    text.slice(-120)
  );

  await setGuests(99);
  text = await pricingText();
  const bd99 = bd(99);
  check("B8 99 guests total = CMS tier rate × 99", text.includes(bd99.totalText), text.slice(-120));
  check("B8 breakdown shows CMS per-guest rate", text.includes(`${bd99.rateText} × 99`), text.slice(-160));

  await setGuests(300000);
  text = await pricingText();
  check(
    "B8 over-cap input still shows no total",
    !text.includes(fmtVnd(bd(300000).rate * 300000)),
    text.slice(-120)
  );

  await setGuests(2);
  text = await pricingText();
  check("B8 2 guests → CMS tier 1 total", text.includes(bd(2).totalText), text.slice(-120));
  check("B8 no quote placeholder", !text.includes("Liên hệ để nhận báo giá"), text.slice(-120));

  // --- B9: validation
  await page.$eval("#booking-full-name", (el) => {
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    s.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.click('button[type="submit"]');
  await sleep(200);
  const errorTexts = await page.$$eval('[id$="-error"]', (els) => els.map((e) => e.textContent.trim()));
  check(
    SPECIAL ? "B9 empty submit shows 5 inline errors" : "B9 empty submit shows 4 inline errors",
    errorTexts.length === (SPECIAL ? 5 : 4),
    JSON.stringify(errorTexts)
  );
  check("B9 aria-invalid set", (await page.$$('input[aria-invalid="true"]')).length >= 3);

  // invalid formats
  const fill = async (selector, value) => {
    await page.$eval(selector, (el, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    await sleep(60);
  };
  await fill("#booking-full-name", "Nguyen Van A");
  await fill("#booking-email", "not-an-email");
  await fill("#booking-phone", "abc");
  await page.click('button[type="submit"]');
  await sleep(200);
  const invalid = await page.$$eval('[id$="-error"]', (els) => els.map((e) => e.textContent.trim()));
  check(
    SPECIAL
      ? "B9 invalid email + phone + difficulty + date flagged"
      : "B9 invalid email + phone + date flagged",
    invalid.length === (SPECIAL ? 4 : 3),
    JSON.stringify(invalid)
  );

  // difficulty select (only rendered on special tours)
  if (SPECIAL) {
    await page.click("#booking-difficulty");
    await sleep(300);
    const option = await page.evaluateHandle(() =>
      [...document.querySelectorAll('[role="option"], li')].find((el) =>
        el.textContent.includes("Trung bình")
      )
    );
    const optionEl = option.asElement();
    check("B9 difficulty options open", Boolean(optionEl));
    if (optionEl) {
      await optionEl.click();
      await sleep(200);
      const chosen = await page.$eval("#booking-difficulty", (el) => el.textContent.trim());
      check("B9 difficulty selected", chosen.includes("Trung bình"), chosen);
    }
  }

  // valid submit — pick tomorrow in the calendar first (required travel date)
  await fill("#booking-email", "lena@example.com");
  await fill("#booking-phone", "0912345678");
  await page.type("#booking-notes", "Đón lúc 8h tại khách sạn");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  await page.click(`td[data-day="${iso}"] button`);
  await sleep(200);
  await page.click('button[type="submit"]');
  await sleep(400);
  const summary = await page.$("#booking-summary-heading");
  check("B9 valid submit → summary", Boolean(summary));
  if (summary) {
    const values = await page.$$eval("dl dd", (els) => els.map((e) => e.textContent.trim()));
    check("B9 summary has reference + tour + total", values.some((v) => v.startsWith("VN-")) && values.includes("HCM"), JSON.stringify(values));
    check(
      SPECIAL ? "B9 summary keeps difficulty" : "B9 summary omits difficulty",
      SPECIAL
        ? values.includes("Trung bình")
        : !values.some((v) => v === "Trung bình"),
      JSON.stringify(values)
    );
    const summarySection = await page.$("section:has(#booking-summary-heading)");
    if (summarySection) {
      await summarySection.screenshot({ path: `${OUT}/booking-b9-summary.png` });
    }
  }

  // --- B10: no pricing doc
  await page.goto("http://localhost:3000/vi/booking/checkout?tour=ha-noi", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const status404 = (await page.content()).includes("404") || (await page.title()).toLowerCase().includes("404");
  check("B10 unknown tour → 404", status404, await page.title());

  // --- B13: non-special branch — the Challenge Level field must be gone,
  // its validation rule never fires, and the paid record carries no
  // difficulty key (AC3). Subject slug is live-driven: the previous hardcoded
  // `hcmc` destination was removed from the CMS (2026-09-29), so pick the
  // first non-special destination from the real dataset instead of a stale id.
  const dests = await fetchDestinations();
  const nonSpecial = dests.filter((d) => d.special !== true).map((d) => d.slug).sort();
  check(
    "B13 live non-special destination exists",
    nonSpecial.length > 0,
    JSON.stringify(dests)
  );
  if (nonSpecial.length === 0) throw new Error("B13 needs a non-special destination in the CMS");
  const pricingSlugs = await fetchPricingSlugs();
  const b13Slug =
    nonSpecial.find((slug) => pricingSlugs.includes(slug)) ?? nonSpecial[0];
  const b13HasPricing = pricingSlugs.includes(b13Slug);
  const b13Special = dests.find((d) => d.slug === b13Slug)?.special === true;
  await page.goto(`http://localhost:3000/vi/booking/checkout?tour=${b13Slug}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  // Self-healing: drop any leftover record for this slug from an earlier crashed run.
  await page.evaluate((slug) => {
    try {
      const key = "vn-my-trips:v1";
      const list = JSON.parse(localStorage.getItem(key) || "[]").filter((r) => r.slug !== slug);
      localStorage.setItem(key, list);
    } catch { /* storage unavailable */ }
  }, b13Slug);
  const stdHeadings = await page.$$eval("section h2", (els) => els.map((e) => e.textContent.trim()));
  const stdDifficulty = await page.$("#booking-difficulty");
  check(
    b13Special ? `B13 special ${b13Slug}: 4 sections + difficulty field` : `B13 standard ${b13Slug}: 3 sections, no difficulty field`,
    b13Special
      ? stdHeadings.length === 4 && Boolean(stdDifficulty)
      : stdHeadings.length === 3 && !stdDifficulty,
    JSON.stringify(stdHeadings)
  );
  await page.click('button[type="submit"]');
  await sleep(200);
  const stdErrors = await page.$$eval('[id$="-error"]', (els) => els.map((e) => e.textContent.trim()));
  check(
    b13Special ? `B13 special ${b13Slug}: empty submit → 5 errors` : `B13 standard ${b13Slug}: empty submit → 4 errors, no difficulty rule`,
    b13Special
      ? stdErrors.length === 5
      : stdErrors.length === 4 && !stdErrors.some((t) => t.includes("độ khó")),
    JSON.stringify(stdErrors)
  );

  // Full valid submit + mock payment → inspect the persisted record shape.
  await fill("#booking-full-name", "Nguyen Van B");
  await fill("#booking-email", "b@c.co");
  await fill("#booking-phone", "0912345678");
  const stdTomorrow = new Date();
  stdTomorrow.setDate(stdTomorrow.getDate() + 1);
  const stdIso = `${stdTomorrow.getFullYear()}-${String(stdTomorrow.getMonth() + 1).padStart(2, "0")}-${String(stdTomorrow.getDate()).padStart(2, "0")}`;
  await page.click(`td[data-day="${stdIso}"] button`);
  await sleep(200);
  await page.click('button[type="submit"]');
  await sleep(400);
  const stdSummary = await page.$("#booking-summary-heading");
  check("B13 valid submit → summary", Boolean(stdSummary));
  if (stdSummary) {
    const summaryLabels = await page.$$eval("dl dt", (els) => els.map((e) => e.textContent.trim()));
    check(
      b13Special ? `B13 special ${b13Slug}: summary keeps difficulty row` : `B13 standard ${b13Slug}: summary omits difficulty row`,
      b13Special
        ? summaryLabels.includes("Độ khó")
        : !summaryLabels.includes("Độ khó"),
      JSON.stringify(summaryLabels)
    );
  }
  if (b13HasPricing) {
    await page.click('input[name="payment-method"][value="momo"]');
    await sleep(3400); // mock webhook VERIFY_DELAY_MS (3000) + buffer
    const stdRecord = await page.evaluate((slug) => {
      try {
        const list = JSON.parse(localStorage.getItem("vn-my-trips:v1") || "[]");
        return list.find((r) => r.slug === slug) ?? null;
      } catch { return null; }
    }, b13Slug);
    check(
      b13Special
        ? `B13 special ${b13Slug}: paid record carries difficulty string`
        : `B13 standard ${b13Slug}: paid record has no difficulty key`,
      Boolean(stdRecord) &&
        (b13Special
          ? typeof stdRecord.difficulty === "string"
          : !("difficulty" in stdRecord)),
      JSON.stringify(stdRecord)
    );
  } else {
    // P4 contract (no authored price → don't invent one): no payment UI,
    // nothing persisted — truthful branch until a pricing doc exists for
    // this tour (prefer adding pricing for dn/nyc in Studio to activate
    // the full paid-record branch above).
    const payHeading = await page.$("#booking-payment-heading");
    const noteShown = await page.evaluate(
      (text) => document.body.innerText.includes(text),
      vi.booking.priceMissingNote
    );
    check(
      `B13 ${b13Slug}: no pricing doc → price-missing note instead of payment UI`,
      !payHeading && noteShown,
      JSON.stringify({ payHeading: Boolean(payHeading), noteShown })
    );
    const noRecord = await page.evaluate((slug) => {
      try {
        const list = JSON.parse(localStorage.getItem("vn-my-trips:v1") || "[]");
        return list.find((r) => r.slug === slug) ?? null;
      } catch { return null; }
    }, b13Slug);
    check(
      `B13 ${b13Slug}: no paid record persisted without a price`,
      noRecord === null,
      JSON.stringify(noRecord)
    );
  }
  // Cleanup so shared-profile My Trips tests stay deterministic.
  await page.evaluate((slug) => {
    try {
      const key = "vn-my-trips:v1";
      const list = JSON.parse(localStorage.getItem(key) || "[]").filter((r) => r.slug !== slug);
      localStorage.setItem(key, JSON.stringify(list));
    } catch { /* storage unavailable */ }
  }, b13Slug);

  // --- screenshots of form
  await page.goto("http://localhost:3000/vi/booking/checkout?tour=hcm", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await fill("#booking-full-name", "Nguyen Van A");
  await fill("#booking-email", "lena@example.com");
  await fill("#booking-phone", "0912345678");
  const form = await page.$("form");
  await form.screenshot({ path: `${OUT}/booking-b12-form.png` });

  await page.goto("http://localhost:3000/en/booking/checkout?tour=hcm", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const enHeadings = await page.$$eval("section h2", (els) => els.map((e) => e.textContent.trim()));
  check(
    "B11 EN headings localized",
    enHeadings[0] === "1. Contact information" &&
      enHeadings.length === (SPECIAL ? 4 : 3),
    JSON.stringify(enHeadings)
  );
} catch (e) {
  errors.push(`exception: ${e.message}`);
} finally {
  await closeBrowser();
}

console.log(results.join("\n"));
if (errors.length) console.log("\nERRORS:\n" + errors.join("\n"));
process.exit(errors.length ? 1 : 0);
