import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expectedBreakdown, fetchTourPricing, fmtVnd } from "../helpers/cms-expectations.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

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

  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1100 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // --- B6: button on detail page
  await page.goto("http://localhost:3000/vi/explore/destinations/hcm", { waitUntil: "networkidle2", timeout: 60000 });
  const btn = await page.$('a[href="/vi/booking/checkout?tour=hcm"]');
  check("B6 button exists with checkout href", Boolean(btn));
  if (btn) {
    const text = (await btn.evaluate((el) => el.textContent)).trim();
    check("B6 button label is Đặt vé", text.includes("Đặt vé"), text);
    await btn.scrollIntoView();
    await btn.screenshot({ path: `${OUT}/booking-b6-button.png` });
  }
  const oldBtn = await page.$("button[aria-pressed]");
  check("B6 old Add-to-trip toggle gone", !oldBtn);

  // --- B7: checkout sections
  await page.goto("http://localhost:3000/vi/booking/checkout?tour=hcm", { waitUntil: "networkidle2", timeout: 60000 });
  const headings = await page.$$eval("section h2", (els) => els.map((e) => e.textContent.trim()));
  check("B7 four sections", headings.length === 4, JSON.stringify(headings));
  check("B7 section 1 contact", headings[0]?.startsWith("1. Thông tin liên hệ"), headings[0]);
  check("B7 section 2 travel date", headings[1]?.startsWith("2. Ngày khởi hành"), headings[1]);
  check("B7 section 3 pricing", headings[2]?.startsWith("3. Số khách"), headings[2]);
  check("B7 section 4 difficulty", headings[3]?.startsWith("4. Mức độ"), headings[3]);
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
  check("B9 empty submit shows 5 inline errors", errorTexts.length === 5, JSON.stringify(errorTexts));
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
  check("B9 invalid email + phone + difficulty + date flagged", invalid.length === 4, JSON.stringify(invalid));

  // difficulty select
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
    check("B9 summary keeps difficulty", values.includes("Trung bình"), JSON.stringify(values));
    const summarySection = await page.$("section:has(#booking-summary-heading)");
    if (summarySection) {
      await summarySection.screenshot({ path: `${OUT}/booking-b9-summary.png` });
    }
  }

  // --- B10: no pricing doc
  await page.goto("http://localhost:3000/vi/booking/checkout?tour=ha-noi", { waitUntil: "networkidle2", timeout: 60000 });
  const status404 = (await page.content()).includes("404") || (await page.title()).toLowerCase().includes("404");
  check("B10 unknown tour → 404", status404, await page.title());

  // --- screenshots of form
  await page.goto("http://localhost:3000/vi/booking/checkout?tour=hcm", { waitUntil: "networkidle2", timeout: 60000 });
  await fill("#booking-full-name", "Nguyen Van A");
  await fill("#booking-email", "lena@example.com");
  await fill("#booking-phone", "0912345678");
  const form = await page.$("form");
  await form.screenshot({ path: `${OUT}/booking-b12-form.png` });

  await page.goto("http://localhost:3000/en/booking/checkout?tour=hcm", { waitUntil: "networkidle2", timeout: 60000 });
  const enHeadings = await page.$$eval("section h2", (els) => els.map((e) => e.textContent.trim()));
  check("B11 EN headings localized", enHeadings[0] === "1. Contact information" && enHeadings.length === 4, JSON.stringify(enHeadings));
} catch (e) {
  errors.push(`exception: ${e.message}`);
} finally {
  await closeBrowser();
}

console.log(results.join("\n"));
if (errors.length) console.log("\nERRORS:\n" + errors.join("\n"));
process.exit(errors.length ? 1 : 0);
