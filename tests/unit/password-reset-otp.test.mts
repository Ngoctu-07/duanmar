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
delete process.env.TURSO_DATABASE_URL;

const { createUser, authenticate } = await import("../../src/lib/auth/user-store.ts");
const { getDb, queryRow } = await import("../../src/lib/db/sqlite-store.ts");
const {
  OTP_TTL_SECONDS,
  RESET_TOKEN_TTL_SECONDS,
  confirmPasswordReset,
  issuePasswordResetOtp,
  verifyPasswordResetOtp,
} = await import("../../src/lib/auth/password-reset-store.ts");

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

const db = await getDb();
assert.ok(db, "test database unavailable");

const created = await createUser({
  email: "otp.user@example.com",
  name: "OTP User",
  password: "initial-password",
});
assert.ok(created.ok, "user creation failed");
if (!created.ok) process.exit(1);
const userId = created.user.id;

const T0 = 1_800_000_000_000;
const SECONDS = 1000;

await check("TTL contract is 60 seconds (and token 10 minutes)", () => {
  assert.equal(OTP_TTL_SECONDS, 60);
  assert.equal(RESET_TOKEN_TTL_SECONDS, 600);
});

let firstCode = "";

await check("issues a 6-digit OTP valid for 60 seconds", async () => {
  const issued = await issuePasswordResetOtp("OTP.User@Example.com", T0);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  assert.match(issued.code, /^\d{6}$/);
  assert.equal(issued.expiresInSeconds, 60);
  assert.equal(issued.email, "otp.user@example.com");
  firstCode = issued.code;

  const row = await queryRow<{
    code_hash: string;
    expires_at: number;
    created_at: number;
    attempts: number;
  }>(
    db!,
    "SELECT code_hash, expires_at, created_at, attempts FROM password_reset_otps WHERE id = ?",
    [issued.otpId]
  );
  assert.notEqual(row?.code_hash, firstCode, "code must never be stored in plaintext");
  assert.equal(Number(row?.expires_at) - Number(row?.created_at), 60 * SECONDS);
  assert.equal(Number(row?.attempts), 0);
});

await check("unknown emails get no row (and the route can answer generically)", async () => {
  const issued = await issuePasswordResetOtp("ghost@example.com", T0);
  assert.deepEqual(issued, { ok: false, reason: "no_account" });
});

await check("resend is blocked inside the 60-second window", async () => {
  const issued = await issuePasswordResetOtp("otp.user@example.com", T0 + 30 * SECONDS);
  assert.equal(issued.ok, false);
  if (issued.ok) return;
  assert.equal(issued.reason, "rate_limited");
  assert.equal(issued.retryAfterSeconds, 30);
});

await check("new request after 60 seconds rotates the code", async () => {
  const issued = await issuePasswordResetOtp("otp.user@example.com", T0 + 61 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  firstCode = issued.code;
});

await check("wrong codes are rejected and counted", async () => {
  const result = await verifyPasswordResetOtp(
    "otp.user@example.com",
    "000000",
    T0 + 62 * SECONDS
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "invalid");
});

await check("five wrong attempts burn the code", async () => {
  const wrong = firstCode === "111111" ? "222222" : "111111";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await verifyPasswordResetOtp("otp.user@example.com", wrong, T0 + 63 * SECONDS);
  }
  const locked = await verifyPasswordResetOtp(
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

await check("an OTP past its 60-second TTL reports expired", async () => {
  const issued = await issuePasswordResetOtp("otp.user@example.com", T0 + 200 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  freshCode = issued.code;

  const expired = await verifyPasswordResetOtp(
    "otp.user@example.com",
    freshCode,
    T0 + 200 * SECONDS + 61 * SECONDS
  );
  assert.equal(expired.ok, false);
  if (expired.ok) return;
  assert.equal(expired.reason, "expired");
});

await check("verifying inside the window mints a single-use reset token", async () => {
  const issued = await issuePasswordResetOtp("otp.user@example.com", T0 + 400 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  freshCode = issued.code;

  const verified = await verifyPasswordResetOtp(
    "otp.user@example.com",
    freshCode,
    T0 + 400 * SECONDS + 59 * SECONDS
  );
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  assert.match(verified.token, /^[0-9a-f]{48}$/);
  assert.equal(verified.expiresInSeconds, 600);
  resetToken = verified.token;

  const again = await verifyPasswordResetOtp(
    "otp.user@example.com",
    freshCode,
    T0 + 400 * SECONDS + 59 * SECONDS
  );
  assert.equal(again.ok, false, "the OTP itself must not be reusable");
});

await check("confirm rejects bad tokens, short passwords and expiry", async () => {
  assert.deepEqual((await confirmPasswordReset("not-a-token", "new-password-1", T0)).ok, false);

  const short = await confirmPasswordReset(resetToken, "short", T0 + 401 * SECONDS);
  assert.equal(short.ok, false);
  if (!short.ok) assert.equal(short.reason, "invalid_password");

  const late = await confirmPasswordReset(
    resetToken,
    "new-password-1",
    T0 + 400 * SECONDS + 11 * 60 * SECONDS
  );
  assert.equal(late.ok, false);
  if (!late.ok) assert.equal(late.reason, "expired_token");
});

await check("confirm swaps the password and enables auto sign-in", async () => {
  const result = await confirmPasswordReset(
    resetToken,
    "brand-new-password",
    T0 + 401 * SECONDS
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.email, "otp.user@example.com");

  assert.equal(await authenticate("otp.user@example.com", "initial-password"), null);
  const signedIn = await authenticate("OTP.USER@example.com", "brand-new-password");
  assert.equal(signedIn?.id, userId);
});

await check("the reset token is single-use", async () => {
  const replay = await confirmPasswordReset(resetToken, "another-password", T0 + 402 * SECONDS);
  assert.equal(replay.ok, false);
  if (!replay.ok) assert.equal(replay.reason, "invalid_token");
});

await check("confirm also burns other outstanding OTPs for the account", async () => {
  const issued = await issuePasswordResetOtp("otp.user@example.com", T0 + 600 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const verified = await verifyPasswordResetOtp(
    "otp.user@example.com",
    issued.code,
    T0 + 601 * SECONDS
  );
  assert.equal(verified.ok, true);
  if (!verified.ok) return;

  const confirmed = await confirmPasswordReset(
    verified.token,
    "third-password-3",
    T0 + 602 * SECONDS
  );
  assert.equal(confirmed.ok, true);

  const next = await issuePasswordResetOtp("otp.user@example.com", T0 + 700 * SECONDS);
  assert.equal(next.ok, true, "a new OTP can be issued after consumption");
});

await check("expiry outranks a wrong code, and a wrong code never mints a token", async () => {
  const issued = await issuePasswordResetOtp("otp.user@example.com", T0 + 900 * SECONDS);
  assert.equal(issued.ok, true);
  if (!issued.ok) return;

  const wrong = issued.code === "000000" ? "111111" : "000000";
  const inside = await verifyPasswordResetOtp(
    "otp.user@example.com",
    wrong,
    T0 + 900 * SECONDS + 30 * SECONDS
  );
  assert.equal(inside.ok, false);
  if (!inside.ok) assert.equal(inside.reason, "invalid");
  assert.ok(!("token" in inside), "a wrong code must never return a reset token");

  // Correct digits, but the 60-second window is gone → expired, not invalid.
  const stale = await verifyPasswordResetOtp(
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
