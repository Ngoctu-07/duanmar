import assert from "node:assert/strict";
import {
  addDays,
  formatTravelDate,
  isTravelDateAllowed,
  parseIsoDate,
  toIsoDate,
  travelDateWindow,
  BOOKING_WINDOW_DAYS,
} from "../../src/lib/date-window.ts";
import { validateBooking, type BookingValues } from "../../src/components/booking/booking-validation.ts";

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const today = new Date(2026, 9, 1); // Oct 1, 2026 (local)

check("F1 window = tomorrow .. today+7 (plan example Oct 1 → Oct 2..Oct 8)", () => {
  assert.deepEqual(travelDateWindow(today), { min: "2026-10-02", max: "2026-10-08" });
  assert.equal(BOOKING_WINDOW_DAYS, 7);
});

check("F1 window crosses month/year boundary", () => {
  assert.deepEqual(travelDateWindow(new Date(2026, 11, 30)), {
    min: "2026-12-31",
    max: "2027-01-06",
  });
});

check("F1 isTravelDateAllowed: in/out of window", () => {
  assert.equal(isTravelDateAllowed("2026-10-01", today), false, "today disallowed");
  assert.equal(isTravelDateAllowed("2026-09-30", today), false, "past disallowed");
  assert.equal(isTravelDateAllowed("2026-10-02", today), true, "tomorrow");
  assert.equal(isTravelDateAllowed("2026-10-08", today), true, "day+7");
  assert.equal(isTravelDateAllowed("2026-10-09", today), false, "day+8");
  assert.equal(isTravelDateAllowed("2026-10-05", today), true, "mid window");
});

check("F1 malformed/impossible dates rejected", () => {
  assert.equal(isTravelDateAllowed("not-a-date", today), false);
  assert.equal(isTravelDateAllowed("2026-10-31", today), false, "wrong length");
  assert.equal(isTravelDateAllowed("2026-02-31", today), false, "impossible day");
  assert.equal(parseIsoDate("2026-13-01"), null);
  assert.equal(parseIsoDate("26-10-01"), null);
  assert.equal(parseIsoDate("2026-10-01T00:00:00Z"), null, "no time part");
});

check("F1 toIsoDate/addDays are local-timezone safe", () => {
  const date = new Date(2026, 0, 31); // Jan 31 local
  assert.equal(toIsoDate(date), "2026-01-31");
  assert.equal(toIsoDate(addDays(date, 1)), "2026-02-01", "month rollover");
  assert.equal(toIsoDate(addDays(date, -31)), "2025-12-31", "crosses year back");
  assert.equal(toIsoDate(addDays(date, 365)), "2027-01-31");
});

check("F1 formatTravelDate renders locale date", () => {
  const vi = formatTravelDate("2026-10-02", "vi");
  assert.ok(vi.includes("02/10/2026"), vi);
  const en = formatTravelDate("2026-10-02", "en");
  assert.ok(en.includes("10/02/2026"), en);
  assert.equal(formatTravelDate("bad", "vi"), "bad", "falls back to raw");
});

const base: BookingValues = {
  fullName: "Nguyen Van A",
  email: "lena@example.com",
  phone: "0912345678",
  notes: "",
  travelDate: "",
  guests: "2",
  difficulty: "easy",
};

check("F1 validation: travelDate required", () => {
  const errors = validateBooking({ ...base, travelDate: "" });
  assert.equal(errors.travelDate, "dateRequired");
});

check("F1 validation: date outside window", () => {
  const tomorrow = toIsoDate(addDays(new Date(), 1));
  const tooFar = toIsoDate(addDays(new Date(), BOOKING_WINDOW_DAYS + 3));
  const past = toIsoDate(addDays(new Date(), -1));
  assert.equal(validateBooking({ ...base, travelDate: tomorrow }).travelDate, undefined);
  assert.equal(validateBooking({ ...base, travelDate: tooFar }).travelDate, "dateOutOfRange");
  assert.equal(validateBooking({ ...base, travelDate: past }).travelDate, "dateOutOfRange");
});

check("F1 validation: valid booking has no errors", () => {
  const tomorrow = toIsoDate(addDays(new Date(), 1));
  assert.deepEqual(validateBooking({ ...base, travelDate: tomorrow }), {});
});

// booking-history upsert (localStorage stubbed before dynamic import)
const store = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  },
};
const { saveBooking, listBookings, getBooking } = await (async () => import(
  "../../src/lib/booking-history.ts"
))();

const fixture = (reference: string, paidAt: string) => ({
  reference,
  slug: "hcm",
  tourName: "Saigon",
  travelDate: "2026-10-02",
  fullName: "A",
  email: "a@b.c",
  phone: "0912345678",
  notes: "",
  guests: 2,
  difficulty: "easy",
  pricePerGuest: 150000,
  total: 300000,
  currency: "VND",
  locale: "vi",
  paidAt,
});

check("F1 saveBooking upserts by reference (method switch → 1 record)", () => {
  saveBooking(fixture("VN-1", "2026-09-27T01:00:00.000Z"));
  saveBooking(fixture("VN-1", "2026-09-27T02:00:00.000Z"));
  assert.equal(listBookings().length, 1, "no duplicate after re-payment");
  assert.equal(getBooking("VN-1")?.paidAt, "2026-09-27T02:00:00.000Z");
});

check("F1 listBookings newest-first + ignores corrupted entries", () => {
  saveBooking(fixture("VN-2", "2026-09-26T00:00:00.000Z"));
  store.set(
    "vn-my-trips:v1",
    JSON.stringify([...listBookings(), { junk: true }, "nope"])
  );
  const list = listBookings();
  assert.deepEqual(
    list.map((b: { reference: string }) => b.reference),
    ["VN-1", "VN-2"],
    "sorted desc, junk filtered"
  );
  store.clear();
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
