import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 1-minute OTP recovery contract: TTL, cooldown, attempt cap, single-use reset
 * token and the actual credential swap (plus the auto-sign-in credentials).
 */
const dir = mkdtempSync(join(tmpdir(), "duanmar-otp-"));
process.env.VN_INTERACTIONS_DB_PATH = join(dir, "test.db");

const { createUser, authenticate } = await import("../../src/lib/auth/user-store.ts");
const { getDb } = await import("../../src/lib/db/sqlite-store.ts");
const {
  OTP_TTL_SECONDS,
  RESET_TOKEN_TTL_SECONDS,
  confirmPasswordReset,
  issuePasswordResetOtp,
  verifyPasswordResetOtp,
} = await import("../../src/lib/auth/password-reset-store.ts");

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

const db = getDb();
assert.ok(db, "test database unavailable");

const created = createUser({
  email: "otp.user@example.com",
  name: "OTP User",
  password: "initial-password",
});
assert.ok(created.ok, "user creation failed");
if (!created.ok) process.exit(1);
const userId = created.user.id;

const T0 = 1_800_000_000_000;
const SECONDS = 1000;

check("TTL contract is 60 seconds (and token 10 minutes)", () => {
  assert.equal(OTP_TTL_SECONDS, 60);
  assert.equal(RESET_TOKEN_TTL_SECONDS, 600);
});

let firstCode = "";

check("issues a 6-digit OTP valid for 60 seconds", () => {
  const issued = issuePasswordResetOtp("OTP.User@Example.com", T0);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  assert.match(issued.code, /^\d{6}$/);
  assert.equal(issued.expiresInSeconds, 60);
  assert.equal(issued.email, "otp.user@example.com");
  firstCode = issued.code;

  const row = db!
    .prepare(
      "SELECT code_hash, expires_at, created_at, attempts FROM password_reset_otps WHERE id = ?"
    )
    .get(issued.otpId) as {
    code_hash: string;
    expires_at: number;
    created_at: number;
    attempts: number;
  };
  assert.notEqual(row.code_hash, firstCode, "code must never be stored in plaintext");
  assert.equal(row.expires_at - row.created_at, 60 * SECONDS);
  assert.equal(row.attempts, 0);
});

check("unknown emails get no row (and the route can answer generically)", () => {
  const issued = issuePasswordResetOtp("ghost@example.com", T0);
  assert.deepEqual(issued, { ok: false, reason: "no_account" });
});

check("resend is blocked inside the 60-second window", () => {
  const issued = issuePasswordResetOtp("otp.user@example.com", T0 + 30 * SECONDS);
  assert.equal(issued.ok, false);
  if (issued.ok) return;
  assert.equal(issued.reason, "rate_limited");
  assert.equal(issued.retryAfterSeconds, 30);
});

check("new request after 60 seconds rotates the code", () => {
  const issued = issuePasswordResetOtp("otp.user@example.com", T0 + 61 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  firstCode = issued.code;
});

check("wrong codes are rejected and counted", () => {
  const result = verifyPasswordResetOtp("otp.user@example.com", "000000", T0 + 62 * SECONDS);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "invalid");
});

check("five wrong attempts burn the code", () => {
  const wrong = firstCode === "111111" ? "222222" : "111111";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    verifyPasswordResetOtp("otp.user@example.com", wrong, T0 + 63 * SECONDS);
  }
  const locked = verifyPasswordResetOtp(
    "otp.user@example.com",
    firstCode,
    T0 + 64 * SECONDS
  );
  assert.equal(locked.ok, false);
  if (locked.ok) return;
  assert.equal(locked.reason, "too_many_attempts");
});

/* --- expiry + successful reset --- */

let freshCode = "";
let resetToken = "";

check("an OTP past its 60-second TTL reports expired", () => {
  const issued = issuePasswordResetOtp("otp.user@example.com", T0 + 200 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  freshCode = issued.code;

  const expired = verifyPasswordResetOtp(
    "otp.user@example.com",
    freshCode,
    T0 + 200 * SECONDS + 61 * SECONDS
  );
  assert.equal(expired.ok, false);
  if (expired.ok) return;
  assert.equal(expired.reason, "expired");
});

check("verifying inside the window mints a single-use reset token", () => {
  const issued = issuePasswordResetOtp("otp.user@example.com", T0 + 400 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  freshCode = issued.code;

  const verified = verifyPasswordResetOtp(
    "otp.user@example.com",
    freshCode,
    T0 + 400 * SECONDS + 59 * SECONDS
  );
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  assert.match(verified.token, /^[0-9a-f]{48}$/);
  assert.equal(verified.expiresInSeconds, 600);
  resetToken = verified.token;

  const again = verifyPasswordResetOtp(
    "otp.user@example.com",
    freshCode,
    T0 + 400 * SECONDS + 59 * SECONDS
  );
  assert.equal(again.ok, false, "the OTP itself must not be reusable");
});

check("confirm rejects bad tokens, short passwords and expiry", () => {
  assert.deepEqual(confirmPasswordReset("not-a-token", "new-password-1", T0).ok, false);

  const short = confirmPasswordReset(resetToken, "short", T0 + 401 * SECONDS);
  assert.equal(short.ok, false);
  if (!short.ok) assert.equal(short.reason, "invalid_password");

  const late = confirmPasswordReset(
    resetToken,
    "new-password-1",
    T0 + 400 * SECONDS + 11 * 60 * SECONDS
  );
  assert.equal(late.ok, false);
  if (!late.ok) assert.equal(late.reason, "expired_token");
});

check("confirm swaps the password and enables auto sign-in", () => {
  const result = confirmPasswordReset(resetToken, "brand-new-password", T0 + 401 * SECONDS);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.email, "otp.user@example.com");

  assert.equal(authenticate("otp.user@example.com", "initial-password"), null);
  const signedIn = authenticate("OTP.USER@example.com", "brand-new-password");
  assert.equal(signedIn?.id, userId);
});

check("the reset token is single-use", () => {
  const replay = confirmPasswordReset(resetToken, "another-password", T0 + 402 * SECONDS);
  assert.equal(replay.ok, false);
  if (!replay.ok) assert.equal(replay.reason, "invalid_token");
});

check("confirm also burns other outstanding OTPs for the account", () => {
  const issued = issuePasswordResetOtp("otp.user@example.com", T0 + 600 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const verified = verifyPasswordResetOtp(
    "otp.user@example.com",
    issued.code,
    T0 + 601 * SECONDS
  );
  assert.equal(verified.ok, true);
  if (!verified.ok) return;

  const confirmed = confirmPasswordReset(verified.token, "third-password-3", T0 + 602 * SECONDS);
  assert.equal(confirmed.ok, true);

  const next = issuePasswordResetOtp("otp.user@example.com", T0 + 700 * SECONDS);
  assert.equal(next.ok, true, "a new OTP can be issued after consumption");
});

check("expiry outranks a wrong code, and a wrong code never mints a token", () => {
  const issued = issuePasswordResetOtp("otp.user@example.com", T0 + 900 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const wrong = issued.code === "000000" ? "111111" : "000000";
  const inside = verifyPasswordResetOtp(
    "otp.user@example.com",
    wrong,
    T0 + 900 * SECONDS + 30 * SECONDS
  );
  assert.equal(inside.ok, false);
  if (!inside.ok) assert.equal(inside.reason, "invalid");
  assert.ok(!("token" in inside), "a wrong code must never return a reset token");

  // Correct digits, but the 60-second window is gone → expired, not invalid.
  const stale = verifyPasswordResetOtp(
    "otp.user@example.com",
    issued.code,
    T0 + 900 * SECONDS + 61 * SECONDS
  );
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.reason, "expired");
  assert.ok(!("token" in stale), "an expired code must never return a reset token");
});

try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  // Windows keeps the SQLite handle open; the OS cleans the temp dir.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
