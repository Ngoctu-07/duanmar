import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fetchTourPricing, remainingOn } from "../helpers/cms-expectations.mjs";

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

const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shifted = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoOf(d);
};

const CHECKOUT_URL = "http://localhost:3000/vi/booking/checkout?tour=hcm";
const today = shifted(0);
const tomorrow = shifted(1);
const day7 = shifted(7);
const day8 = shifted(8);

const dayDisabled = (page, iso) =>
  page.$eval(`td[data-day="${iso}"]`, (td) => td.getAttribute("data-disabled") === "true")
    .catch(() => null);

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1400 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const response = await page.goto(CHECKOUT_URL, { waitUntil: "networkidle2", timeout: 60000 });
  check("H4 checkout 200", response?.status() === 200, `status=${response?.status()}`);

  await page.waitForSelector('td[data-day]', { timeout: 20000 });

  // Single-ledger expectations: published CMS maxCapacity (freshness contract,
  // plan 260927-1645) minus the guests of successful bookings stored on THIS
  // device (localStorage vn-my-trips:v1, aggregated the way src/lib/
  // tour-capacity.ts does — e.g. the real bookings c-booking/c-payment made
  // earlier in this browser session). Manual per-date CMS occupancy no longer
  // exists (plan 260927-1804).
  const cmsDoc = await fetchTourPricing("hcm");
  const capacity =
    typeof cmsDoc?.maxCapacity === "number" && Number.isSafeInteger(cmsDoc.maxCapacity) && cmsDoc.maxCapacity > 0
      ? cmsDoc.maxCapacity
      : null;
  const readBookedByDate = () =>
    page.evaluate(() => {
      const out = {};
      try {
        const parsed = JSON.parse(localStorage.getItem("vn-my-trips:v1") ?? "[]");
        if (!Array.isArray(parsed)) return out;
        for (const b of parsed) {
          if (!b || typeof b !== "object" || b.slug !== "hcm" || !b.travelDate) continue;
          const guests = Number.isFinite(b.guests) && b.guests >= 1 ? Math.floor(b.guests) : 0;
          if (guests) out[b.travelDate] = (out[b.travelDate] ?? 0) + guests;
        }
      } catch {
        /* corrupted storage → no device bookings */
      }
      return out;
    });
  let bookedByDate = await readBookedByDate();
  const remaining = (iso) => remainingOn(cmsDoc, iso, bookedByDate);
  const badgeCount = async () => (await page.$$('[data-testid="capacity-badge"]')).length;

  const badges0 = await badgeCount();
  if (capacity === null) {
    check("H4 no capacity badge when CMS has no maxCapacity (P4)", badges0 === 0, `badges=${badges0}`);
  } else {
    check("H4 capacity badges when CMS maxCapacity present", badges0 > 0, `badges=${badges0} cap=${capacity}`);
  }

  check("H4 window: today disabled", (await dayDisabled(page, today)) === true);
  const expectBlocked = (iso, guests) => {
    const r = remaining(iso);
    return r === null ? false : guests > r;
  };
  check(
    "H4 tomorrow follows published maxCapacity − device bookings",
    (await dayDisabled(page, tomorrow)) === expectBlocked(tomorrow, 1),
    `remaining=${remaining(tomorrow)} booked=${JSON.stringify(bookedByDate)}`
  );
  check(
    "H4 +7 follows published maxCapacity − device bookings",
    (await dayDisabled(page, day7)) === expectBlocked(day7, 1),
    `remaining=${remaining(day7)}`
  );
  // +8 lives in the next month grid — navigate there before asserting
  await page.click(".rdp-button_next");
  await sleep(400);
  check("H4 window: +8 disabled", (await dayDisabled(page, day8)) === true);
  check("H4 +8 still shows its day number (visible, just disabled)",
    (await page.$$(`td[data-day="${day8}"]`)).length === 1);
  await page.click(".rdp-button_previous");
  await sleep(400);

  // Extreme guest count: blocked exactly when 99 exceeds CMS remaining
  await page.$eval("#booking-guests", (el, v) => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, "99");
  await sleep(300);
  check(
    "H4 guestCount=99 follows published maxCapacity − device bookings",
    (await dayDisabled(page, tomorrow)) === expectBlocked(tomorrow, 99) &&
      (await dayDisabled(page, day7)) === expectBlocked(day7, 99),
    `remaining(tomorrow)=${remaining(tomorrow)} remaining(+7)=${remaining(day7)}`
  );
  const badges99 = await badgeCount();
  if (capacity === null) {
    check("H4 guestCount=99 → still no badge", badges99 === 0, `badges=${badges99}`);
  } else {
    check("H4 guestCount=99 keeps badges visible", badges99 > 0, `badges=${badges99}`);
  }

  // ARIA: every in-window day button is labelled
  const labelled = await page.$$eval(`td[data-day="${tomorrow}"] button`, (btns) =>
    btns.map((b) => (b.getAttribute("aria-label") || "").length > 5)
  );
  check("H4 day button has aria-label", labelled.length === 1 && labelled[0] === true);

  // Still interactive: reset to 1 guest, then pick the first in-window day
  // that CMS capacity leaves open (all-full windows are legitimately blocked).
  await page.$eval("#booking-guests", (el) => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, "1");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sleep(300);
  let pickDay = null;
  for (let i = 1; i <= 7 && !pickDay; i += 1) {
    const iso = shifted(i);
    if ((await page.$(`td[data-day="${iso}"]`)) && (await dayDisabled(page, iso)) === false) pickDay = iso;
  }
  if (pickDay) await page.click(`td[data-day="${pickDay}"] button`);
  await sleep(200);
  const picked = await page.$eval("td[data-selected]", (td) => td.getAttribute("data-day")).catch(() => null);
  check("H4 date pick still works", pickDay !== null && picked === pickDay, `picked=${picked} expected=${pickDay}`);

  // H8 screenshots (desktop)
  await page.screenshot({ path: `${OUT}/h8-checkout-desktop.png`, fullPage: false });

  // Req 2 — dynamic recalc: a newly confirmed booking immediately shrinks
  // remaining on its date (persisted exactly like saveBooking writes it, then
  // picked up by the calendar's capacity re-merge).
  if (capacity !== null && pickDay) {
    const before = remaining(pickDay);
    await page.evaluate(
      ({ iso }) => {
        const key = "vn-my-trips:v1";
        let list = [];
        try {
          const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
          if (Array.isArray(parsed)) list = parsed;
        } catch {
          /* start fresh on corrupted storage */
        }
        const probe = {
          reference: "VN-H4-RECALC",
          slug: "hcm",
          tourName: "Saigon",
          travelDate: iso,
          fullName: "Recalc Probe",
          email: "recalc@example.com",
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
          JSON.stringify([probe, ...list.filter((b) => b?.reference !== "VN-H4-RECALC")])
        );
      },
      { iso: pickDay }
    );
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("td[data-day]", { timeout: 20000 });
    bookedByDate = await readBookedByDate();
    const expected = Math.max(0, before - 1);
    const badge = await page
      .$eval(`td[data-day="${pickDay}"] [data-testid="capacity-badge"]`, (el) => el.textContent.trim())
      .catch(() => null);
    const disabled = await dayDisabled(page, pickDay);
    if (expected === 0) {
      check(
        "H4 recalc after confirm → last spot gone: Hết chỗ + disabled",
        badge === "Hết chỗ" && disabled === true,
        `badge=${badge} disabled=${disabled}`
      );
    } else {
      check(
        `H4 recalc after confirm → badge ${before} → ${expected} chỗ trống`,
        badge === `${expected} chỗ trống` && disabled === false,
        `badge=${badge} disabled=${disabled}`
      );
    }
    // Drop the probe so the shared browser session stays clean.
    await page.evaluate(() => {
      try {
        const parsed = JSON.parse(localStorage.getItem("vn-my-trips:v1") ?? "[]");
        if (Array.isArray(parsed))
          localStorage.setItem(
            "vn-my-trips:v1",
            JSON.stringify(parsed.filter((b) => b?.reference !== "VN-H4-RECALC"))
          );
      } catch {
        /* nothing to clean */
      }
    });
  } else if (capacity !== null) {
    check("H4 recalc-after-confirm probe ran", false, "no pickDay available to test");
  }

  // H8 mobile 375px — calendar must not overflow the viewport
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
  await mobile.goto(CHECKOUT_URL, { waitUntil: "networkidle2", timeout: 60000 });
  await mobile.waitForSelector('td[data-day]', { timeout: 20000 });
  const overflow = await mobile.evaluate(() => {
    const box = document.querySelector("#booking-travel-date");
    if (!box) return { missing: true };
    const rect = box.getBoundingClientRect();
    return { scrollW: document.documentElement.scrollWidth, boxRight: Math.round(rect.right), vw: window.innerWidth };
  });
  check("H4 mobile: no horizontal page overflow", !overflow.missing && overflow.scrollW <= overflow.vw + 1,
    JSON.stringify(overflow));
  await mobile.screenshot({ path: `${OUT}/h8-checkout-mobile.png`, fullPage: false });
  await mobile.close();
} catch (error) {
  errors.push(`exception: ${error.message}`);
  results.push(`FAIL exception :: ${error.message}`);
} finally {
  await closeBrowser().catch(() => undefined);
}

console.log(results.join("\n"));
console.log(`\n${results.filter((r) => r.startsWith("ok")).length} passed, ${errors.length} failed`);
process.exit(errors.length ? 1 : 0);
