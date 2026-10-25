import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { getDb, queryRow, runStatement } from "@/lib/db/sqlite-store";
import { findUserByEmail, normalizeEmail, updateUserPassword } from "@/lib/auth/user-store";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

/**
 * Password-recovery OTP store (server only, SQLite).
 *
 * Rules:
 * - 6-digit numeric code, single active code per account.
 * - Strict 60-second TTL; a new code cannot be requested until the current one
 *   expires (the UI doubles as a resend cooldown).
 * - Only a SHA-256 digest of the code/ token is persisted.
 * - Five wrong attempts burn the code.
 * - A successful verification mints a single-use reset token valid for 10
 *   minutes; the password can only be changed with that token.
 *
 * No row exists for unknown emails, so probing the request endpoint never
 * reveals whether an account exists (the route answers identically).
 *
 * Naming: in every result union `code` is the OTP **secret** (only present on
 * the success branch of `issuePasswordResetOtp`) while `reason` carries the
 * failure discriminant. The split is deliberate — it makes leaking the code into
 * a response or a log line a type error rather than a one-character mistake.
 */

export const OTP_TTL_SECONDS = 60;
export const OTP_LENGTH = 6;
export const OTP_MAX_ATTEMPTS = 5;
export const RESET_TOKEN_TTL_SECONDS = 10 * 60;

const TTL_MS = OTP_TTL_SECONDS * 1000;
const TOKEN_TTL_MS = RESET_TOKEN_TTL_SECONDS * 1000;
const TOKEN_BYTES = 24;
const TOKEN_PATTERN = new RegExp(`^[0-9a-f]{${TOKEN_BYTES * 2}}$`);
const RETENTION_MS = 24 * 60 * 60 * 1000;

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, "0");
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export type IssueOtpResult =
  | { ok: true; otpId: string; email: string; code: string; expiresInSeconds: number }
  | {
      ok: false;
      reason: "no_account" | "rate_limited" | "db_unavailable";
      retryAfterSeconds?: number;
    };

interface OtpRow {
  id: string;
  email: string;
  code_hash: string;
  expires_at: number;
  attempts: number;
}

/** Creates a fresh OTP, invalidating any previous unconsumed one. */
export async function issuePasswordResetOtp(
  rawEmail: string,
  now: number = Date.now()
): Promise<IssueOtpResult> {
  const email = normalizeEmail(rawEmail);
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, reason: "no_account" };

  const db = await getDb();
  if (!db) return { ok: false, reason: "db_unavailable" };

  try {
    const latest = await queryRow<{ created_at: number }>(
      db,
      "SELECT created_at FROM password_reset_otps " +
        "WHERE user_id = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [user.id]
    );

    if (latest) {
      const elapsed = now - Number(latest.created_at);
      if (elapsed < TTL_MS) {
        return {
          ok: false,
          reason: "rate_limited",
          retryAfterSeconds: Math.max(1, Math.ceil((TTL_MS - elapsed) / 1000)),
        };
      }
    }

    const code = generateOtpCode();
    const otpId = randomUUID();

    await runStatement(db, "DELETE FROM password_reset_otps WHERE created_at < ?", [
      now - RETENTION_MS,
    ]);
    await runStatement(
      db,
      "UPDATE password_reset_otps SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL",
      [now, user.id]
    );
    await runStatement(
      db,
      "INSERT INTO password_reset_otps " +
        "(id, user_id, email, code_hash, expires_at, attempts, created_at) " +
        "VALUES (?, ?, ?, ?, ?, 0, ?)",
      [otpId, user.id, user.email, digest(code), now + TTL_MS, now]
    );

    return {
      ok: true,
      otpId,
      email: user.email,
      code,
      expiresInSeconds: OTP_TTL_SECONDS,
    };
  } catch (error) {
    console.error("[password-reset] issue failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: "db_unavailable" };
  }
}

/** Called when delivery fails so the user is not locked out by the cooldown. */
export async function discardPasswordResetOtp(otpId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await runStatement(
      db,
      "DELETE FROM password_reset_otps WHERE id = ? AND reset_token_hash IS NULL",
      [otpId]
    );
  } catch {
    // Best effort — the row expires on its own.
  }
}

export type VerifyOtpResult =
  | { ok: true; token: string; expiresInSeconds: number }
  | {
      ok: false;
      reason:
        | "invalid"
        | "expired"
        | "too_many_attempts"
        | "db_unavailable";
    };

export async function verifyPasswordResetOtp(
  rawEmail: string,
  rawCode: string,
  now: number = Date.now()
): Promise<VerifyOtpResult> {
  const code = rawCode.trim();
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) return { ok: false, reason: "invalid" };

  const user = await findUserByEmail(rawEmail);
  if (!user) return { ok: false, reason: "invalid" };

  const db = await getDb();
  if (!db) return { ok: false, reason: "db_unavailable" };

  try {
    const row = await queryRow<OtpRow>(
      db,
      "SELECT id, email, code_hash, expires_at, attempts FROM password_reset_otps " +
        "WHERE user_id = ? AND consumed_at IS NULL AND reset_token_hash IS NULL " +
        "ORDER BY created_at DESC LIMIT 1",
      [user.id]
    );

    if (!row) return { ok: false, reason: "invalid" };

    if (now > Number(row.expires_at)) {
      await runStatement(db, "UPDATE password_reset_otps SET consumed_at = ? WHERE id = ?", [
        now,
        row.id,
      ]);
      return { ok: false, reason: "expired" };
    }

    if (Number(row.attempts) >= OTP_MAX_ATTEMPTS) {
      return { ok: false, reason: "too_many_attempts" };
    }

    const expected = Buffer.from(row.code_hash, "hex");
    const actual = Buffer.from(digest(code), "hex");
    const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!matches) {
      const attempts = Number(row.attempts) + 1;
      await runStatement(db, "UPDATE password_reset_otps SET attempts = ? WHERE id = ?", [
        attempts,
        row.id,
      ]);
      return {
        ok: false,
        reason: attempts >= OTP_MAX_ATTEMPTS ? "too_many_attempts" : "invalid",
      };
    }

    const token = randomBytes(TOKEN_BYTES).toString("hex");
    await runStatement(
      db,
      "UPDATE password_reset_otps " +
        "SET reset_token_hash = ?, token_expires_at = ?, verified_at = ? WHERE id = ?",
      [digest(token), now + TOKEN_TTL_MS, now, row.id]
    );

    return { ok: true, token, expiresInSeconds: RESET_TOKEN_TTL_SECONDS };
  } catch (error) {
    console.error("[password-reset] verify failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: "db_unavailable" };
  }
}

export type ConfirmResetResult =
  | { ok: true; email: string }
  | {
      ok: false;
      reason:
        | "invalid_token"
        | "expired_token"
        | "invalid_password"
        | "db_unavailable";
    };

/** Applies the new password and burns every outstanding reset for the user. */
export async function confirmPasswordReset(
  token: string,
  newPassword: string,
  now: number = Date.now()
): Promise<ConfirmResetResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, reason: "invalid_password" };
  }
  if (!TOKEN_PATTERN.test(token)) return { ok: false, reason: "invalid_token" };

  const db = await getDb();
  if (!db) return { ok: false, reason: "db_unavailable" };

  try {
    const row = await queryRow<{
      id: string;
      user_id: string;
      email: string;
      token_expires_at: number | null;
    }>(
      db,
      "SELECT id, user_id, email, token_expires_at FROM password_reset_otps " +
        "WHERE reset_token_hash = ? AND consumed_at IS NULL LIMIT 1",
      [digest(token)]
    );

    if (!row) return { ok: false, reason: "invalid_token" };
    if (!row.token_expires_at || now > Number(row.token_expires_at)) {
      return { ok: false, reason: "expired_token" };
    }

    if (!(await updateUserPassword(row.user_id, newPassword))) {
      return { ok: false, reason: "db_unavailable" };
    }

    await runStatement(
      db,
      "UPDATE password_reset_otps SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL",
      [now, row.user_id]
    );

    return { ok: true, email: row.email };
  } catch (error) {
    console.error("[password-reset] confirm failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: "db_unavailable" };
  }
}
