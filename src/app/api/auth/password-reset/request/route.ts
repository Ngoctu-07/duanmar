import { NextResponse, type NextRequest } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/auth/user-store";
import {
  discardPasswordResetOtp,
  issuePasswordResetOtp,
  OTP_TTL_SECONDS,
} from "@/lib/auth/password-reset-store";
import { sendPasswordResetEmail } from "@/lib/email/password-reset-email";
import {
  EmailDeliveryError,
  EMAIL_FAILURE_MESSAGES,
  hasLiveEmailConfig,
} from "@/lib/email/email-provider";
import { resolveClientKey } from "@/lib/request-ip";

export const runtime = "nodejs";

/**
 * Coarse abuse guard: 8 requests per IP per 10 minutes (per process).
 *
 * Production is pinned at 8. Development honours `PASSWORD_RESET_IP_MAX` so
 * repeated end-to-end runs (each reset flow costs a few requests) do not trip
 * the in-memory counter; the override can only loosen, never tighten.
 */
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_REQUESTS =
  process.env.NODE_ENV === "production"
    ? 8
    : Math.max(8, Number(process.env.PASSWORD_RESET_IP_MAX ?? 8) || 8);
const hits = new Map<string, number[]>();

function ipAllowed(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < IP_WINDOW_MS);
  if (recent.length >= IP_MAX_REQUESTS) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/**
 * `POST /api/auth/password-reset/request` — issues a 6-digit OTP valid for 60
 * seconds and mails it to the account owner.
 *
 * Response shape is identical for known and unknown emails, so this endpoint
 * cannot be used to enumerate accounts. The code itself is a secret that only
 * ever travels to the recipient's mailbox: it is never included in this
 * response, rendered by the client or written to a log.
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  if (hits.size > 2000) hits.clear(); // coarse bound for long-running dev processes
  if (!ipAllowed(resolveClientKey(request), Date.now())) {
    return NextResponse.json({ error: "rate_limited", retryAfterSeconds: 600 }, { status: 429 });
  }

  // Fail before issuing a code when production has no transport configured:
  // a code that cannot be delivered would only burn the 60-second cooldown.
  if (process.env.NODE_ENV === "production" && !hasLiveEmailConfig()) {
    const reason = process.env.RESEND_API_KEY ? "missing_sender" : "missing_api_key";
    console.error("[password-reset] email transport is not configured", {
      reason,
      hasApiKey: Boolean(process.env.RESEND_API_KEY),
      hasSender: Boolean(process.env.EMAIL_FROM || process.env.SENDER_EMAIL),
    });
    return NextResponse.json(
      { error: "email_not_configured", reason, message: EMAIL_FAILURE_MESSAGES[reason] },
      { status: 503 }
    );
  }

  const result = issuePasswordResetOtp(email);

  if (!result.ok) {
    if (result.reason === "db_unavailable") {
      return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
    }
    if (result.reason === "rate_limited") {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: result.retryAfterSeconds ?? OTP_TTL_SECONDS },
        { status: 429 }
      );
    }
    // Unknown account — identical body to a successful send.
    return NextResponse.json({
      ok: true,
      expiresInSeconds: OTP_TTL_SECONDS,
    });
  }

  try {
    await sendPasswordResetEmail({
      to: result.email,
      code: result.code,
      expiresInSeconds: result.expiresInSeconds,
    });
  } catch (error) {
    // Free the cooldown so the visitor can retry immediately.
    discardPasswordResetOtp(result.otpId);
    const failure = error instanceof EmailDeliveryError ? error : null;
    const reason = failure?.reason ?? "provider_error";
    console.error("[password-reset] email delivery failed", {
      reason,
      status: failure?.status,
      // Provider detail is server-only; the OTP is never part of this object.
      detail:
        failure?.providerDetail ??
        (error instanceof Error ? error.message : String(error)),
    });
    return NextResponse.json(
      {
        error: "email_failed",
        reason,
        message: failure?.message ?? EMAIL_FAILURE_MESSAGES.provider_error,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    expiresInSeconds: result.expiresInSeconds,
  });
}
