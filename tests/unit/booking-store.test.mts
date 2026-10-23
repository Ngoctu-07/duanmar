import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TripBooking } from "../../src/lib/booking-history.ts";

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

const dir = mkdtempSync(join(tmpdir(), "duanmar-bookings-"));
process.env.VN_INTERACTIONS_DB_PATH = join(dir, "test.db");

const { createUser } = await import("../../src/lib/auth/user-store.ts");
const {
  saveBookingForUser,
  listBookingsForUser,
  getBookingForUser,
  clearBookingsForUser,
} = await import("../../src/lib/bookings/booking-store.ts");
const { mergeBookings } = await import("../../src/lib/booking-history.ts");

const owner = createUser({
  email: "owner@duanmar.test",
  name: "Owner",
  password: "booking-owner",
});
const other = createUser({
  email: "other@duanmar.test",
  name: "Other",
  password: "booking-other",
});
assert.equal(owner.ok, true);
assert.equal(other.ok, true);
const ownerId = owner.ok ? owner.user.id : "";
const otherId = other.ok ? other.user.id : "";

const base: TripBooking = {
  reference: "VN-BOOK-1",
  slug: "hcm",
  tourName: "HCM Ghost Tour",
  travelDate: "2026-11-01",
  fullName: "Owner",
  email: "owner@duanmar.test",
  phone: "0900000000",
  notes: "",
  guests: 2,
  pricePerGuest: 500000,
  total: 1000000,
  currency: "VND",
  locale: "vi",
  paidAt: "2026-10-22T10:00:00.000Z",
  paymentMethod: "momo",
};

check("paid ticket is persisted to the account", () => {
  assert.equal(saveBookingForUser(ownerId, base), true);
  const rows = listBookingsForUser(ownerId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].reference, "VN-BOOK-1");
  assert.equal(rows[0].tourName, "HCM Ghost Tour");
});

check("re-paying the same reference upserts instead of duplicating", () => {
  saveBookingForUser(ownerId, { ...base, paymentMethod: "bank" });
  const rows = listBookingsForUser(ownerId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].paymentMethod, "bank");
});

check("tickets are scoped to the signed-in account", () => {
  assert.equal(listBookingsForUser(otherId).length, 0);
  assert.equal(getBookingForUser(otherId, "VN-BOOK-1"), null);
});

check("fresh read by reference (ticket detail across sessions)", () => {
  assert.equal(getBookingForUser(ownerId, "VN-BOOK-1")?.tourName, "HCM Ghost Tour");
  assert.equal(getBookingForUser(ownerId, "VN-UNKNOWN"), null);
});

check("malformed payloads are rejected before hitting the table", () => {
  assert.equal(saveBookingForUser(ownerId, { ...base, reference: "" }), false);
  assert.equal(saveBookingForUser(ownerId, { ...base, guests: 0 } as TripBooking), false);
  assert.equal(listBookingsForUser(ownerId).length, 1);
});

check("multiple trips list newest first", () => {
  saveBookingForUser(ownerId, {
    ...base,
    reference: "VN-BOOK-2",
    paidAt: "2026-10-23T10:00:00.000Z",
  });
  const rows = listBookingsForUser(ownerId);
  assert.deepEqual(rows.map((row) => row.reference), ["VN-BOOK-2", "VN-BOOK-1"]);
});

check("clear removes only that account's trips", () => {
  assert.equal(clearBookingsForUser(ownerId), true);
  assert.equal(listBookingsForUser(ownerId).length, 0);
  assert.equal(clearBookingsForUser(otherId), true);
});

check("mergeBookings dedupes by reference and lets the server row win", () => {
  const local = [{ ...base, reference: "A", tourName: "Local A", paidAt: "2026-01-01T00:00:00.000Z" }];
  const server = [{ ...base, reference: "A", tourName: "Server A", paidAt: "2026-01-01T00:00:00.000Z" }];
  const merged = mergeBookings(server, local);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].tourName, "Server A");
});

check("mergeBookings keeps local-only legacy tickets", () => {
  const local = [{ ...base, reference: "LEGACY", paidAt: "2026-01-01T00:00:00.000Z" }];
  const server = [{ ...base, reference: "SERVER", paidAt: "2026-02-01T00:00:00.000Z" }];
  const merged = mergeBookings(server, local);
  assert.deepEqual(merged.map((row) => row.reference), ["SERVER", "LEGACY"]);
});

// Windows keeps the SQLite handle open for the process lifetime.
try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  // ignore EPERM from the still-open node:sqlite handle
}
console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
