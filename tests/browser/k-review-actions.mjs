import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const M = JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8"))
  .destinations.reviews;

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const TOUR_URL = "http://localhost:3000/vi/explore/destinations/hcm";
const REVIEWS_KEY = "vn-reviews:v1";
const BOOKINGS_KEY = "vn-my-trips:v1";
const PROBE_REF = "VN-K-REVIEW";
const ORPHAN_REF = "VN-K-OTHER";
const SECTION = "#customer-reviews";
const CARD = '[data-testid="review-card"]';
const TRIGGER = '[data-testid="review-actions-trigger"]';
const MENU = '[data-testid="review-actions-menu"]';
const EDIT = '[data-testid="review-actions-edit"]';
const DELETE = '[data-testid="review-actions-delete"]';
const FORM = `${SECTION} [data-testid="write-review-form"]`;
const BADGE = '[data-testid="tour-rating-badge"]';

const results = [];
const errors = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const booking = () => ({
  reference: PROBE_REF, slug: "hcm", tourName: "Saigon", travelDate: "2026-10-05",
  fullName: "K Owner", email: "kowner@example.com", phone: "0900000000", notes: "",
  guests: 1, difficulty: "easy", pricePerGuest: null, total: null, currency: "VND",
  locale: "vi", paidAt: new Date().toISOString(),
});
const review = (ref, authorName, ageMs, rating) => ({
  reference: `${ref}:hcm`, tourSlug: "hcm", authorName,
  authorEmail: `${ref.toLowerCase()}@example.com`, rating,
  comment: ref === PROBE_REF ? "Owned review" : "Orphan review", images: [],
  createdAt: new Date(Date.now() - ageMs).toISOString(), bookingReference: ref,
});

const load = async (page, reviews) => {
  await page.evaluate(([bk, rv, items, list]) => {
    localStorage.setItem(bk, JSON.stringify(items));
    localStorage.setItem(rv, JSON.stringify(list));
  }, [BOOKINGS_KEY, REVIEWS_KEY, [booking()], reviews]);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
};
const openMenu = async (page) => {
  await page.click(TRIGGER);
  await page.waitForResponse((r) => r.url().includes("/api/server-time") && r.ok(), { timeout: 15000 });
  await page.waitForSelector(MENU, { timeout: 10000 });
};
const closeMenu = async (page) => {
  await page.keyboard.press("Escape");
  await page.waitForFunction((sel) => !document.querySelector(sel), { timeout: 5000 }, MENU);
};

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1100 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // --- K1 ownership: owned card has the kebab, orphan card has none but is visible
  await page.goto(TOUR_URL, { waitUntil: "networkidle2", timeout: 60000 });
  await load(page, [review(PROBE_REF, "K Owner", 60_000, 4), review(ORPHAN_REF, "K Orphan", 60_000, 2)]);
  await page.waitForSelector(CARD, { timeout: 15000 });
  const own = await page.$$eval(CARD, (els) =>
    els.map((el) => ({
      orphan: el.textContent.includes("K Orphan"),
      triggers: el.querySelectorAll('[data-testid="review-actions-trigger"]').length,
      visible: el.offsetParent !== null,
    }))
  );
  check("K1 two review cards", own.length === 2, JSON.stringify(own.map((c) => c.triggers)));
  check("K1 exactly 1 trigger (owner card only)", own.filter((c) => c.triggers === 1).length === 1, JSON.stringify(own));
  check("K1 orphan card has 0 triggers", own.find((c) => c.orphan)?.triggers === 0, JSON.stringify(own));
  check("K1 orphan card still visible", own.find((c) => c.orphan)?.visible === true);
  await page.screenshot({ path: `${OUT}/k-review-actions-01-owner.png`, fullPage: true });

  // --- K2 menu: server-time fetched, 2 menuitems, attrs, no ARIA traps
  await openMenu(page);
  const menu = await page.evaluate(([m, e]) => {
    const root = document.querySelector(m);
    const items = [...root.querySelectorAll('[role="menuitem"]')];
    const trigger = document.querySelector('[data-testid="review-actions-trigger"]');
    return {
      count: items.length, labels: items.map((i) => i.textContent),
      editDisabled: document.querySelector(e).disabled,
      expanded: trigger.getAttribute("aria-expanded"),
      haspopup: trigger.getAttribute("aria-haspopup"),
      ariaTraps: root.querySelectorAll("[aria-disabled],[aria-pressed]").length,
    };
  }, [MENU, EDIT]);
  check("K2 menu has exactly 2 menuitems", menu.count === 2, JSON.stringify(menu));
  check("K2 labels = menuEdit/menuDelete", menu.labels[0] === M.menuEdit && menu.labels[1] === M.menuDelete, JSON.stringify(menu.labels));
  check("K2 fresh review → Edit enabled", menu.editDisabled === false, `disabled=${menu.editDisabled}`);
  check("K2 aria-expanded true + haspopup menu", menu.expanded === "true" && menu.haspopup === "menu", `${menu.expanded}/${menu.haspopup}`);
  check("K2 no aria-disabled/aria-pressed inside menu", menu.ariaTraps === 0, `n=${menu.ariaTraps}`);
  await page.screenshot({ path: `${OUT}/k-review-actions-02-menu.png`, fullPage: true });
  await closeMenu(page);

  // --- K3 time gate: 4h-old review → menu Edit disabled+opacity AND form gated
  await load(page, [review(PROBE_REF, "K Owner", 4 * 3600_000, 4)]);
  await page.waitForSelector(TRIGGER, { timeout: 15000 });
  await openMenu(page);
  const gate = {
    disabled: await page.$eval(EDIT, (el) => el.disabled),
    opacity: await page.$eval(EDIT, (el) => getComputedStyle(el).opacity),
    box: await (await page.$(EDIT)).boundingBox(),
  };
  check("K3 expired → Edit disabled", gate.disabled === true, `disabled=${gate.disabled}`);
  check("K3 disabled opacity ~0.5", parseFloat(gate.opacity) <= 0.6, gate.opacity);
  check("K3 Edit still visible (bounding box)", gate.box !== null);
  const before = await page.evaluate(() => window.scrollY);
  await page.$eval(EDIT, (el) => el.click());
  await new Promise((r) => setTimeout(r, 400));
  const after = await page.evaluate(() => ({ y: window.scrollY, ta: document.activeElement?.tagName === "TEXTAREA" }));
  check("K3 disabled click is a no-op (no scroll, no focus)", after.y === before && !after.ta, `${before}->${after.y}`);
  await closeMenu(page);
  await page.waitForFunction(
    (sel) => document.querySelector(sel)?.getAttribute("aria-disabled") === "true",
    { timeout: 15000 }, FORM
  );
  check("K3 FORM path gated + editWindowClosed hint", await page.$eval(FORM, (el, hint) => el.textContent.includes(hint), M.editWindowClosed));
  await page.screenshot({ path: `${OUT}/k-review-actions-03-expired.png`, fullPage: true });
  // --- K4 delete → dialog copy + badge/count/list/storage recalc
  await load(page, [review(PROBE_REF, "K Owner", 60_000, 4)]);
  await page.waitForSelector(BADGE, { timeout: 15000 });
  check("K4 badge shows 4.0 before delete", (await page.$eval(BADGE, (el) => el.textContent)).trim().startsWith("4.0"));
  await openMenu(page);
  let dialogMessage = null;
  page.once("dialog", (d) => { dialogMessage = d.message(); d.accept(); });
  await page.click(DELETE);
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 0, { timeout: 15000 }, CARD);
  check("K4 confirm copy = deleteConfirm", dialogMessage === M.deleteConfirm, String(dialogMessage));
  check("K4 cards 0 + badge gone after delete", (await page.$$(CARD)).length === 0 && !(await page.$(BADGE)));
  check("K4 empty state shown", await page.$eval(SECTION, (el, txt) => el.textContent.includes(txt), M.empty));
  const stored = await page.evaluate(([k]) => JSON.parse(localStorage.getItem(k) ?? "[]").filter((r) => r.reference === `${PROBE_REF}:hcm`).length, [REVIEWS_KEY]);
  check("K4 storage payload removed", stored === 0, `left=${stored}`);
  await page.screenshot({ path: `${OUT}/k-review-actions-04-deleted.png`, fullPage: true });

  // --- K5 else-fix: form re-enabled with cleared fields, gate reset
  const cleared = await page.evaluate(
    (f) => {
      const form = document.querySelector(f);
      return {
        aria: form.getAttribute("aria-disabled"), value: form.querySelector("textarea").value,
        stars: [...form.querySelectorAll("button[aria-pressed]")].map((b) => b.getAttribute("aria-pressed")),
        hint: form.textContent.includes("3 giờ"),
      };
    },
    FORM
  );
  check("K5 form re-enabled after delete", cleared.aria !== "true", `aria=${cleared.aria}`);
  check("K5 textarea cleared (else-branch)", cleared.value === "", JSON.stringify(cleared.value));
  check("K5 all 5 stars aria-pressed false", cleared.stars.length === 5 && cleared.stars.every((s) => s === "false"), JSON.stringify(cleared.stars));
  check("K5 editWindowClosed hint reset", cleared.hint === false);

  // --- K6 hygiene: no pageerrors, full cleanup of probe data
  check("K6 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
  await page.evaluate(
    ([bk, rv]) => {
      localStorage.setItem(bk, JSON.stringify([]));
      localStorage.setItem(rv, JSON.stringify(JSON.parse(localStorage.getItem(rv) ?? "[]").filter((r) => !r.reference.startsWith("VN-K-"))));
    },
    [BOOKINGS_KEY, REVIEWS_KEY]
  );
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const fin = await page.evaluate(
    (c) => ({ cards: document.querySelectorAll(c).length, triggers: document.querySelectorAll('[data-testid="review-actions-trigger"]').length, empty: document.getElementById("customer-reviews")?.textContent.includes("Chưa có đánh giá") }),
    CARD
  );
  check("K6 cleanup: 0 cards, 0 triggers, empty state", fin.cards === 0 && fin.triggers === 0 && fin.empty, JSON.stringify(fin));
  await closeBrowser(browser);
} catch (error) {
  errors.push(`fatal: ${error.message}`);
}

errors.push(...pageErrors);
console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);
