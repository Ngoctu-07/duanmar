import assert from "node:assert/strict";
import {
  validateContactPayload,
  maskEmail,
  maskPhone,
} from "../../src/lib/contact-validation.ts";

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

const VALID = {
  fullName: "Nguyen Van A",
  email: "a@example.com",
  phone: "+84901234567",
  message: "Hello, I would like more info.",
};

check("C1: valid payload → {}", () => {
  assert.deepEqual(validateContactPayload(VALID), {});
});

check("C1: trimmed whitespace-only fields are required", () => {
  assert.deepEqual(validateContactPayload({ ...VALID, fullName: "   " }), {
    fullName: "required",
  });
  assert.deepEqual(validateContactPayload({ ...VALID, message: " " }), {
    message: "required",
  });
});

check("C2: each missing field gets its own required key", () => {
  for (const field of ["fullName", "email", "phone", "message"] as const) {
    const payload: Record<string, string> = { ...VALID };
    delete payload[field];
    assert.deepEqual(validateContactPayload(payload), { [field]: "required" }, field);
    assert.deepEqual(
      validateContactPayload({ ...VALID, [field]: "" }),
      { [field]: "required" },
      `${field} empty`
    );
  }
});

check("C3: invalid emails → emailInvalid", () => {
  for (const email of ["a@b", "ab b@c.com", "not-an-email", "a@.com"]) {
    assert.deepEqual(validateContactPayload({ ...VALID, email }), { email: "emailInvalid" }, email);
  }
});

check("C4: invalid phones → phoneInvalid", () => {
  for (const phone of ["abc", "123", "+", "0901234567890123456"]) {
    assert.deepEqual(validateContactPayload({ ...VALID, phone }), { phone: "phoneInvalid" }, phone);
  }
});

check("C5: short name → nameInvalid", () => {
  assert.deepEqual(validateContactPayload({ ...VALID, fullName: "A" }), {
    fullName: "nameInvalid",
  });
});

check("C6: message over 5000 chars → messageInvalid", () => {
  assert.deepEqual(validateContactPayload({ ...VALID, message: "x".repeat(5001) }), {
    message: "messageInvalid",
  });
  assert.deepEqual(validateContactPayload({ ...VALID, message: "x".repeat(5000) }), {});
});

check("C7: non-object input → all required, never throws", () => {
  const allRequired = {
    fullName: "required",
    email: "required",
    phone: "required",
    message: "required",
  };
  assert.deepEqual(validateContactPayload(null), allRequired);
  assert.deepEqual(validateContactPayload(undefined), allRequired);
  assert.deepEqual(validateContactPayload("str"), allRequired);
  assert.deepEqual(validateContactPayload(["fullName"]), allRequired);
  assert.deepEqual(validateContactPayload(123), allRequired);
});

check("C7: wrong value types → required (no crash, no coercion)", () => {
  const payload = { fullName: 123, email: true, phone: {}, message: null };
  assert.deepEqual(validateContactPayload(payload), {
    fullName: "required",
    email: "required",
    phone: "required",
    message: "required",
  });
});

check("C8: maskEmail hides local part", () => {
  const masked = maskEmail("nguyen@example.com");
  assert.ok(!masked.includes("nguyen"), masked);
  assert.ok(masked.endsWith("@example.com"), masked);
  assert.ok(masked.includes("***"), masked);
  assert.equal(maskEmail("bad"), "***");
});

check("C8: maskPhone hides middle digits, keeps last 4", () => {
  const masked = maskPhone("+84901234567");
  assert.ok(!masked.includes("901234567"), masked);
  assert.ok(masked.endsWith("4567"), masked);
  assert.ok(masked.startsWith("+84"), masked);
  assert.equal(maskPhone("123"), "***");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
