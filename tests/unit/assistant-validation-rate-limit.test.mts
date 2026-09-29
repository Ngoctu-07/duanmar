import assert from "node:assert/strict";

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

const { validateAssistantRequest, toAssistantRequest, MAX_MESSAGES, MAX_CONTENT_CHARS } =
  await import("../../src/lib/assistant/assistant-validation.ts");
const rate = await import("../../src/lib/assistant/rate-limit.ts");

const user = (content = "What tours do you have?") => ({ role: "user", content });
const valid = () => ({ messages: [user()], locale: "en" });

check("V1 valid payload → no errors", () => {
  assert.deepEqual(validateAssistantRequest(valid()), {});
});

check("V2 non-object body → body error", () => {
  assert.ok(validateAssistantRequest(null).body);
  assert.ok(validateAssistantRequest("x").body);
});

check("V3 messages must be non-empty array", () => {
  assert.ok(validateAssistantRequest({ messages: [], locale: "en" }).messages);
  assert.ok(validateAssistantRequest({ messages: "nope", locale: "en" }).messages);
});

check("V4 messages capped at MAX_MESSAGES", () => {
  const messages = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) =>
    user(`msg ${i}`)
  );
  assert.ok(validateAssistantRequest({ messages, locale: "en" }).messages);
});

check("V5 bad role / empty / oversized content → field errors", () => {
  const errors = validateAssistantRequest({
    messages: [
      { role: "system", content: "hi" },
      { role: "user", content: "   " },
      { role: "user", content: "a".repeat(MAX_CONTENT_CHARS + 1) },
    ],
    locale: "en",
  });
  assert.ok(errors["messages.0.role"]);
  assert.ok(errors["messages.1.content"]);
  assert.ok(errors["messages.2.content"].includes(String(MAX_CONTENT_CHARS)));
});

check("V6 conversation must start with a user message", () => {
  const errors = validateAssistantRequest({
    messages: [{ role: "assistant", content: "hello" }],
    locale: "en",
  });
  assert.ok(errors["messages.0.role"]);
});

check("V7 locale must be en|vi", () => {
  assert.ok(validateAssistantRequest({ ...valid(), locale: "fr" }).locale);
  assert.ok(validateAssistantRequest({ ...valid(), locale: 7 }).locale);
});

check("V8 toAssistantRequest normalizes roles + locale fallback", () => {
  const request = toAssistantRequest({
    messages: [{ role: "user", content: "hi" }],
    locale: "bogus",
  });
  assert.equal(request.locale, "en");
  assert.equal(request.messages[0].role, "user");
});

check("V9 merges consecutive same-role messages (Gemini alternation rule)", () => {
  const request = toAssistantRequest({
    messages: [
      { role: "user", content: "one" },
      { role: "user", content: "two" },
      { role: "assistant", content: "three" },
      { role: "assistant", content: "four" },
    ],
    locale: "en",
  });
  assert.equal(request.messages.length, 2);
  assert.equal(request.messages[0].content, "one\ntwo");
  assert.equal(request.messages[1].content, "three\nfour");
  assert.equal(request.messages[0].role, "user");
  assert.equal(request.messages[1].role, "assistant");
});

check("R1 60 hits allowed in window, 61st rejected", () => {
  const key = "unit-r1";
  for (let i = 0; i < rate.RATE_LIMIT_MAX; i += 1) {
    assert.equal(rate.checkRateLimit(key, 1_000), true, `hit ${i}`);
  }
  assert.equal(rate.checkRateLimit(key, 1_000), false);
});

check("R2 window slides — hits expire after RATE_LIMIT_WINDOW_MS", () => {
  const key = "unit-r2";
  for (let i = 0; i < rate.RATE_LIMIT_MAX; i += 1) {
    rate.checkRateLimit(key, 5_000);
  }
  assert.equal(rate.checkRateLimit(key, 5_000), false);
  assert.equal(
    rate.checkRateLimit(key, 5_000 + rate.RATE_LIMIT_WINDOW_MS + 1),
    true,
    "fresh window allows again"
  );
});

check("R3 keys are independent + reset clears all", () => {
  const key = "unit-r3";
  for (let i = 0; i < rate.RATE_LIMIT_MAX; i += 1) {
    rate.checkRateLimit(key, 9_000);
  }
  assert.equal(rate.checkRateLimit("unit-r3-other", 9_000), true, "other key unaffected");
  rate.resetRateLimit();
  assert.equal(rate.checkRateLimit(key, 9_000), true, "reset restores budget");
});

// ---- async: capped body reader (review fix — chunked bodies bypass
// content-length) ----
const { readBodyTextCapped, PayloadTooLargeError } = await import(
  "../../src/lib/assistant/body-limit.ts"
);

const bodyOf = (text: string) => new Response(text).body;

const asyncChecks: [string, () => void | Promise<void>][] = [
  ["B1 within cap → full text (multi-chunk stream)", async () => {
    const text = await readBodyTextCapped(bodyOf("hello world"), 100);
    assert.equal(text, "hello world");
  }],
  ["B2 over cap → PayloadTooLargeError before finishing read", () =>
    assert.rejects(() => readBodyTextCapped(bodyOf("x".repeat(200)), 100), PayloadTooLargeError)],
  ["B3 null body → empty string", async () => {
    assert.equal(await readBodyTextCapped(null, 100), "");
  }],
];

for (const [name, fn] of asyncChecks) {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
