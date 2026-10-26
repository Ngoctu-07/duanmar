import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Checkout voucher section: collapsible cards + strict locale copy + empty state.
 *
 * A. Wallet renders one collapsible card per voucher and NO "No voucher" row.
 * B. Collapsed = code + discount + title only; the panel (description, expiry,
 *    apply action) only exists after a click.
 * C. Apply → payable drops by the CMS percentage; applying the other voucher
 *    replaces the first (no stacking); "Remove voucher" restores full price.
 * D. Localization: the two wallet rows are claimed with VIETNAMESE snapshots and
 *    point at real CMS promotions, so the EN page must show the EN titles and the
 *    EN badge (15% off) — never the snapshot language. The VI page shows VI.
 * E. Zero vouchers → localized empty state, in both languages.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const BASE = "http://localhost:3000";
const TOUR = "bangkok-tam-linh";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const email = `crt-voucher-${Date.now()}@example.test`;
const password = "crt-test-password-123";

/** Real CMS promotions (used by /deals) — the wallet snapshot below is VI. */
const PROMO_YOUTH = "887a63d7-58a3-409d-bc8a-5e77e92bdb69";
const PROMO_GANG = "718d6213-0b9d-44c8-9a05-b3279fadedcf";

let browser;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1000 } });
  const page = await getPage(browser);

  await page.evaluateOnNewDocument(() => {
    window.__readPrice = (testId) => {
      const root = document.querySelector(`[data-testid="${testId}"]`);
      if (!root) return null;
      const el = root.querySelector("dd") ?? root;
      const cleaned = (el.textContent ?? "").replace(/[^\d.]/g, "");
      return cleaned ? Number(cleaned) : null;
    };
    window.__card = (code) =>
      document.querySelector(`[data-testid="voucher-card"][data-voucher-code="${code}"]`);
    window.__expand = (code) => window.__card(code)?.querySelector("button")?.click();
    window.__panelAction = (code) => {
      const panel = window.__card(code)?.querySelector('[id^="voucher-panel-"]');
      return panel?.querySelector("button") ?? null;
    };
  });

  // --- seed: register a throwaway user through the API
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.evaluate(
    async ({ email, password }) => {
      const register = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "CRT Voucher Test", email, password }),
      });
      if (!register.ok) throw new Error(`register ${register.status}`);
    },
    { email, password }
  );

  // --- sign in through the real auth modal
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
  await page.waitForFunction(() => !document.querySelector("#auth-email"), { timeout: 20000 });

  // --- claim two vouchers, both snapshotted in Vietnamese
  await page.evaluate(
    async ({ promos }) => {
      for (const claim of promos) {
        const response = await fetch("/api/vouchers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...claim,
            title: claim.snapshotTitle,
            description: "Mô tả lưu lúc nhận voucher.",
            validUntil: "2030-12-31",
          }),
        });
        if (!response.ok) throw new Error(`claim ${claim.promotionId} ${response.status}`);
      }
    },
    {
      promos: [
        { promotionId: PROMO_YOUTH, promoCode: "CRTTEST10", badge: "GIẢM 10%", snapshotTitle: "ẢNH CHỤP TIẾNG VIỆT MỘT" },
        { promotionId: PROMO_GANG, promoCode: "CRTTEST20", badge: "GIẢM 20%", snapshotTitle: "ẢNH CHỤP TIẾNG VIỆT HAI" },
      ],
    }
  );

  // --- checkout (EN) with the wallet loaded server-side
  await page.goto(`${BASE}/en/booking/checkout?tour=${TOUR}`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await dismissPromo(page);

  const initial = await page.evaluate(() => {
    const voucher = document.querySelector('[data-testid="voucher-section"]');
    const pricing = document.querySelector("#booking-pricing-heading")?.closest("section");
    const voucherBox = voucher?.getBoundingClientRect();
    const pricingBox = pricing?.getBoundingClientRect();
    return {
      cards: document.querySelectorAll('[data-testid="voucher-card"]').length,
      radios: document.querySelectorAll('input[name="booking-voucher"]').length,
      noVoucherText: /no voucher/i.test(document.body.innerText),
      subtotal: window.__readPrice("price-subtotal"),
      panelHiddenByDefault: document.querySelector('[id^="voucher-panel-"]')?.hidden === true,
      voucherWidth: voucherBox?.width ?? null,
      voucherLeft: voucherBox?.left ?? null,
      pricingWidth: pricingBox?.width ?? null,
      pricingLeft: pricingBox?.left ?? null,
      titles: [...document.querySelectorAll('[data-testid="voucher-card"]')].map((card) =>
        (card.querySelector("button")?.innerText ?? "").replace(/\s+/g, " ").trim()
      ),
    };
  });

  check(
    "V0 voucher section is full width and aligns with the price breakdown",
    initial.voucherWidth !== null &&
      initial.pricingWidth !== null &&
      Math.abs(initial.voucherWidth - initial.pricingWidth) <= 0.5 &&
      Math.abs(initial.voucherLeft - initial.pricingLeft) <= 0.5,
    JSON.stringify({
      voucherWidth: initial.voucherWidth,
      pricingWidth: initial.pricingWidth,
      voucherLeft: initial.voucherLeft,
      pricingLeft: initial.pricingLeft,
    })
  );

  check("V1 wallet renders one collapsible card per voucher", initial.cards === 2, `cards=${initial.cards}`);
  check(
    "V1 no radio group and no explicit \"No voucher\" option",
    initial.radios === 0 && initial.noVoucherText === false,
    `radios=${initial.radios} noVoucher=${initial.noVoucherText}`
  );
  check("V2 checkout shows a subtotal", initial.subtotal !== null, `subtotal=${initial.subtotal}`);
  check("V3 nothing is expanded by default", initial.panelHiddenByDefault === true);
  check(
    "V3 collapsed header carries code + discount value + title",
    initial.titles.every((text) => /CRTTEST(10|20)/.test(text) && /15% off/i.test(text)),
    JSON.stringify(initial.titles)
  );

  // --- EN localization: CMS copy replaces the Vietnamese snapshots
  check(
    "V4 EN checkout shows the English CMS titles (no Vietnamese snapshot)",
    initial.titles.some((text) => /THE YOUTH GENERATION CODE/i.test(text)) &&
      initial.titles.some((text) => /THE EXPLORER GANG/i.test(text)) &&
      !initial.titles.some((text) => /ẢNH CHỤP|BĂNG ĐẢNG|THẾ HỆ/.test(text)),
    JSON.stringify(initial.titles)
  );
  check(
    "V4 EN discount badge comes from the EN CMS copy (15% off), not the snapshot (10%/20%)",
    initial.titles.every((text) => /15% off/i.test(text)),
    JSON.stringify(initial.titles)
  );

  // --- expand the first card: terms, expiry and the apply action appear
  await page.evaluate(() => window.__expand("CRTTEST10"));
  await sleep(200);
  const expanded = await page.evaluate(() => {
    const panel = window.__card("CRTTEST10")?.querySelector('[id^="voucher-panel-"]');
    const header = window.__card("CRTTEST10")?.querySelector("button");
    return {
      panel: panel !== null && panel.hidden === false,
      text: (panel?.innerText ?? "").replace(/\s+/g, " ").trim(),
      expandedAttr: header?.getAttribute("aria-expanded"),
      descriptionHiddenBefore: false,
    };
  });
  check(
    "V5 expanding a card reveals terms + expiry + apply action",
    expanded.panel &&
      expanded.text.length > 20 &&
      /valid until/i.test(expanded.text) &&
      /apply voucher/i.test(expanded.text),
    JSON.stringify(expanded).slice(0, 220)
  );
  check("V5 header reports aria-expanded=true", expanded.expandedAttr === "true", String(expanded.expandedAttr));

  // --- apply: 15% from the CMS badge
  await page.evaluate(() => window.__panelAction("CRTTEST10")?.click());
  await sleep(300);
  const applied = await page.evaluate(() => ({
    subtotal: window.__readPrice("price-subtotal"),
    payable: window.__readPrice("price-payable"),
    discount: window.__readPrice("price-discount"),
    summary: document.querySelector('[data-testid="voucher-applied"]')?.innerText ?? "",
    appliedBadges: [...document.querySelectorAll('[data-testid="voucher-card"]')].filter((card) =>
      /applied/i.test(card.querySelector("button")?.innerText ?? "")
    ).length,
  }));
  check(
    "V6 applying a voucher updates the payable by the CMS percentage (15%)",
    applied.subtotal !== null && Math.abs(applied.payable - applied.subtotal * 0.85) < 0.01,
    JSON.stringify(applied)
  );
  check(
    "V7 discount line equals the removed amount",
    Math.abs(applied.discount - (applied.subtotal - applied.payable)) < 0.01,
    JSON.stringify(applied)
  );
  check("V7 applied summary names the promo code", /CRTTEST10/.test(applied.summary), applied.summary);
  check("V7 applied card is marked as applied", applied.appliedBadges === 1, `badges=${applied.appliedBadges}`);

  // --- switch vouchers: replaces, never stacks
  await page.evaluate(() => window.__expand("CRTTEST20"));
  await sleep(200);
  await page.evaluate(() => window.__panelAction("CRTTEST20")?.click());
  await sleep(300);
  const switched = await page.evaluate(() => ({
    subtotal: window.__readPrice("price-subtotal"),
    payable: window.__readPrice("price-payable"),
    summary: document.querySelector('[data-testid="voucher-applied"]')?.innerText ?? "",
    appliedBadges: [...document.querySelectorAll('[data-testid="voucher-card"]')].filter((card) =>
      /applied/i.test(card.querySelector("button")?.innerText ?? "")
    ).length,
  }));
  check(
    "V8 second voucher replaces the first (single voucher, no stacking)",
    switched.appliedBadges === 1 &&
      /CRTTEST20/.test(switched.summary) &&
      Math.abs(switched.payable - switched.subtotal * 0.85) < 0.01,
    JSON.stringify(switched)
  );

  await page.screenshot({ path: `${OUT}/z-voucher-checkout-en.png`, fullPage: true });

  // --- remove the voucher: full price again, no discount line
  await page.evaluate(() => window.__panelAction("CRTTEST20")?.click());
  await sleep(300);
  const cleared = await page.evaluate(() => ({
    subtotal: window.__readPrice("price-subtotal"),
    payable: window.__readPrice("price-payable"),
    hasDiscount: document.querySelector('[data-testid="price-discount"]') !== null,
    summary: document.querySelector('[data-testid="voucher-applied"]') !== null,
  }));
  check(
    "V9 removing the applied voucher restores the full price (default = no voucher)",
    cleared.payable === cleared.subtotal && cleared.hasDiscount === false && cleared.summary === false,
    JSON.stringify(cleared)
  );

  // --- VI page: both cards switch to Vietnamese CMS copy
  await page.goto(`${BASE}/vi/booking/checkout?tour=${TOUR}`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await dismissPromo(page);
  const viTitles = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="voucher-card"]')].map((card) =>
      (card.querySelector("button")?.innerText ?? "").replace(/\s+/g, " ").trim()
    )
  );
  check(
    "V10 VI checkout shows the Vietnamese CMS titles + VI discount copy",
    viTitles.some((text) => /THẾ HỆ TRẺ/i.test(text)) &&
      viTitles.some((text) => /BĂNG ĐẢNG THÁM HIỂM/i.test(text)) &&
      viTitles.every((text) => /Giảm 15%/i.test(text)),
    JSON.stringify(viTitles)
  );

  // --- empty state: wipe the wallet, both languages
  const db = new DatabaseSync("data/article-likes.db");
  db.exec("PRAGMA busy_timeout = 5000");
  const userRow = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (userRow?.id) db.prepare("DELETE FROM vouchers WHERE user_id = ?").run(userRow.id);
  db.close();

  await page.goto(`${BASE}/vi/booking/checkout?tour=${TOUR}`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await dismissPromo(page);
  const viEmpty = await page.evaluate(() => ({
    shown: document.querySelector('[data-testid="voucher-empty"]')?.innerText ?? "",
    cards: document.querySelectorAll('[data-testid="voucher-card"]').length,
  }));
  check(
    "V11 empty wallet shows \"Bạn chưa có voucher nào\" (VI)",
    /Bạn chưa có voucher nào/.test(viEmpty.shown) && viEmpty.cards === 0,
    JSON.stringify(viEmpty)
  );

  await page.goto(`${BASE}/en/booking/checkout?tour=${TOUR}`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await dismissPromo(page);
  const enEmpty = await page.evaluate(
    () => document.querySelector('[data-testid="voucher-empty"]')?.innerText ?? ""
  );
  check("V11 empty wallet shows \"You have no available vouchers\" (EN)", /You have no available vouchers/.test(enEmpty), enEmpty);

  await page.screenshot({ path: `${OUT}/z-voucher-checkout-empty.png`, fullPage: true });
} catch (error) {
  check("verification script completed", false, String(error?.stack ?? error));
} finally {
  if (browser) await closeBrowser();
  try {
    const db = new DatabaseSync("data/article-likes.db");
    db.exec("PRAGMA busy_timeout = 5000");
    db.prepare("DELETE FROM users WHERE email = ?").run(email);
    db.close();
  } catch {
    // Best effort — a leftover test user cannot break the app.
  }
}

console.log(results.join("\n"));
const failed = results.filter((line) => line.startsWith("FAIL"));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
