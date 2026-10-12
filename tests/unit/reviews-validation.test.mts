import assert from "node:assert/strict";
import {
  MAX_AUTHOR_EMAIL_CHARS,
  MAX_AUTHOR_NAME_CHARS,
  MAX_COMMENT_CHARS,
  MAX_IMAGE_CHARS,
  ReviewValidationError,
  validateReviewPayload,
} from "../../src/lib/reviews-validation.ts";

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

const NOW = "2026-10-07T12:00:00.000Z";
const IMAGE_PREFIX = "data:image/jpeg;base64,";

const validBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  reference: "VN-1:ha-giang-loop",
  tourSlug: "ha-giang-loop",
  bookingReference: "VN-1",
  authorName: "  An Nguyen  ",
  authorEmail: "an@example.com",
  rating: 4,
  comment: "  Great tour  ",
  images: [],
  createdAt: "2026-10-07T10:00:00Z",
  ...overrides,
});

const rejects = (body: unknown, reason: RegExp) =>
  assert.throws(
    () => validateReviewPayload(body, NOW),
    (error: unknown) => error instanceof ReviewValidationError && reason.test(error.message),
    `expected rejection matching ${reason}`
  );

check("V1 valid payload → trims text, normalizes createdAt to ISO", () => {
  const input = validateReviewPayload(validBody(), NOW);
  assert.equal(input.authorName, "An Nguyen");
  assert.equal(input.comment, "Great tour");
  assert.equal(input.createdAt, "2026-10-07T10:00:00.000Z");
  assert.equal(input.reference, "VN-1:ha-giang-loop");
  assert.deepEqual(input.images, []);
});

check("V2 absent createdAt stays undefined (server stamps the insert)", () => {
  const body = validBody();
  delete body.createdAt;
  assert.equal(validateReviewPayload(body, NOW).createdAt, undefined);
});

check("V3 non-object payloads rejected", () => {
  rejects(null, /invalid payload/);
  rejects(undefined, /invalid payload/);
  rejects("review", /invalid payload/);
  rejects([], /invalid payload/);
  rejects({}, /invalid tourSlug/);
});

check("V4 tourSlug boundaries: 120 ok, 121/uppercase/space rejected", () => {
  const longSlug = "a".repeat(120);
  const longBody = validBody({ tourSlug: longSlug, reference: `VN-1:${longSlug}` });
  assert.equal(validateReviewPayload(longBody, NOW).tourSlug, longSlug);
  rejects(validBody({ tourSlug: "a".repeat(121) }), /invalid tourSlug/);
  rejects(validBody({ tourSlug: "Ha-Giang" }), /invalid tourSlug/);
  rejects(validBody({ tourSlug: "ha giang" }), /invalid tourSlug/);
  rejects(validBody({ tourSlug: "" }), /invalid tourSlug/);
  rejects(validBody({ tourSlug: 42 }), /invalid tourSlug/);
});

check("V5 reference must match REFERENCE_RE and equal booking:slug", () => {
  rejects(validBody({ reference: "VN-1" }), /invalid reference/);
  rejects(validBody({ reference: "VN-2:ha-giang-loop" }), /invalid reference/);
  rejects(validBody({ reference: "VN-1:other-slug" }), /invalid reference/);
  rejects(validBody({ reference: "VN 1:ha-giang-loop" }), /invalid reference/);
  rejects(validBody({ bookingReference: "VN_1" }), /invalid bookingReference/);
  rejects(validBody({ bookingReference: "B".repeat(41) }), /invalid bookingReference/);
});

check("V6 rating must be an integer 1..5", () => {
  for (const rating of [1, 5]) {
    assert.equal(validateReviewPayload(validBody({ rating }), NOW).rating, rating);
  }
  for (const rating of [0, 6, -1, 2.5, "4", null]) {
    rejects(validBody({ rating }), /invalid rating/);
  }
});

check("V7 comment bounds: 1..2000 trimmed chars", () => {
  assert.equal(validateReviewPayload(validBody({ comment: "x".repeat(MAX_COMMENT_CHARS) }), NOW).comment.length, 2000);
  rejects(validBody({ comment: "x".repeat(MAX_COMMENT_CHARS + 1) }), /invalid comment/);
  rejects(validBody({ comment: "" }), /invalid comment/);
  rejects(validBody({ comment: "     " }), /invalid comment/);
  rejects(validBody({ comment: 7 }), /invalid comment/);
});

check("V8 authorName bounds: 1..80 trimmed chars", () => {
  assert.equal(validateReviewPayload(validBody({ authorName: "n".repeat(MAX_AUTHOR_NAME_CHARS) }), NOW).authorName.length, 80);
  rejects(validBody({ authorName: "n".repeat(MAX_AUTHOR_NAME_CHARS + 1) }), /invalid authorName/);
  rejects(validBody({ authorName: "" }), /invalid authorName/);
  rejects(validBody({ authorName: "   " }), /invalid authorName/);
});

check("V9 authorEmail: ≤200 chars, contains @, no whitespace", () => {
  const atMax = `${"a".repeat(MAX_AUTHOR_EMAIL_CHARS - 2)}@b`;
  assert.equal(atMax.length, 200);
  assert.equal(validateReviewPayload(validBody({ authorEmail: atMax }), NOW).authorEmail, atMax);
  rejects(validBody({ authorEmail: `${"a".repeat(MAX_AUTHOR_EMAIL_CHARS - 1)}@b` }), /invalid authorEmail/);
  rejects(validBody({ authorEmail: "plainaddress" }), /invalid authorEmail/);
  rejects(validBody({ authorEmail: "a b@example.com" }), /invalid authorEmail/);
  rejects(validBody({ authorEmail: "" }), /invalid authorEmail/);
});

check("V10 images: ≤3 entries, ≤300k chars, raster data-url prefix only", () => {
  const image = `${IMAGE_PREFIX}${"A".repeat(MAX_IMAGE_CHARS - IMAGE_PREFIX.length)}`;
  assert.equal(image.length, MAX_IMAGE_CHARS);
  const three = [image, image, image];
  assert.deepEqual(validateReviewPayload(validBody({ images: three }), NOW).images, three);
  rejects(validBody({ images: [...three, image] }), /invalid images/);
  rejects(validBody({ images: [`${image}A`] }), /invalid images/);
  rejects(validBody({ images: ["data:image/svg+xml;base64,AAAA"] }), /invalid images/);
  rejects(validBody({ images: ["https://example.com/x.png"] }), /invalid images/);
  rejects(validBody({ images: [42] }), /invalid images/);
  rejects(validBody({ images: "not-an-array" }), /invalid images/);
});

check("V11 createdAt bounds: ≥2020-01-01, ≤now+60s, parseable", () => {
  const skewed = new Date(Date.parse(NOW) + 60_000).toISOString();
  assert.equal(validateReviewPayload(validBody({ createdAt: skewed }), NOW).createdAt, skewed);
  rejects(validBody({ createdAt: new Date(Date.parse(NOW) + 60_001).toISOString() }), /future/);
  assert.equal(
    validateReviewPayload(validBody({ createdAt: "2020-01-01T00:00:00.000Z" }), NOW).createdAt,
    "2020-01-01T00:00:00.000Z"
  );
  rejects(validBody({ createdAt: "2019-12-31T23:59:59.999Z" }), /before 2020/);
  rejects(validBody({ createdAt: "not a date" }), /invalid createdAt/);
  rejects(validBody({ createdAt: 1_700_000_000_000 }), /invalid createdAt/);
});

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
