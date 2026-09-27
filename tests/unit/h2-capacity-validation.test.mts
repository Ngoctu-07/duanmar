import assert from "node:assert/strict";
import {
  travelDateErrorAfterGuestsChange,
  validateBooking,
  type BookingValues,
} from "../../src/components/booking/booking-validation.ts";
import {
  mapTourCapacity,
  mergeDeviceBookings,
} from "../../src/lib/tour-capacity.ts";
import { travelDateWindow, parseIsoDate, addDays, toIsoDate } from "../../src/lib/date-window.ts";

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

const base: BookingValues = {
  fullName: "Nguyen Van A",
  email: "a@example.com",
  phone: "0900000000",
  notes: "",
  travelDate: travelDateWindow(new Date()).min,
  guests: "1",
  difficulty: "easy",
};

/** Capacity built the way the app builds it: global max − device bookings. */
const capacityOn = (
  date: string,
  booked: number,
  max = 10
): ReturnType<typeof mapTourCapacity> =>
  mergeDeviceBookings(
    mapTourCapacity({ maxCapacity: max }),
    "hcm",
    booked > 0
      ? [
          {
            reference: "VN-9",
            slug: "hcm",
            tourName: "Saigon",
            travelDate: date,
            fullName: "A",
            email: "a@b.c",
            phone: "0900000000",
            notes: "",
            guests: booked,
            difficulty: "easy",
            pricePerGuest: 100,
            total: booked * 100,
            currency: "VND",
            locale: "vi",
            paidAt: "2026-10-01T00:00:00.000Z",
          },
        ]
      : []
  );

// remaining 1 → guests "1" ok, "2" → dateFull
const capacityFull = capacityOn(base.travelDate, 9);
// remaining 8 → guests "8" ok (boundary)
const capacityFree = capacityOn(base.travelDate, 2);

check("H2 valid form with enough spots → no errors", () => {
  assert.deepEqual(validateBooking(base, capacityFull), {});
});

check("H2 guests > remaining → travelDate=dateFull", () => {
  const errors = validateBooking({ ...base, guests: "2" }, capacityFull);
  assert.equal(errors.travelDate, "dateFull");
  assert.equal(errors.guests, undefined);
});

check("H2 guests == remaining → ok (boundary)", () => {
  assert.deepEqual(validateBooking({ ...base, guests: "1" }, capacityFull), {});
  assert.deepEqual(validateBooking({ ...base, guests: "8" }, capacityFree), {});
});

check("H2 no capacity (null) → dateFull never fires (P4)", () => {
  assert.deepEqual(validateBooking({ ...base, guests: "99" }, null), {});
  assert.deepEqual(validateBooking({ ...base, guests: "99" }), {});
});

check("H2 dateRequired wins over capacity check", () => {
  const errors = validateBooking({ ...base, travelDate: "" }, capacityFull);
  assert.equal(errors.travelDate, "dateRequired");
});

check("H2 dateOutOfRange wins over dateFull", () => {
  const window = travelDateWindow(new Date());
  const pastMax = toIsoDate(addDays(parseIsoDate(window.max)!, 1));
  const capacityPast = capacityOn(pastMax, 9);
  const errors = validateBooking({ ...base, travelDate: pastMax, guests: "2" }, capacityPast);
  assert.equal(errors.travelDate, "dateOutOfRange");
});

check("H2 invalid guests → guests error, no dateFull (no double error)", () => {
  const errors = validateBooking({ ...base, guests: "0" }, capacityFull);
  assert.equal(errors.guests, "guestsInvalid");
  assert.equal(errors.travelDate, undefined);
});

check("H2 device bookings pushed the date over capacity", () => {
  const merged = capacityOn(base.travelDate, 9);
  const errors = validateBooking({ ...base, guests: "2" }, merged);
  assert.equal(errors.travelDate, "dateFull");
  assert.deepEqual(validateBooking({ ...base, guests: "1" }, merged), {});
});

check("H2 guests-change: bump guests over remaining → dateFull", () => {
  assert.equal(
    travelDateErrorAfterGuestsChange(undefined, base.travelDate, 2, capacityFull),
    "dateFull"
  );
});

check("H2 guests-change: dateFull cleared when count fits again", () => {
  assert.equal(
    travelDateErrorAfterGuestsChange("dateFull", base.travelDate, 1, capacityFull),
    undefined
  );
});

check("H2 guests-change: stays dateFull while still over", () => {
  assert.equal(
    travelDateErrorAfterGuestsChange("dateFull", base.travelDate, 2, capacityFull),
    "dateFull"
  );
});

check("H2 guests-change: no capacity → never dateFull (P4)", () => {
  assert.equal(
    travelDateErrorAfterGuestsChange(undefined, base.travelDate, 99, null),
    undefined
  );
  assert.equal(
    travelDateErrorAfterGuestsChange(undefined, base.travelDate, 99),
    undefined
  );
});

check("H2 guests-change: dateRequired / dateOutOfRange kept", () => {
  assert.equal(
    travelDateErrorAfterGuestsChange("dateRequired", "", 1, capacityFull),
    "dateRequired"
  );
  assert.equal(
    travelDateErrorAfterGuestsChange("dateOutOfRange", base.travelDate, 9, capacityFull),
    "dateOutOfRange"
  );
});

check("H2 guests-change: invalid guests → no dateFull, keep prior state", () => {
  assert.equal(
    travelDateErrorAfterGuestsChange(undefined, base.travelDate, 0, capacityFull),
    undefined
  );
  assert.equal(
    travelDateErrorAfterGuestsChange(undefined, base.travelDate, Number("x"), capacityFull),
    undefined
  );
});

check("H2 guests-change: over MAX_GUESTS (100) → no dateFull (guests field's job)", () => {
  assert.equal(
    travelDateErrorAfterGuestsChange(undefined, base.travelDate, 100, capacityFull),
    undefined
  );
  assert.equal(
    validateBooking({ ...base, guests: "100" }, capacityFull).travelDate,
    undefined
  );
  assert.equal(validateBooking({ ...base, guests: "100" }, capacityFull).guests, "guestsInvalid");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
