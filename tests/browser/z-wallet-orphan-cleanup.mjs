import { dismissPromo } from "../helpers/promo.mjs";
import {
  countVoucherRowsForEmail,
  deleteUserByEmail,
  insertVoucherForEmail,
} from "../helpers/test-db.mjs";

/**
 * Wallet orphan cleanup (end-to-end).
 *
 * A. A claimed voucher whose master promotion was deleted (published CMS read
 *    returns nothing) must NOT render in "Ví voucher".
 * B. Loading the dashboard must permanently delete that orphaned row.
 * C. A sibling voucher whose master still exists must render and survive.
 *
 * The fixture rows are inserted directly into the same DB `next dev` uses
 * (Turso or local, via the shared test-db helper), because the public API can
 * only claim live promotions.
 */

const { getBrowser, getPage, closeBrowser } = await import(
  new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url).href
);

const BASE = "http://localhost:3000";
/** Live promo used by the checkout test; its wallet row must survive. */
const LIVE_PROMO = "887a63d7-58a3-409d-bc8a-5e77e92bdb69";
const LIVE_CODE = "LIVEKEEP1";
const ORPHAN_CODE = "ORPHANGONE1";
const ORPHAN_TITLE = "DELETED MASTER ORPHAN";
const ORPHAN_PROMO = `orphan-${Date.now()}`;
const email = `crt-wallet-orphan-${Date.now()}@example.test`;
const password = "crt-test-password-123";

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

let browser;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1000 } });
  const page = await getPage(browser);

  // --- throwaway account (same flow as the checkout wallet test)
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.evaluate(
    async ({ email, password }) => {
      const register = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Wallet Orphan Test", email, password }),
      });
      if (!register.ok) throw new Error(`register ${register.status}`);
    },
    { email, password }
  );

  await page.goto(`${BASE}/en/account`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) =>
      (el.textContent ?? "").toLowerCase().includes("sign in")
    );
    button?.click();
  });
  await page.waitForSelector("#auth-email", { timeout: 10000 });
  await page.type("#auth-email", email);
  await page.type("#auth-password", password);
  await page.click('form button[type="submit"]');
  await page.waitForFunction(
    async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await response.json();
      return Boolean(session?.user?.id);
    },
    { timeout: 30000 }
  );

  // --- seed one live row + one orphaned row (master ID does not exist in CMS)
  const claimedAt = new Date().toISOString();
  await insertVoucherForEmail(email, {
    id: `live-${Date.now()}`,
    promotionId: LIVE_PROMO,
    code: LIVE_CODE,
    title: "Live snapshot",
    claimedAt,
  });
  await insertVoucherForEmail(email, {
    id: `orphan-${Date.now()}`,
    promotionId: ORPHAN_PROMO,
    code: ORPHAN_CODE,
    title: ORPHAN_TITLE,
    claimedAt,
  });
  const seededOrphans = await countVoucherRowsForEmail(email, ORPHAN_PROMO);
  check("A0 fixture: orphan row exists before dashboard load", seededOrphans === 1, `rows=${seededOrphans}`);

  // --- JSON API must filter too, but stay read-only (no purge on GET)
  const apiView = await page.evaluate(async () => {
    const response = await fetch("/api/vouchers", { cache: "no-store" });
    const body = await response.json();
    return { status: response.status, codes: (body.vouchers ?? []).map((row) => row.code) };
  });
  check(
    "A0b GET /api/vouchers filters the orphan but does not purge it",
    apiView.status === 200 &&
      apiView.codes.includes(LIVE_CODE) &&
      !apiView.codes.includes(ORPHAN_CODE),
    JSON.stringify(apiView)
  );
  const orphansAfterApi = await countVoucherRowsForEmail(email, ORPHAN_PROMO);
  check("A0c GET /api/vouchers is read-only", orphansAfterApi === 1, `rows=${orphansAfterApi}`);

  // --- dashboard retrieval is the cleanup point
  await page.goto(`${BASE}/vi/account`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.waitForFunction(
    () => document.querySelectorAll('[role="tab"]').length > 0,
    { timeout: 20000 }
  );
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('[role="tab"]')].find((el) =>
      (el.textContent ?? "").includes("Ví voucher")
    );
    tab?.click();
  });
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="wallet-voucher"]').length > 0,
    { timeout: 20000 }
  );

  const rendered = await page.evaluate(() => ({
    cards: [...document.querySelectorAll('[data-testid="wallet-voucher"]')].map(
      (el) => el.innerText
    ),
    body: document.body.innerText,
  }));
  check(
    "A1 live-master voucher still renders in the wallet",
    rendered.cards.length === 1 && rendered.cards[0].includes(LIVE_CODE),
    JSON.stringify(rendered.cards)
  );
  check(
    "A2 orphaned voucher is stripped from the rendered wallet",
    !rendered.body.includes(ORPHAN_CODE) && !rendered.body.includes(ORPHAN_TITLE),
    JSON.stringify(rendered.cards)
  );

  const orphansAfter = await countVoucherRowsForEmail(email, ORPHAN_PROMO);
  const liveAfter = await countVoucherRowsForEmail(email, LIVE_PROMO);
  check(
    "B1 orphaned row is permanently purged from the database",
    orphansAfter === 0,
    `rows=${orphansAfter}`
  );
  check("C1 live-master row is kept", liveAfter === 1, `rows=${liveAfter}`);
} catch (error) {
  check("verification script completed", false, String(error?.stack ?? error));
} finally {
  if (browser) await closeBrowser(browser);
  try {
    await deleteUserByEmail(email);
  } catch {
    // Best effort — a leftover test user cannot break the app.
  }
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} check(s) failed: ${errors.join(", ")}`);
  process.exit(1);
}
console.log("\nall wallet-orphan checks passed");
