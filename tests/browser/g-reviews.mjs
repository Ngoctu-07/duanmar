import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const TOUR_URL = "http://localhost:3000/vi/explore/destinations/hcm";
const REVIEWS_KEY = "vn-reviews:v1";
const BOOKINGS_KEY = "vn-my-trips:v1";
const PROBE_REF = "VN-G-REVIEWS";
const HINT = "Chỉ khách đã đặt tour này mới có thể viết đánh giá.";
const SECTION = "#customer-reviews";
const WRAP = `${SECTION} [aria-disabled="true"]`;
const star = (n) => `${SECTION} form button[aria-label="Điểm đánh giá ${n}"]`;
const TEXTAREA = `${SECTION} textarea`;
const FILE_INPUT = `${SECTION} input[type="file"]`;
const SUBMIT = `${SECTION} button[type="submit"]`;
const CARD = '[data-testid="review-card"]';
const BADGE = '[data-testid="tour-rating-badge"]';

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const seedProbe = (page) =>
  page.evaluate((key) => {
    let list = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      /* start fresh on corrupted storage */
    }
    const probe = {
      reference: "VN-G-REVIEWS",
      slug: "hcm",
      tourName: "Saigon",
      travelDate: "2026-10-05",
      fullName: "G Review Probe",
      email: "gprobe@example.com",
      phone: "0900000000",
      notes: "",
      guests: 1,
      difficulty: "easy",
      pricePerGuest: null,
      total: null,
      currency: "VND",
      locale: "vi",
      paidAt: new Date().toISOString(),
    };
    localStorage.setItem(
      key,
      JSON.stringify([probe, ...list.filter((b) => b?.reference !== "VN-G-REVIEWS")])
    );
  }, BOOKINGS_KEY);

const cleanup = (page) =>
  page.evaluate(
    ({ reviewsKey, bookingsKey, probeRef }) => {
      try {
        const reviews = JSON.parse(localStorage.getItem(reviewsKey) ?? "[]");
        localStorage.setItem(
          reviewsKey,
          JSON.stringify(
            Array.isArray(reviews)
              ? reviews.filter((r) => r?.reference !== `${probeRef}:hcm`)
              : []
          )
        );
      } catch {
        localStorage.removeItem(reviewsKey);
      }
      try {
        const bookings = JSON.parse(localStorage.getItem(bookingsKey) ?? "[]");
        localStorage.setItem(
          bookingsKey,
          JSON.stringify(
            Array.isArray(bookings)
              ? bookings.filter((b) => b?.reference !== probeRef)
              : []
          )
        );
      } catch {
        localStorage.removeItem(bookingsKey);
      }
    },
    { reviewsKey: REVIEWS_KEY, bookingsKey: BOOKINGS_KEY, probeRef: PROBE_REF }
  );

const setTextValue = (page, selector, value) =>
  page.$eval(
    selector,
    (el, text) => {
      const proto =
        el instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value
  );

const fixture = `${OUT}/review-fixture.png`;
writeFileSync(
  fixture,
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  )
);

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1100 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // --- R1 clean slate: no reviews → no badge, empty state, section below price
  await page.goto(TOUR_URL, { waitUntil: "networkidle2", timeout: 60000 });
  // Gating must be deterministic: drop leftovers from earlier test files.
  await page.evaluate(
    ({ reviewsKey, bookingsKey }) => {
      localStorage.removeItem(reviewsKey);
      localStorage.removeItem(bookingsKey);
    },
    { reviewsKey: REVIEWS_KEY, bookingsKey: BOOKINGS_KEY }
  );
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  check("R1 badge hidden at 0 reviews", !(await page.$(BADGE)));
  const sectionText = await page.$eval(SECTION, (el) => el.textContent ?? "");
  check("R1 empty state shown", sectionText.includes("Chưa có đánh giá"), sectionText.slice(0, 60));
  const order = await page.evaluate(() => {
    const price = document.querySelector('section[aria-labelledby="tour-price-heading"]');
    const section = document.querySelector("#customer-reviews");
    return { hasPrice: Boolean(price), below: price && section ? price.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING : false };
  });
  check("R1 section below price block", order.hasPrice ? order.below : true);
  await page.screenshot({ path: `${OUT}/g-reviews-01-clean.png`, fullPage: true });

  // --- R2 gating: SSR section markup has no hint (no flash), then disabled wrapper
  const ssr = await page.evaluate(async (url) => {
    const response = await fetch(url);
    if (!response.ok) return { section: false, hint: false };
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const section = doc.querySelector("#customer-reviews");
    return {
      section: Boolean(section),
      hint: Boolean(section?.textContent?.includes("Chỉ khách đã đặt tour này")),
    };
  }, TOUR_URL);
  check(
    "R2 SSR section ships without the not-booked hint",
    ssr.section && !ssr.hint,
    JSON.stringify(ssr)
  );
  await page.waitForFunction(
    (hint) => document.querySelector("#customer-reviews")?.textContent?.includes(hint),
    { timeout: 20000 },
    HINT
  ).catch(() => {});
  check(
    "R2 hint appears after hydration (no booking)",
    await page.$eval(SECTION, (el, hint) => (el.textContent ?? "").includes(hint), HINT)
  );
  const wrap = await page.$(WRAP);
  check("R2 disabled wrapper exists", Boolean(wrap));
  const pe = await page.$eval(WRAP, (el) => getComputedStyle(el).pointerEvents);
  check("R2 pointer-events none while disabled", pe === "none", pe);
  const starState = async (n) => page.$eval(star(n), (el) => el.getAttribute("aria-pressed"));
  await page.$eval(star(4), (el) => el.click());
  check("R2 star click ignored while disabled", (await starState(4)) === "false");
  check(
    "R2 controls disabled",
    (await page.$eval(TEXTAREA, (el) => el.disabled)) &&
      (await page.$eval(SUBMIT, (el) => el.disabled))
  );
  await page.screenshot({ path: `${OUT}/g-reviews-02-disabled.png`, fullPage: true });

  // --- R3 seed booking probe → R4 form enabled
  await seedProbe(page);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page
    .waitForFunction((hint) => !document.querySelector("#customer-reviews")?.textContent?.includes(hint), { timeout: 15000 }, HINT)
    .catch(() => {});
  check("R4 enabled: aria-disabled gone", !(await page.$(WRAP)));
  check(
    "R4 hint hidden with booking",
    !(await page.$eval(SECTION, (el, hint) => (el.textContent ?? "").includes(hint), HINT))
  );
  check("R4 textarea enabled", !(await page.$eval(TEXTAREA, (el) => el.disabled)));
  check("R4 star buttons enabled", !(await page.$eval(star(4), (el) => el.disabled)));

  // --- R5 submit a review (4 stars + comment + 1 image)
  await page.click(star(4));
  await setTextValue(page, TEXTAREA, "Amazing food and friendly guides!");
  const fileInput = await page.$(FILE_INPUT);
  await fileInput.uploadFile(fixture);
  await page.waitForFunction(() => document.querySelectorAll("#customer-reviews img").length >= 1, { timeout: 15000 });
  await page.click(SUBMIT);
  await page.waitForSelector(CARD, { timeout: 15000 });
  const cardText = await page.$eval(CARD, (el) => el.textContent ?? "");
  check("R5 card shows probe author", cardText.includes("G Review Probe"), cardText.slice(0, 60));
  check("R5 card shows comment", cardText.includes("Amazing food and friendly guides!"));
  const filled = await page.$$eval(`${CARD} svg.fill-current`, (els) => els.length);
  check("R5 card shows 4 filled stars", filled === 4, `filled=${filled}`);
  const thumbs = await page.$$eval(`${CARD} img`, (els) => els.length);
  check("R5 card shows 1 image thumb", thumbs === 1, `thumbs=${thumbs}`);

  // --- R6 badge appears with derived average
  await page.waitForSelector(BADGE, { timeout: 15000 });
  const badgeText = (await page.$eval(BADGE, (el) => el.textContent ?? "")).trim();
  const badgeClass = await page.$eval(BADGE, (el) => el.className);
  check("R6 badge shows 4.0", badgeText.startsWith("4.0"), badgeText);
  check("R6 badge uses theme token", badgeClass.includes("text-primary"), badgeClass);
  await page.screenshot({ path: `${OUT}/g-reviews-03-submitted.png`, fullPage: true });

  // --- R7 persistence across reload (form pre-fills the existing review)
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.waitForSelector(CARD, { timeout: 15000 });
  check("R7 card persists after reload", Boolean(await page.$(CARD)));
  check("R7 badge persists after reload", Boolean(await page.$(BADGE)));
  const prefilled = await page.$eval(TEXTAREA, (el) => el.value);
  check("R7 form pre-fills existing review", prefilled.includes("Amazing food"), prefilled.slice(0, 40));

  // --- R8 upsert: second submit keeps exactly 1 card, rating updates to 5.0
  await page.click(star(5));
  await setTextValue(page, TEXTAREA, "Second visit was even better.");
  await page.click(SUBMIT);
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('[data-testid="review-card"]');
    return cards.length === 1 && (cards[0].textContent ?? "").includes("Second visit");
  }, { timeout: 15000 });
  const cardCount = (await page.$$(CARD)).length;
  check("R8 still exactly 1 card (upsert)", cardCount === 1, `cards=${cardCount}`);
  const badgeAfter = (await page.$eval(BADGE, (el) => el.textContent ?? "")).trim();
  check("R8 badge updates to 5.0", badgeAfter.startsWith("5.0"), badgeAfter);

  // --- R9 stored record: ≤3 images, JPEG data URLs
  const stored = await page.evaluate(
    (key, ref) => {
      try {
        const list = JSON.parse(localStorage.getItem(key) ?? "[]");
        const record = Array.isArray(list)
          ? list.find((r) => r?.reference === `${ref}:hcm`)
          : null;
        return record ? { count: list.length, images: record.images } : null;
      } catch {
        return null;
      }
    },
    REVIEWS_KEY,
    PROBE_REF
  );
  check("R9 single stored review", stored?.count === 1, JSON.stringify(stored?.count));
  check("R9 images capped at 3", (stored?.images?.length ?? 99) <= 3, `${stored?.images?.length}`);
  check(
    "R9 images are downscaled JPEG data URLs",
    Boolean(stored?.images?.[0]?.startsWith("data:image/jpeg")),
    stored?.images?.[0]?.slice(0, 30)
  );

  // --- R10 cleanup: remove review + probe → empty state + disabled form
  await cleanup(page);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page
    .waitForFunction((hint) => document.querySelector("#customer-reviews")?.textContent?.includes(hint), { timeout: 15000 }, HINT)
    .catch(() => {});
  check("R10 empty state restored", (await page.$eval(SECTION, (el) => el.textContent ?? "")).includes("Chưa có đánh giá"));
  check("R10 badge gone after cleanup", !(await page.$(BADGE)));
  check("R10 form disabled again", Boolean(await page.$(WRAP)));
  await page.screenshot({ path: `${OUT}/g-reviews-04-final.png`, fullPage: true });

  await closeBrowser(browser);
} catch (error) {
  errors.push(`fatal: ${error.message}`);
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);
