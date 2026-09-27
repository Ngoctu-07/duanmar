import assert from "node:assert/strict";
import {
  isDateBookable,
  mapTourCapacity,
  mergeDeviceBookings,
  remainingSlots,
} from "../../src/lib/tour-capacity.ts";

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

const booking = (overrides: Record<string, unknown> = {}) => ({
  reference: "VN-1",
  slug: "hcm",
  tourName: "Saigon",
  travelDate: "2026-10-02",
  fullName: "A",
  email: "a@b.c",
  phone: "0900000000",
  notes: "",
  guests: 2,
  difficulty: "easy",
  pricePerGuest: 100,
  total: 200,
  currency: "VND",
  locale: "vi",
  paidAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

/** Capacity + aggregated bookings in one step (mirrors the app's mount flow). */
const capacityWith = (bookings: ReturnType<typeof booking>[], max = 10) =>
  mergeDeviceBookings(mapTourCapacity({ maxCapacity: max }), "hcm", bookings as never);

check("H1 map null doc → null (P4 no data)", () => {
  assert.equal(mapTourCapacity(null), null);
  assert.equal(mapTourCapacity(undefined), null);
});

check("H1 map missing maxCapacity → null", () => {
  assert.equal(mapTourCapacity({}), null);
});

check("H1 map invalid maxCapacity (0, 1.5, -2, string) → null", () => {
  assert.equal(mapTourCapacity({ maxCapacity: 0 }), null);
  assert.equal(mapTourCapacity({ maxCapacity: 1.5 }), null);
  assert.equal(mapTourCapacity({ maxCapacity: -2 }), null);
  assert.equal(mapTourCapacity({ maxCapacity: "10" as unknown as number }), null);
});

check("H1 map unsafe/oversized maxCapacity (1e21, 1000) → null, 999 ok", () => {
  assert.equal(mapTourCapacity({ maxCapacity: 1e21 }), null);
  assert.equal(mapTourCapacity({ maxCapacity: 1_000 }), null);
  assert.deepEqual(mapTourCapacity({ maxCapacity: 999 }), {
    maxCapacity: 999,
    bookedByDate: {},
  });
});

check("H1 map valid maxCapacity → empty ledger", () => {
  assert.deepEqual(mapTourCapacity({ maxCapacity: 10 }), {
    maxCapacity: 10,
    bookedByDate: {},
  });
});

check("H1 map ignores legacy/manual per-date fields (orphan occupancy)", () => {
  const capacity = mapTourCapacity({
    maxCapacity: 10,
    occupancy: [
      { date: "2026-10-02", booked: 6 },
      { date: "2026-10-03", booked: 10 },
    ],
  });
  assert.deepEqual(capacity?.bookedByDate, {});
});

check("REQ remaining = max − Σ successful bookings (aggregation)", () => {
  const capacity = capacityWith([
    booking({ reference: "VN-1", travelDate: "2026-09-29", guests: 3 }),
    booking({ reference: "VN-2", travelDate: "2026-09-29", guests: 4 }),
    booking({ reference: "VN-3", travelDate: "2026-09-30", guests: 1 }),
  ]);
  // 10 − 7 = 3 on Sep 29; 10 − 1 = 9 on Sep 30; untouched date = 10
  assert.equal(remainingSlots(capacity, "2026-09-29"), 3);
  assert.equal(remainingSlots(capacity, "2026-09-30"), 9);
  assert.equal(remainingSlots(capacity, "2026-10-01"), 10);
});

check("H1 mergeDeviceBookings adds same-slug guests per date", () => {
  const merged = capacityWith([
    booking({ reference: "VN-1", travelDate: "2026-10-02", guests: 3 }),
    booking({ reference: "VN-2", travelDate: "2026-10-02", guests: 4 }),
    booking({ reference: "VN-3", travelDate: "2026-10-05", guests: 1 }),
  ]);
  assert.deepEqual(merged?.bookedByDate, {
    "2026-10-02": 7,
    "2026-10-05": 1,
  });
});

check("H1 merge ignores other slugs and null capacity", () => {
  const capacity = mapTourCapacity({ maxCapacity: 10 });
  const merged = mergeDeviceBookings(capacity, "hcm", [
    booking({ slug: "da-nang", guests: 9 }),
  ]);
  assert.deepEqual(merged?.bookedByDate, {});
  assert.equal(mergeDeviceBookings(null, "hcm", [booking()]), null);
});

check("H1 merge skips invalid bookings (no date, guests 0/NaN/negative)", () => {
  const merged = capacityWith([
    booking({ travelDate: "", guests: 5 }),
    booking({ travelDate: "2026-10-02", guests: 0 }),
    booking({ travelDate: "2026-10-02", guests: Number.NaN }),
    booking({ travelDate: "2026-10-02", guests: -3 }),
    booking({ travelDate: "2026-10-02", guests: 2.7 }),
  ]);
  assert.deepEqual(merged?.bookedByDate, { "2026-10-02": 2 });
});

check("H1 remainingSlots: free date, partially booked, overbooked, null", () => {
  const capacity = capacityWith([
    booking({ travelDate: "2026-10-02", guests: 4 }),
    booking({ travelDate: "2026-10-03", guests: 12 }),
  ]);
  assert.equal(remainingSlots(capacity, "2026-10-04"), 10);
  assert.equal(remainingSlots(capacity, "2026-10-02"), 6);
  assert.equal(remainingSlots(capacity, "2026-10-03"), 0);
  assert.equal(remainingSlots(null, "2026-10-02"), null);
});

check("H1 isDateBookable: guests == remaining ok, guests > remaining blocked", () => {
  const capacity = capacityWith([
    booking({ travelDate: "2026-10-02", guests: 6 }),
  ]);
  assert.equal(isDateBookable(capacity, "2026-10-02", 4), true);
  assert.equal(isDateBookable(capacity, "2026-10-02", 5), false);
  assert.equal(isDateBookable(capacity, "2026-10-02", 1), true);
});

check("H1 isDateBookable: no capacity never blocks (P4)", () => {
  assert.equal(isDateBookable(null, "2026-10-02", 99), true);
});

check("H1 isDateBookable: invalid guests falls back to 1", () => {
  const capacity = capacityWith([
    booking({ travelDate: "2026-10-03", guests: 10 }),
  ]);
  assert.equal(isDateBookable(capacity, "2026-10-03", Number.NaN), false);
  assert.equal(isDateBookable(capacity, "2026-10-03", 0), false);
  assert.equal(isDateBookable(capacity, "2026-10-03", 1), false);
});

check("REQ sold out iff remaining <= 0, recalc after new booking", () => {
  const base = capacityWith([
    booking({ travelDate: "2026-10-02", guests: 7 }),
  ]);
  assert.equal(remainingSlots(base, "2026-10-02"), 3);
  assert.equal(isDateBookable(base, "2026-10-02", 4), false);
  // a new group of 3 confirms → 10 − (7+3) = 0 → sold out
  const after = capacityWith([
    booking({ reference: "VN-1", travelDate: "2026-10-02", guests: 7 }),
    booking({ reference: "VN-2", travelDate: "2026-10-02", guests: 3 }),
  ]);
  assert.equal(remainingSlots(after, "2026-10-02"), 0);
  assert.equal(isDateBookable(after, "2026-10-02", 1), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
