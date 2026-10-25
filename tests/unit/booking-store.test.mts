import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TripBooking } from "../../src/lib/booking-history.ts";

let passed = 0;
let failed = 0;
const check = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const dir = mkdtempSync(join(tmpdir(), "duanmar-bookings-"));
process.env.VN_INTERACTIONS_DB_PATH = join(dir, "test.db");
delete process.env.TURSO_DATABASE_URL;

const { createUser } = await import("../../src/lib/auth/user-store.ts");
const {
  saveBookingForUser,
  listBookingsForUser,
  getBookingForUser,
  clearBookingsForUser,
} = await import("../../src/lib/bookings/booking-store.ts");
const { mergeBookings } = await import("../../src/lib/booking-history.ts");

const owner = await createUser({
  email: "owner@duanmar.test",
  name: "Owner",
  password: "booking-owner",
});
const other = await createUser({
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

await check("paid ticket is persisted to the account", async () => {
  assert.equal(await saveBookingForUser(ownerId, base), true);
  const rows = await listBookingsForUser(ownerId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].reference, "VN-BOOK-1");
  assert.equal(rows[0].tourName, "HCM Ghost Tour");
});

await check("re-paying the same reference upserts instead of duplicating", async () => {
  await saveBookingForUser(ownerId, { ...base, paymentMethod: "bank" });
  const rows = await listBookingsForUser(ownerId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].paymentMethod, "bank");
});

await check("tickets are scoped to the signed-in account", async () => {
  assert.equal((await listBookingsForUser(otherId)).length, 0);
  assert.equal(await getBookingForUser(otherId, "VN-BOOK-1"), null);
});

await check("fresh read by reference (ticket detail across sessions)", async () => {
  assert.equal((await getBookingForUser(ownerId, "VN-BOOK-1"))?.tourName, "HCM Ghost Tour");
  assert.equal(await getBookingForUser(ownerId, "VN-UNKNOWN"), null);
});

await check("malformed payloads are rejected before hitting the table", async () => {
  assert.equal(await saveBookingForUser(ownerId, { ...base, reference: "" }), false);
  assert.equal(await saveBookingForUser(ownerId, { ...base, guests: 0 } as TripBooking), false);
  assert.equal((await listBookingsForUser(ownerId)).length, 1);
});

await check("multiple trips list newest first", async () => {
  await saveBookingForUser(ownerId, {
    ...base,
    reference: "VN-BOOK-2",
    paidAt: "2026-10-23T10:00:00.000Z",
  });
  const rows = await listBookingsForUser(ownerId);
  assert.deepEqual(rows.map((row) => row.reference), ["VN-BOOK-2", "VN-BOOK-1"]);
});

await check("clear removes only that account's trips", async () => {
  assert.equal(await clearBookingsForUser(ownerId), true);
  assert.equal((await listBookingsForUser(ownerId)).length, 0);
  assert.equal(await clearBookingsForUser(otherId), true);
});

await check("mergeBookings dedupes by reference and lets the server row win", async () => {
  const local = [{ ...base, reference: "A", tourName: "Local A", paidAt: "2026-01-01T00:00:00.000Z" }];
  const server = [{ ...base, reference: "A", tourName: "Server A", paidAt: "2026-01-01T00:00:00.000Z" }];
  const merged = mergeBookings(server, local);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].tourName, "Server A");
});

await check("mergeBookings keeps local-only legacy tickets", async () => {
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
