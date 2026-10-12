import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";

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

const visitor = await import("../../src/lib/visitor.ts");
const VALID_ID = "550e8400-e29b-41d4-8716-446655440000";
const URL_UNDER_TEST = "https://example.test/api/articles/starup/like";

check("V1 newVisitorId produces distinct valid v4 ids", () => {
  const first = visitor.newVisitorId();
  const second = visitor.newVisitorId();
  assert.equal(visitor.isValidVisitor(first), true);
  assert.equal(visitor.isValidVisitor(second), true);
  assert.notEqual(first, second);
});

check("V2 isValidVisitor accepts a canonical v4", () => {
  assert.equal(visitor.isValidVisitor(VALID_ID), true);
  assert.equal(visitor.isValidVisitor(visitor.newVisitorId()), true);
});

check("V3 isValidVisitor rejects non-v4 / junk values", () => {
  const rejected: unknown[] = [
    "",
    "not-a-uuid",
    "550e8400-e29b-11d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-44665544000g",
    "550e8400-e29b-41d4-7716-446655440000",
    "550e8400-e29b-41d4-a716-44665544000",
    "550e8400-e29b-41d4-a716-4466554400000",
    "550E8400-E29B-41D4-A716-446655440000",
    "550e8400e29b41d4a716446655440000",
    ` ${VALID_ID} `,
    null,
    undefined,
    42,
    { value: VALID_ID },
    [VALID_ID],
  ];
  for (const value of rejected) {
    assert.equal(visitor.isValidVisitor(value), false, `should reject ${JSON.stringify(value)}`);
  }
});

const withNodeEnv = (value: string, run: () => void) => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
};

check("V4 cookie options in dev: secure off, HttpOnly, Lax, 1y, path /", () => {
  withNodeEnv("development", () => {
    const options = visitor.visitorCookieOptions();
    assert.equal(options.secure, false);
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.path, "/");
    assert.equal(options.maxAge, 31_536_000);
  });
});

check("V5 cookie options in prod: secure on", () => {
  withNodeEnv("production", () => {
    assert.equal(visitor.visitorCookieOptions().secure, true);
  });
});

check("V6 readVisitor from a NextRequest cookie header", () => {
  const request = new NextRequest(URL_UNDER_TEST, {
    headers: { cookie: `vn_visitor=${VALID_ID}; other=1` },
  });
  assert.equal(visitor.readVisitor(request), VALID_ID);
});

check("V7 readVisitor from a plain Request cookie header", () => {
  const request = new Request(URL_UNDER_TEST, {
    headers: { cookie: `other=1; vn_visitor=${VALID_ID}` },
  });
  assert.equal(visitor.readVisitor(request), VALID_ID);
});

check("V8 readVisitor from a cookie store (cookies() shape)", () => {
  const request = new NextRequest(URL_UNDER_TEST, {
    headers: { cookie: `vn_visitor=${VALID_ID}` },
  });
  assert.equal(visitor.readVisitor(request.cookies), VALID_ID);
  assert.equal(visitor.readVisitor({ get: () => undefined }), null);
});

check("V9 readVisitor → null for missing / malformed / non-v4 cookie", () => {
  const missing = new NextRequest(URL_UNDER_TEST);
  assert.equal(visitor.readVisitor(missing), null);
  const junk = new NextRequest(URL_UNDER_TEST, { headers: { cookie: "vn_visitor=junk" } });
  assert.equal(visitor.readVisitor(junk), null);
  const wrongVersion = new NextRequest(URL_UNDER_TEST, {
    headers: { cookie: "vn_visitor=550e8400-e29b-11d4-a716-446655440000" },
  });
  assert.equal(visitor.readVisitor(wrongVersion), null);
});

check("V10 issueVisitor mints + sets cookie when absent", () => {
  const response = NextResponse.json({ ok: true });
  const id = visitor.issueVisitor(response, null);
  assert.equal(visitor.isValidVisitor(id), true);
  const set = response.cookies.get(visitor.VISITOR_COOKIE);
  assert.equal(set?.value, id);
  assert.equal(set?.httpOnly, true);
  assert.equal(set?.sameSite, "lax");
  assert.equal(set?.path, "/");
  assert.equal(set?.maxAge, 31_536_000);
  assert.equal(set?.secure, process.env.NODE_ENV === "production");
  assert.match(response.headers.get("set-cookie") ?? "", /^vn_visitor=/);
});

check("V11 issueVisitor keeps a still-valid id and does not re-set the cookie", () => {
  const response = NextResponse.json({ ok: true });
  assert.equal(visitor.issueVisitor(response, VALID_ID), VALID_ID);
  assert.equal(response.cookies.get(visitor.VISITOR_COOKIE), undefined);
  assert.equal(response.headers.get("set-cookie"), null);
});

check("V12 issueVisitor replaces an invalid id", () => {
  const response = NextResponse.json({ ok: true });
  const id = visitor.issueVisitor(response, "garbage");
  assert.equal(id !== "garbage", true);
  assert.equal(visitor.isValidVisitor(id), true);
  assert.equal(response.cookies.get(visitor.VISITOR_COOKIE)?.value, id);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
