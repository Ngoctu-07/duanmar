import assert from "node:assert/strict";
import {
  EMAIL_CLOSING_EN,
  EMAIL_CLOSING_VI,
  EMAIL_FOOTER_DISCLAIMER_EN,
  EMAIL_FOOTER_DISCLAIMER_VI,
  EMAIL_SIGN_OFF,
  buildConfirmationSubject,
  formatTravelDate,
  renderConfirmationEmail,
} from "../../src/lib/email/confirmation-email-template.ts";
import { validateBookingConfirmation } from "../../src/lib/booking-email-validation.ts";
import {
  DEFAULT_CONFIRMATION_EMAIL_DELAY_MS,
  enqueueConfirmationEmail,
  getConfirmationEmailDelayMs,
  getConfirmationEmailJob,
} from "../../src/lib/email/confirmation-email-queue.ts";
import type { BookingConfirmationPayload } from "../../src/lib/email/email-types.ts";

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

const payload: BookingConfirmationPayload = {
  reference: "VN-TEST123",
  slug: "ha-giang-loop",
  tourName: "Ha Giang Loop 4D3N",
  fullName: "Nguyen Van A",
  email: "customer@example.com",
  phone: "+84901234567",
  travelDate: "2026-10-05",
  guests: 4,
  total: 1_500_000,
  currency: "VND",
  paymentMethod: "momo",
  notes: "Vegetarian meals please",
  locale: "vi",
};

check("C1 subject exact per spec", () => {
  assert.equal(
    buildConfirmationSubject("VN-TEST123"),
    "[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - VN-TEST123"
  );
  assert.equal(
    renderConfirmationEmail(payload).subject,
    "[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - VN-TEST123"
  );
});

check("C2 travel date ISO → DD/MM/YYYY", () => {
  assert.equal(formatTravelDate("2026-10-05"), "05/10/2026");
  assert.equal(formatTravelDate("2026-01-09"), "09/01/2026");
  assert.equal(formatTravelDate("garbage"), "garbage");
});

check("C3 all payload fields hydrated in HTML", () => {
  const { html } = renderConfirmationEmail(payload);
  for (const needle of [
    "Nguyen Van A",
    "customer@example.com",
    "+84901234567",
    "05/10/2026",
    "Ha Giang Loop 4D3N",
    "VN-TEST123",
    "Vegetarian meals please",
    "MoMo E-wallet / Ví MoMo",
  ]) {
    assert.ok(html.includes(needle), `missing: ${needle}`);
  }
  assert.match(html, /1[.,]500[.,]000/); // locale-format VND total
});

check("C4 guests + both payment methods bilingual", () => {
  const momo = renderConfirmationEmail(payload).html;
  assert.ok(momo.includes("Số lượng khách"));
  assert.ok(momo.includes("Guests"));
  const bank = renderConfirmationEmail({ ...payload, paymentMethod: "bank" }).html;
  assert.ok(bank.includes("Bank Transfer / Chuyển khoản ngân hàng"));
});

check("C5 mandatory footer disclaimer + closing + sign-off (both languages)", () => {
  const { html } = renderConfirmationEmail(payload);
  assert.ok(html.includes(EMAIL_FOOTER_DISCLAIMER_EN));
  assert.ok(html.includes(EMAIL_FOOTER_DISCLAIMER_VI));
  assert.ok(html.includes(EMAIL_CLOSING_EN));
  assert.ok(html.includes(EMAIL_CLOSING_VI));
  assert.ok(html.includes(EMAIL_SIGN_OFF));
  assert.ok(html.includes("DuanMar"));
});

check("C6 empty notes → bilingual None placeholder", () => {
  const { html } = renderConfirmationEmail({ ...payload, notes: "  " });
  assert.ok(html.includes("None / Không có"));
  assert.ok(!html.includes("Vegetarian"));
});

check("C7 XSS: user input escaped", () => {
  const { html } = renderConfirmationEmail({
    ...payload,
    fullName: '<script>alert("xss")</script>',
    notes: '<img src=x onerror=alert(1)>',
  });
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
});

// ---- validation ----
check("V1 valid payload → ok + normalized", () => {
  const result = validateBookingConfirmation(payload);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.payload.reference, "VN-TEST123");
    assert.equal(result.payload.paymentMethod, "momo");
    assert.equal(result.payload.notes, "Vegetarian meals please");
  }
});

check("V2 invalid fields rejected", () => {
  const base = { ...payload } as Record<string, unknown>;
  const cases: Array<[string, Record<string, unknown>]> = [
    ["bad email", { ...base, email: "not-an-email" }],
    ["zero guests", { ...base, guests: 0 }],
    ["bad reference", { ...base, reference: "ORDER-1" }],
    ["bad paymentMethod", { ...base, paymentMethod: "cash" }],
    ["bad locale", { ...base, locale: "fr" }],
    ["negative total", { ...base, total: -1 }],
    ["bad travelDate", { ...base, travelDate: "05/10/2026" }],
    ["notes too long", { ...base, notes: "x".repeat(501) }],
    ["non-object", "nope" as unknown as Record<string, unknown>],
  ];
  for (const [name, input] of cases) {
    const result = validateBookingConfirmation(input);
    assert.equal(result.ok, false, `${name} should fail`);
  }
});

check("V3 optional notes omitted → valid, empty string", () => {
  const withoutNotes: Record<string, unknown> = { ...payload };
  delete withoutNotes.notes;
  const result = validateBookingConfirmation(withoutNotes);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.payload.notes, "");
});

// ---- delay queue ----
check("Q1 default delay = 120000 ms", () => {
  assert.equal(DEFAULT_CONFIRMATION_EMAIL_DELAY_MS, 120000);
  delete process.env.BOOKING_EMAIL_DELAY_MS;
  assert.equal(getConfirmationEmailDelayMs(), 120000);
});

check("Q2 env override honored; garbage → default", () => {
  process.env.BOOKING_EMAIL_DELAY_MS = "5000";
  assert.equal(getConfirmationEmailDelayMs(), 5000);
  process.env.BOOKING_EMAIL_DELAY_MS = "not-a-number";
  assert.equal(getConfirmationEmailDelayMs(), 120000);
  process.env.BOOKING_EMAIL_DELAY_MS = "-1";
  assert.equal(getConfirmationEmailDelayMs(), 120000);
  delete process.env.BOOKING_EMAIL_DELAY_MS;
});

check("Q3 enqueue: injected scheduler receives delay, job registered queued", () => {
  const seen: number[] = [];
  let runFn: (() => Promise<void>) | null = null;
  const before = Date.now();
  const { jobId, sendAt } = enqueueConfirmationEmail(payload, (run, delayMs) => {
    seen.push(delayMs);
    runFn = run;
  });
  assert.deepEqual(seen, [120000]);
  assert.ok(sendAt >= before + 120000 && sendAt <= Date.now() + 120000 + 50);
  assert.match(jobId, /^[0-9a-f-]{36}$/);
  const job = getConfirmationEmailJob(jobId);
  assert.ok(job, "job registered");
  assert.equal(job?.status, "queued");
  assert.equal(job?.subject, buildConfirmationSubject(payload.reference));
  assert.ok(runFn !== null, "scheduler captured the job runner (not executed — no send in tests)");
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
