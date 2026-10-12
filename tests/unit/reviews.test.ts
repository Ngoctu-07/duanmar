import assert from "node:assert/strict";
import {
  clearLocalReviews,
  dropLocalReview,
  formatRating,
  hasBookingForSlug,
  isMyReview,
  isReview,
  listReviews,
  reviewsForSlug,
  REVIEWS_STORAGE_KEY,
  type TourReview,
} from "../../src/lib/reviews.ts";
import { BOOKINGS_STORAGE_KEY } from "../../src/lib/booking-history.ts";

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

const review = (overrides: Partial<TourReview> = {}): TourReview => ({
  reference: "VN-1:hcm",
  tourSlug: "hcm",
  authorName: "An Nguyen",
  authorEmail: "an@example.com",
  rating: 4,
  comment: "Great tour",
  images: [],
  createdAt: "2026-09-01T00:00:00.000Z",
  bookingReference: "VN-1",
  ...overrides,
});

type FakeStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function stubWindow(options: { data?: string; throwOnWrite?: boolean } = {}) {
  const store = new Map<string, string>();
  if (options.data !== undefined) store.set(REVIEWS_STORAGE_KEY, options.data);
  const storage: FakeStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      if (options.throwOnWrite) throw new Error("QuotaExceededError");
      store.set(key, value);
    },
    removeItem: (key) => store.delete(key),
  };
  const previous = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = { localStorage: storage };
  return {
    store,
    restore: () => {
      if (previous === undefined) delete (globalThis as { window?: unknown }).window;
      else (globalThis as { window?: unknown }).window = previous;
    },
  };
}

check("isReview accepts a full valid record", () => {
  assert.equal(isReview(review()), true);
});

check("isReview rejects missing/invalid fields", () => {
  const missingField: Record<string, unknown> = { ...review() };
  delete missingField.bookingReference;
  assert.equal(isReview(missingField), false);
  assert.equal(isReview({ ...review(), rating: 0 }), false);
  assert.equal(isReview({ ...review(), rating: 6 }), false);
  assert.equal(isReview({ ...review(), rating: 2.5 }), false);
  assert.equal(isReview({ ...review(), images: "nope" }), false);
  assert.equal(isReview({ ...review(), images: [1] }), false);
  assert.equal(isReview({ ...review(), createdAt: 123 }), false);
  assert.equal(isReview({ ...review(), comment: undefined }), false);
  assert.equal(isReview(null), false);
  assert.equal(isReview("review"), false);
});

check("formatRating always renders one decimal", () => {
  assert.equal(formatRating(3.5), "3.5");
  assert.equal(formatRating(4), "4.0");
  assert.equal(formatRating(4.25), "4.3");
  assert.equal(formatRating(2.96), "3.0");
});

check("reviewsForSlug filters and sorts newest first", () => {
  const reviews = [
    review({ reference: "old:hcm", createdAt: "2026-09-01" }),
    review({ reference: "new:hcm", createdAt: "2026-09-09" }),
    review({ reference: "x:dn", tourSlug: "dn", createdAt: "2026-09-09" }),
  ];
  const list = reviewsForSlug(reviews, "hcm");
  assert.deepEqual(
    list.map((entry) => entry.reference),
    ["new:hcm", "old:hcm"]
  );
});

check("hasBookingForSlug matches slug only", () => {
  const harness = stubWindow();
  try {
    const booking = {
      reference: "VN-1",
      slug: "hcm",
      tourName: "HCM",
      travelDate: "2026-10-02",
      fullName: "Probe",
      email: "probe@example.com",
      phone: "0900000000",
      notes: "",
      guests: 1,
      difficulty: "easy",
      pricePerGuest: null,
      total: null,
      currency: "VND",
      locale: "vi",
      paidAt: "2026-09-01T00:00:00.000Z",
    };
    harness.store.set(BOOKINGS_STORAGE_KEY, JSON.stringify([booking]));
    assert.equal(hasBookingForSlug("hcm"), true);
    assert.equal(hasBookingForSlug("dn"), false);
    harness.store.delete(BOOKINGS_STORAGE_KEY);
    assert.equal(hasBookingForSlug("hcm"), false);
  } finally {
    harness.restore();
  }
});

check("listReviews: no window / corrupt / non-array all return []", () => {
  delete (globalThis as { window?: unknown }).window;
  assert.deepEqual(listReviews(), []);
  let harness = stubWindow({ data: "{not json" });
  try {
    assert.deepEqual(listReviews(), []);
  } finally {
    harness.restore();
  }
  harness = stubWindow({ data: '{"nope":true}' });
  try {
    assert.deepEqual(listReviews(), []);
  } finally {
    harness.restore();
  }
});

check("listReviews filters invalid entries and sorts newest first", () => {
  const harness = stubWindow({
    data: JSON.stringify([
      review({ reference: "old:hcm", createdAt: "2026-09-01" }),
      review({ reference: "bad", rating: 99 }),
      review({ reference: "new:hcm", createdAt: "2026-09-09" }),
    ]),
  });
  try {
    assert.deepEqual(
      listReviews().map((entry) => entry.reference),
      ["new:hcm", "old:hcm"]
    );
  } finally {
    harness.restore();
  }
});

check("dropLocalReview removes only the target reference", () => {
  const harness = stubWindow({
    data: JSON.stringify([
      review({ reference: "VN-1:hcm" }),
      review({ reference: "VN-2:hcm" }),
    ]),
  });
  try {
    dropLocalReview("VN-1:hcm");
    const list = listReviews();
    assert.equal(list.length, 1);
    assert.equal(list[0].reference, "VN-2:hcm");
    dropLocalReview("does-not-exist");
    assert.equal(listReviews().length, 1);
  } finally {
    harness.restore();
  }
});

check("dropLocalReview without a key is a no-op; clearLocalReviews wipes it", () => {
  const harness = stubWindow();
  try {
    dropLocalReview("VN-1:hcm");
    assert.equal(harness.store.has(REVIEWS_STORAGE_KEY), false);
    harness.store.set(REVIEWS_STORAGE_KEY, JSON.stringify([review()]));
    clearLocalReviews();
    assert.equal(harness.store.has(REVIEWS_STORAGE_KEY), false);
    assert.deepEqual(listReviews(), []);
  } finally {
    harness.restore();
  }
});

check("isMyReview: booking match → true, other booking → false, no window → false", () => {
  const harness = stubWindow();
  try {
    const booking = {
      reference: "VN-1",
      slug: "hcm",
      tourName: "HCM",
      travelDate: "2026-10-02",
      fullName: "Probe",
      email: "probe@example.com",
      phone: "0900000000",
      notes: "",
      guests: 1,
      difficulty: "easy",
      pricePerGuest: null,
      total: null,
      currency: "VND",
      locale: "vi",
      paidAt: "2026-09-01T00:00:00.000Z",
    };
    harness.store.set(BOOKINGS_STORAGE_KEY, JSON.stringify([booking]));
    assert.equal(isMyReview(review({ bookingReference: "VN-1" })), true);
    assert.equal(isMyReview(review({ bookingReference: "VN-9" })), false);
    delete (globalThis as { window?: unknown }).window;
    assert.equal(isMyReview(review({ bookingReference: "VN-1" })), false);
  } finally {
    harness.restore();
  }
});

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
