import assert from "node:assert/strict";
import {
  resolveTierForGuests,
  type PriceTier,
} from "../../src/lib/pricing.ts";
import { travelDateWindow } from "../../src/lib/date-window.ts";
import {
  validateBooking,
  type BookingValues,
} from "../../src/components/booking/booking-validation.ts";
import { buildTicketRows } from "../../src/components/booking/ticket-rows.ts";
import { listBookings, BOOKINGS_STORAGE_KEY } from "../../src/lib/booking-history.ts";

let passed = 0;
let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
}

const tier = (min: number, max: number | null, price: number): PriceTier => ({
  minGuests: min,
  maxGuests: max,
  pricePerGuest: price,
  groupTotal: price * min,
});

const TIERS = [tier(1, 3, 150000), tier(4, 7, 350000), tier(8, null, 500000)];

check("B1: matches tier boundaries (first / last / open-ended)", () => {
  assert.equal(resolveTierForGuests(TIERS, 1)?.pricePerGuest, 150000);
  assert.equal(resolveTierForGuests(TIERS, 3)?.pricePerGuest, 150000);
  assert.equal(resolveTierForGuests(TIERS, 4)?.pricePerGuest, 350000);
  assert.equal(resolveTierForGuests(TIERS, 7)?.pricePerGuest, 350000);
  assert.equal(resolveTierForGuests(TIERS, 8)?.pricePerGuest, 500000);
  assert.equal(resolveTierForGuests(TIERS, 99)?.pricePerGuest, 500000);
});

check("B1: invalid guest counts → null", () => {
  assert.equal(resolveTierForGuests(TIERS, 0), null);
  assert.equal(resolveTierForGuests(TIERS, -3), null);
  assert.equal(resolveTierForGuests(TIERS, 1.5), null);
  assert.equal(resolveTierForGuests(TIERS, Number.NaN), null);
  assert.equal(resolveTierForGuests([], 2), null);
});

check("B1: guest count outside every tier clamps to the nearest tier", () => {
  assert.equal(resolveTierForGuests([tier(2, 4, 100)], 1)?.minGuests, 2, "below first tier");
  assert.equal(resolveTierForGuests([tier(3, 4, 100)], 50)?.maxGuests, 4, "above last tier");
});

check("B1: unsorted tiers still resolve by range, not order", () => {
  const unsorted = [tier(8, null, 500000), tier(1, 3, 150000), tier(4, 7, 350000)];
  assert.equal(resolveTierForGuests(unsorted, 5)?.pricePerGuest, 350000);
});

check("B1: count inside an authored gap falls to the nearest range", () => {
  const gapped = [tier(1, 2, 100), tier(5, 8, 300), tier(12, null, 500)];
  assert.equal(resolveTierForGuests(gapped, 3)?.pricePerGuest, 100, "closer to 1-2");
  assert.equal(resolveTierForGuests(gapped, 4)?.pricePerGuest, 300, "closer to 5-8");
  assert.equal(resolveTierForGuests(gapped, 10)?.pricePerGuest, 300, "tie → earlier tier");
  assert.equal(resolveTierForGuests(gapped, 11)?.pricePerGuest, 500, "closer to 12+");
});

const base: BookingValues = {
  fullName: "Nguyen Van A",
  email: "a@b.co",
  phone: "0912345678",
  notes: "",
  travelDate: travelDateWindow(new Date()).min,
  guests: "2",
  difficulty: "medium",
};

check("B2: valid values → no errors", () => {
  assert.deepEqual(validateBooking(base), {});
});

check("B2: empty form (standard tour) → required errors, no difficulty rule", () => {
  const errors = validateBooking({
    fullName: "",
    email: "",
    phone: "",
    notes: "",
    travelDate: "",
    guests: "",
    difficulty: "",
  });
  assert.deepEqual(errors, {
    fullName: "requiredName",
    email: "emailRequired",
    phone: "phoneRequired",
    travelDate: "dateRequired",
    guests: "guestsRequired",
  });
});

check("B2: empty form (special tour) → also requires difficulty", () => {
  const errors = validateBooking(
    {
      fullName: "",
      email: "",
      phone: "",
      notes: "",
      travelDate: "",
      guests: "",
      difficulty: "",
    },
    undefined,
    true
  );
  assert.deepEqual(errors, {
    fullName: "requiredName",
    email: "emailRequired",
    phone: "phoneRequired",
    travelDate: "dateRequired",
    guests: "guestsRequired",
    difficulty: "difficultyRequired",
  });
});

check("B2: name too short", () => {
  assert.equal(validateBooking({ ...base, fullName: "A" }).fullName, "nameTooShort");
  assert.equal(validateBooking({ ...base, fullName: "  " }).fullName, "requiredName");
});

check("B2: email format", () => {
  assert.equal(validateBooking({ ...base, email: "a@b" }).email, "emailInvalid");
  assert.equal(validateBooking({ ...base, email: "a b@c.co" }).email, "emailInvalid");
  assert.equal(validateBooking({ ...base, email: "user+tag@mail.co" }).email, undefined);
});

check("B2: phone format (spaces, +, 8-15 digits)", () => {
  assert.equal(validateBooking({ ...base, phone: "12" }).phone, "phoneInvalid");
  assert.equal(validateBooking({ ...base, phone: "abc" }).phone, "phoneInvalid");
  assert.equal(validateBooking({ ...base, phone: "+84 912 345 678" }).phone, undefined);
  assert.equal(validateBooking({ ...base, phone: "0912-345-678" }).phone, undefined);
});

check("B2: guests must be integer 1..99", () => {
  assert.equal(validateBooking({ ...base, guests: "0" }).guests, "guestsInvalid");
  assert.equal(validateBooking({ ...base, guests: "100" }).guests, "guestsInvalid");
  assert.equal(validateBooking({ ...base, guests: "2.5" }).guests, "guestsInvalid");
  assert.equal(validateBooking({ ...base, guests: "99" }).guests, undefined);
});

check("B2: difficulty required only on special tours", () => {
  const without = { ...base, difficulty: "" };
  assert.equal(
    validateBooking(without, undefined, true).difficulty,
    "difficultyRequired",
    "special tour → required"
  );
  assert.equal(
    validateBooking(without, undefined, false).difficulty,
    undefined,
    "standard tour → never required"
  );
  assert.equal(
    validateBooking(without).difficulty,
    undefined,
    "flag omitted → treated as standard"
  );
});

check("B2: notes never validated (optional)", () => {
  assert.equal(validateBooking({ ...base, notes: "" }).notes, undefined);
});

check("B3: difficulty ticket row only when a pick exists", () => {
  const t = (key: string) => key;
  const rowsFor = (difficulty: string) =>
    buildTicketRows({
      t: t as never,
      reference: "VN-TEST",
      tourName: "Saigon",
      values: { ...base, difficulty },
      guestCount: 2,
      total: 300000,
      locale: "vi",
      currency: "VND",
    });
  const labels = rowsFor("").map((row) => row.label);
  assert.ok(
    !labels.includes("difficulty"),
    `no difficulty row for standard tours: ${JSON.stringify(labels)}`
  );
  const row = rowsFor("medium").find((entry) => entry.label === "difficulty");
  assert.ok(row && row.value === "medium", JSON.stringify(row));
});

check("B3: listBookings keeps records without difficulty (standard tours)", () => {
  const store = new Map<string, string>();
  const previous = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
  try {
    const record = {
      reference: "VN-TEST",
      slug: "hcm",
      tourName: "Saigon",
      travelDate: "2026-10-02",
      fullName: "A",
      email: "a@b.co",
      phone: "0912345678",
      notes: "",
      guests: 2,
      pricePerGuest: 150000,
      total: 300000,
      currency: "VND",
      locale: "vi",
      paidAt: "2026-09-28T00:00:00.000Z",
    };
    // Standard tour: no difficulty key at all → kept (AC3 data-loss guard).
    store.set(BOOKINGS_STORAGE_KEY, JSON.stringify([record]));
    assert.equal(listBookings().length, 1, "record without difficulty kept");
    // Legacy record with an empty difficulty string → still kept.
    store.set(BOOKINGS_STORAGE_KEY, JSON.stringify([{ ...record, difficulty: "" }]));
    assert.equal(listBookings().length, 1, "legacy empty difficulty kept");
    // Corrupted type → filtered like any other bad field.
    store.set(BOOKINGS_STORAGE_KEY, JSON.stringify([{ ...record, difficulty: 123 }]));
    assert.equal(listBookings().length, 0, "non-string difficulty filtered");
  } finally {
    if (previous === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = previous;
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
