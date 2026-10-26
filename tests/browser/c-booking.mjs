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
 * Live destination slugs — powers the B13 subject pick (a tour with an
 * authored pricing doc so the paid-record branch can run).
 */
async function fetchDestinations() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing");
  const query = '*[_type == "destination"]{ "slug": slug.current, name }';
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}` +
    `?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const json = await res.json();
  return (json.result ?? []).filter((d) => Boolean(d.slug));
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
  // Published CMS docs = source of truth; the subject tour is live-driven so a
  // CMS publish/removal never silently breaks this test.
  const dests = await fetchDestinations();
  const pricingSlugs = await fetchPricingSlugs();
  const primary =
    dests.find((destination) => pricingSlugs.includes(destination.slug)) ??
    dests[0];
  if (!primary) throw new Error("c-booking needs at least one live destination");
  const slug = primary.slug;
  const tourName = primary.name;
  const cmsDoc = await fetchTourPricing(slug);
  const bd = (n) => expectedBreakdown(cmsDoc, n);

  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1100 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // --- B6: button on detail page
  await page.goto(`http://localhost:3000/vi/explore/destinations/${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const btn = await page.$(`a[href="/vi/booking/checkout?tour=${slug}"]`);
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
  await page.goto(`http://localhost:3000/vi/booking/checkout?tour=${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const headings = await page.$$eval("section h2", (els) => els.map((e) => e.textContent.trim()));
  check(
    "B7 five sections (booking form)",
    headings.length === 5,
    JSON.stringify(headings)
  );
  check("B7 section 1 contact", headings[0]?.startsWith("1. Thông tin liên hệ"), headings[0]);
  check("B7 section 2 travel date", headings[1]?.startsWith("2. Ngày khởi hành"), headings[1]);
  check("B7 section 3 pricing", headings[2]?.startsWith("3. Số khách"), headings[2]);
  check("B7 section 4 difficulty", headings[3]?.startsWith("4. Chọn độ khó"), headings[3]);
  check("B7 section 5 voucher", headings[4]?.startsWith("5. Áp dụng ưu đãi"), headings[4]);
  const difficultyGroup = await page.$('[role="radiogroup"]#booking-difficulty');
  const difficultyOptions = await page.$$('[data-testid="booking-difficulty-option"]');
  check(
    "B7 exactly 3 interactive difficulty cards",
    Boolean(difficultyGroup) && difficultyOptions.length === 3,
    `group=${Boolean(difficultyGroup)} options=${difficultyOptions.length}`
  );
  const renderedTourName = await page.$eval("h1 + p", (el) => el.textContent.trim());
  check("B7 tour name shown", renderedTourName === tourName, renderedTourName);

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
    "B9 empty submit shows 5 inline errors (difficulty included)",
    errorTexts.length === 5 && errorTexts.some((text) => text.includes("độ khó")),
    JSON.stringify(errorTexts)
  );
  check("B9 aria-invalid set", (await page.$$('input[aria-invalid="true"]')).length >= 3);

  // Pick a difficulty so the remaining assertions isolate format errors.
  await page.click('[data-difficulty="Medium"]');
  await sleep(120);
  const checkedDifficulty = await page.$eval(
    '[data-difficulty="Medium"]',
    (el) => el.getAttribute("aria-checked")
  );
  check("B9 difficulty card is selectable", checkedDifficulty === "true", checkedDifficulty);

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
    "B9 invalid email + phone + date flagged",
    invalid.length === 3,
    JSON.stringify(invalid)
  );

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
    check("B9 summary has reference + tour + total", values.some((v) => v.startsWith("VN-")) && values.includes(tourName), JSON.stringify(values));
    check(
      "B9 summary shows the selected difficulty",
      values.some((v) => v === "Trung bình"),
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

  // --- B13: the difficulty step is universal and traveller-selected.
  check(
    "B13 live destination exists",
    dests.length > 0,
    JSON.stringify(dests)
  );
  if (dests.length === 0) throw new Error("B13 needs a destination in the CMS");
  const b13Slug = dests.find((destination) => pricingSlugs.includes(destination.slug))?.slug ?? dests[0].slug;
  const b13HasPricing = pricingSlugs.includes(b13Slug);
  await page.goto(`http://localhost:3000/vi/booking/checkout?tour=${b13Slug}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  // Self-healing: drop any leftover record for this slug from an earlier crashed run.
  await page.evaluate((slug) => {
    try {
      const key = "vn-my-trips:v1";
      const list = JSON.parse(localStorage.getItem(key) || "[]").filter((r) => r.slug !== slug);
      localStorage.setItem(key, JSON.stringify(list));
    } catch { /* storage unavailable */ }
  }, b13Slug);
  const stdHeadings = await page.$$eval("section h2", (els) => els.map((e) => e.textContent.trim()));
  const stdDifficulty = await page.$('[role="radiogroup"]#booking-difficulty');
  check(
    `B13 ${b13Slug}: 5 sections incl. difficulty step`,
    stdHeadings.length === 5 && Boolean(stdDifficulty),
    JSON.stringify(stdHeadings)
  );
  await page.click('button[type="submit"]');
  await sleep(200);
  const stdErrors = await page.$$eval('[id$="-error"]', (els) => els.map((e) => e.textContent.trim()));
  check(
    `B13 ${b13Slug}: empty submit → 5 errors incl. difficulty`,
    stdErrors.length === 5 && stdErrors.some((t) => t.includes("độ khó")),
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
  await page.click('[data-difficulty="Hard"]');
  await sleep(200);
  await page.click('button[type="submit"]');
  await sleep(400);
  const stdSummary = await page.$("#booking-summary-heading");
  check("B13 valid submit → summary", Boolean(stdSummary));
  if (stdSummary) {
    const summaryLabels = await page.$$eval("dl dt", (els) => els.map((e) => e.textContent.trim()));
    check(
      `B13 ${b13Slug}: summary shows the selected difficulty`,
      summaryLabels.includes("Độ khó"),
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
      `B13 ${b13Slug}: paid record stores the selected difficulty`,
      Boolean(stdRecord) && stdRecord.difficulty === "Hard",
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
  await page.goto(`http://localhost:3000/vi/booking/checkout?tour=${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await fill("#booking-full-name", "Nguyen Van A");
  await fill("#booking-email", "lena@example.com");
  await fill("#booking-phone", "0912345678");
  const form = await page.$("form");
  await form.screenshot({ path: `${OUT}/booking-b12-form.png` });

  await page.goto(`http://localhost:3000/en/booking/checkout?tour=${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const enHeadings = await page.$$eval("section h2", (els) => els.map((e) => e.textContent.trim()));
  check(
    "B11 EN headings localized",
    enHeadings[0] === "1. Contact information" && enHeadings.length === 5,
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
