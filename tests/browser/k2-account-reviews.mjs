import { dismissPromo } from "../helpers/promo.mjs";
import { signInReviewOwner } from "../helpers/auth-session.mjs";

/**
 * Account panel regression: the Reviews / rating-history tab was removed.
 * A. `/account` exposes exactly Profile + Voucher wallet, no Reviews tab.
 * B. No review cards or customer-reviews section render inside the panel.
 * C. The old `?tab=reviews` deep link no longer switches tabs (falls back to Profile).
 */

const { getBrowser, getPage, closeBrowser } = await import(
  new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url).href
);

const BASE = "http://localhost:3000";
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const snapshot = (page) =>
  page.evaluate(() => ({
    tabs: [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent?.trim()),
    selected: [...document.querySelectorAll('[role="tab"]')]
      .find((tab) => tab.getAttribute("aria-selected") === "true")
      ?.textContent?.trim(),
    reviewCards: document.querySelectorAll('[data-testid="review-card"]').length,
    reviewSection: Boolean(document.getElementById("customer-reviews")),
  }));

let browser;
let page;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1000 } });
  page = await getPage(browser);
  await signInReviewOwner(page);

  await page.goto(`${BASE}/vi/account`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.waitForFunction(
    () => document.querySelectorAll('[role="tab"]').length > 0,
    { timeout: 20000 }
  );

  const base = await snapshot(page);
  check(
    "A1 account shows exactly Profile + Voucher wallet",
    base.tabs.length === 2 &&
      base.tabs[0] === "Hồ sơ" &&
      base.tabs[1] === "Ví voucher",
    JSON.stringify(base.tabs)
  );
  check("A2 no Reviews tab remains", !base.tabs.includes("Đánh giá"), JSON.stringify(base.tabs));
  check(
    "B1 no review cards or reviews section inside the account panel",
    base.reviewCards === 0 && base.reviewSection === false,
    JSON.stringify(base)
  );

  await page.goto(`${BASE}/vi/account?tab=reviews`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await dismissPromo(page);
  await page.waitForFunction(
    () => document.querySelectorAll('[role="tab"]').length > 0,
    { timeout: 20000 }
  );
  const deepLink = await snapshot(page);
  check(
    "C1 legacy ?tab=reviews deep link falls back to Profile",
    deepLink.selected === "Hồ sơ" && deepLink.reviewCards === 0,
    JSON.stringify(deepLink)
  );
} catch (error) {
  check("verification script completed", false, String(error?.stack ?? error));
} finally {
  if (browser) await closeBrowser(browser);
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);
