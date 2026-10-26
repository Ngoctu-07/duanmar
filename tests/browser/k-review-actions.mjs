import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";
import { signInReviewForeign, signInReviewOwner } from "../helpers/auth-session.mjs";
import { setPageVisitorCookie } from "../helpers/reviews-api.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const M = JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8"))
  .destinations.reviews;

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const ORIGIN = "http://localhost:3000";
const TOUR_URL = `${ORIGIN}/vi/explore/destinations/bangkok-tam-linh`;
const SLUG = "bangkok-tam-linh";
const REVIEWS_KEY = "vn-reviews:v1";
const BOOKINGS_KEY = "vn-my-trips:v1";
const PROBE_REF = "VN-K-REVIEW";
const ORPHAN_REF = "VN-K-OTHER";
const EXPIRED_REF = "VN-K-EXPIRED";
const FOREIGN_REF = "VN-K-FOREIGN";
/** Every server row this file can create (pre-cleaned each phase, belt-cleaned at K6). */
const KNOWN_ROWS = [`${PROBE_REF}:${SLUG}`, `${ORPHAN_REF}:${SLUG}`, `${EXPIRED_REF}:${SLUG}`];
const FOREIGN_ROW = `${FOREIGN_REF}:${SLUG}`;
/** Fixed visitor so legacy rows remain deletable; auth rows use the session id. */
const VISITOR_K = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const SECTION = "#customer-reviews";
const CARD = '[data-testid="review-card"]';
const TRIGGER = '[data-testid="review-actions-trigger"]';
const MENU = '[data-testid="review-actions-menu"]';
const EDIT = '[data-testid="review-actions-edit"]';
const DELETE = '[data-testid="review-delete"]';
const FORM = `${SECTION} [data-testid="write-review-form"]`;
const BADGE = '[data-testid="tour-rating-badge"]';

/** Authenticated cleanup: account-owned rows need the owner session. */
const deleteRows = (page, refs) =>
  page.evaluate(async (list) => {
    const statuses = [];
    for (const ref of list) {
      try {
        const response = await fetch(`/api/reviews/${encodeURIComponent(ref)}`, {
          method: "DELETE",
        });
        statuses.push(response.status);
      } catch {
        statuses.push(0);
      }
    }
    return statuses;
  }, refs);
const seedForeignReview = (page) =>
  page.evaluate(
    async ({ reference, slug, bookingReference }) => {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          tourSlug: slug,
          bookingReference,
          authorName: "K Foreign",
          authorEmail: "kforeign@example.com",
          rating: 4,
          comment: "Foreign review",
          images: [],
        }),
      });
      if (!response.ok) throw new Error(`seed foreign ${response.status}`);
    },
    { reference: FOREIGN_ROW, slug: SLUG, bookingReference: FOREIGN_REF }
  );

const results = [];
const errors = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const booking = (ref = PROBE_REF) => ({
  reference: ref, slug: "bangkok-tam-linh", tourName: "Saigon", travelDate: "2026-10-05",
  fullName: ref === PROBE_REF ? "K Owner" : "K Aged", email: "kowner@example.com", phone: "0900000000", notes: "",
  guests: 1, difficulty: "easy", pricePerGuest: null, total: null, currency: "VND",
  locale: "vi", paidAt: new Date().toISOString(),
});
const review = (ref, authorName, ageMs, rating, comment) => ({
  reference: `${ref}:bangkok-tam-linh`, tourSlug: "bangkok-tam-linh", authorName,
  authorEmail: `${ref.toLowerCase()}@example.com`, rating,
  comment, images: [],
  createdAt: new Date(Date.now() - ageMs).toISOString(), bookingReference: ref,
});

/** Rows seeded via localStorage migrate into SQLite on reload (session id owns them). */
const load = async (page, reviews, bookings) => {
  await page.evaluate(([bk, rv, items, list]) => {
    localStorage.setItem(bk, JSON.stringify(items));
    localStorage.setItem(rv, JSON.stringify(list));
  }, [BOOKINGS_KEY, REVIEWS_KEY, bookings, reviews]);
  // Server rows persist across phases (upsert preserves the original created_at,
  // so a re-seeded reference can never become "4h old") → delete known refs first.
  await deleteRows(page, KNOWN_ROWS);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
};
const apiRows = (page) =>
  page.evaluate(async (slug) => {
    const response = await fetch(`/api/reviews?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!response.ok) return { http: response.status, reviews: null, aggregate: null };
    return response.json();
  }, SLUG);
const openMenu = async (page) => {
  await page.click(TRIGGER);
  await page.waitForResponse((r) => r.url().includes("/api/server-time") && r.ok(), { timeout: 15000 });
  await page.waitForSelector(MENU, { timeout: 10000 });
};
const closeMenu = async (page) => {
  await page.keyboard.press("Escape");
  await page.waitForFunction((sel) => !document.querySelector(sel), { timeout: 5000 }, MENU);
};

let browser;
let page;
let foreignContext;
let foreignPage;

try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1100 } });
  page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await signInReviewOwner(page);

  foreignContext = browser.createBrowserContext
    ? await browser.createBrowserContext()
    : await browser.createIncognitoBrowserContext();
  foreignPage = await foreignContext.newPage();
  await signInReviewForeign(foreignPage);
  await deleteRows(foreignPage, [FOREIGN_ROW]);

  await page.goto(TOUR_URL, { waitUntil: "networkidle2", timeout: 60000 });
  await setPageVisitorCookie(page, VISITOR_K, ORIGIN);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);

  // --- K1 auth ownership: own cards get the trash, a foreign author's does not
  await load(page, [review(PROBE_REF, "K Owner", 60_000, 4, "Owned review"), review(ORPHAN_REF, "K Orphan", 60_000, 2, "Orphan review")], [booking()]);
  await seedForeignReview(foreignPage);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 3, { timeout: 15000 }, CARD);
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 2, { timeout: 15000 }, DELETE);
  const own = await page.$$eval(CARD, (els) =>
    els.map((el) => ({
      foreign: el.textContent.includes("K Foreign"),
      orphan: el.textContent.includes("K Orphan"),
      triggers: el.querySelectorAll('[data-testid="review-actions-trigger"]').length,
      deletes: el.querySelectorAll('[data-testid="review-delete"]').length,
      visible: el.offsetParent !== null,
    }))
  );
  check("K1 three review cards", own.length === 3, JSON.stringify(own.map((c) => c.triggers)));
  check("K1 exactly 1 trigger (owned booking card only)", own.filter((c) => c.triggers === 1).length === 1, JSON.stringify(own));
  check("K1 orphan card has 0 triggers", own.find((c) => c.orphan)?.triggers === 0, JSON.stringify(own));
  check("K1 orphan card still visible", own.find((c) => c.orphan)?.visible === true);
  check("K1 own cards show Delete (2)", own.filter((c) => c.deletes === 1).length === 2, JSON.stringify(own));
  check("K1 foreign author card hides Delete", own.find((c) => c.foreign)?.deletes === 0, JSON.stringify(own));
  const foreignDeleteStatus = await page.evaluate(
    async (ref) => {
      const response = await fetch(`/api/reviews/${encodeURIComponent(ref)}`, {
        method: "DELETE",
      });
      return response.status;
    },
    FOREIGN_ROW
  );
  check("K1 server rejects deleting another author's review (403)", foreignDeleteStatus === 403, String(foreignDeleteStatus));
  await page.screenshot({ path: `${OUT}/k-review-actions-01-owner.png`, fullPage: true });
  await deleteRows(foreignPage, [FOREIGN_ROW]);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 2, { timeout: 15000 }, CARD);

  // --- K2 menu: server-time fetched, 1 edit item, attrs, no ARIA traps
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
  check("K2 menu has exactly 1 edit menuitem", menu.count === 1, JSON.stringify(menu));
  check("K2 label = menuEdit", menu.labels[0] === M.menuEdit, JSON.stringify(menu.labels));
  check("K2 fresh review → Edit enabled", menu.editDisabled === false, `disabled=${menu.editDisabled}`);
  check("K2 aria-expanded true + haspopup menu", menu.expanded === "true" && menu.haspopup === "menu", `${menu.expanded}/${menu.haspopup}`);
  check("K2 no aria-disabled/aria-pressed inside menu", menu.ariaTraps === 0, `n=${menu.ariaTraps}`);
  await page.screenshot({ path: `${OUT}/k-review-actions-02-menu.png`, fullPage: true });
  await closeMenu(page);

  // --- K3 time gate: 4h-old review → menu Edit disabled+opacity AND form gated.
  // Fresh reference: upserts preserve the original created_at, so the aged row
  // must be inserted (not re-seeded over a young row) with its own booking.
  await load(page, [review(EXPIRED_REF, "K Aged", 4 * 3600_000, 4, "Aged review")], [booking(EXPIRED_REF)]);
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
  check("K3 form stays hidden for an existing review", !(await page.$(FORM)));
  await page.screenshot({ path: `${OUT}/k-review-actions-03-expired.png`, fullPage: true });
  // --- K4 delete → dialog copy + badge/count/list/API recalc
  await load(page, [review(PROBE_REF, "K Owner", 60_000, 4, "Owned review")], [booking()]);
  await page.waitForSelector(BADGE, { timeout: 15000 });
  check("K4 badge shows 4.0 before delete", (await page.$eval(BADGE, (el) => el.textContent)).trim().startsWith("4.0"));
  await page.waitForSelector(DELETE, { timeout: 15000 });
  let dialogMessage = null;
  page.once("dialog", (d) => { dialogMessage = d.message(); d.accept(); });
  await page.click(DELETE);
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 0, { timeout: 15000 }, CARD);
  check("K4 confirm copy = deleteConfirm", dialogMessage === M.deleteConfirm, String(dialogMessage));
  check("K4 cards 0 + badge gone after delete", (await page.$$(CARD)).length === 0 && !(await page.$(BADGE)));
  check("K4 empty state shown", await page.$eval(SECTION, (el, txt) => el.textContent.includes(txt), M.empty));
  const server = await apiRows(page);
  const kRows = Array.isArray(server?.reviews) ? server.reviews.filter((r) => String(r?.reference ?? "").startsWith("VN-K-")) : null;
  check("K4 API holds 0 K rows after delete", kRows !== null && kRows.length === 0, JSON.stringify(kRows?.map((r) => r.reference)));
  check("K4 aggregate null after delete", server?.aggregate === null, JSON.stringify(server?.aggregate));
  await page.screenshot({ path: `${OUT}/k-review-actions-04-deleted.png`, fullPage: true });

  // --- K5 else-fix: form re-enabled with cleared fields, gate reset
  await page.waitForSelector(FORM, { timeout: 15000 });
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

  // --- K6 hygiene: no pageerrors, full cleanup of probe data (device + server)
  check("K6 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
  await page.evaluate(
    ([bk, rv]) => {
      localStorage.setItem(bk, JSON.stringify([]));
      localStorage.setItem(rv, JSON.stringify(JSON.parse(localStorage.getItem(rv) ?? "[]").filter((r) => !r.reference.startsWith("VN-K-"))));
    },
    [BOOKINGS_KEY, REVIEWS_KEY]
  );
  await deleteRows(page, KNOWN_ROWS);
  await deleteRows(foreignPage, [FOREIGN_ROW]);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const fin = await page.evaluate(
    (c) => ({ cards: document.querySelectorAll(c).length, triggers: document.querySelectorAll('[data-testid="review-actions-trigger"]').length, empty: document.getElementById("customer-reviews")?.textContent.includes("Chưa có đánh giá") }),
    CARD
  );
  check("K6 cleanup: 0 cards, 0 triggers, empty state", fin.cards === 0 && fin.triggers === 0 && fin.empty, JSON.stringify(fin));
  const finApi = await apiRows(page);
  const finLeft = Array.isArray(finApi?.reviews) ? finApi.reviews.filter((r) => String(r?.reference ?? "").startsWith("VN-K-")) : null;
  check("K6 cleanup: 0 K rows on the server", finLeft !== null && finLeft.length === 0, JSON.stringify(finLeft?.map((r) => r.reference)));
} catch (error) {
  errors.push(`fatal: ${error.message}`);
} finally {
  try {
    if (page) await deleteRows(page, KNOWN_ROWS);
    if (foreignPage) await deleteRows(foreignPage, [FOREIGN_ROW]);
  } catch {
    // Best-effort cleanup — a stale probe row cannot break the app.
  }
  if (foreignContext) await foreignContext.close().catch(() => {});
  if (browser) await closeBrowser(browser);
}

errors.push(...pageErrors);
console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);
