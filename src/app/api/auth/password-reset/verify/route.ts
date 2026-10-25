import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth/user-store";
import { verifyPasswordResetOtp } from "@/lib/auth/password-reset-store";

export const runtime = "nodejs";

/**
 * `POST /api/auth/password-reset/verify` — checks the 6-digit code.
 *
 * Success returns a single-use reset token (valid 10 minutes) that Step C must
 * present; the OTP itself is never accepted twice. Expired codes answer 410 so
 * the client can show "OTP expired. Please request a new code."
 */
export async function POST(request: Request) {
  let body: { email?: unknown; code?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; code?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!email) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

  const result = await verifyPasswordResetOtp(email, code);
  if (!result.ok) {
    switch (result.reason) {
      case "expired":
        return NextResponse.json({ error: "otp_expired" }, { status: 410 });
      case "too_many_attempts":
        return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
      case "db_unavailable":
        return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
      default:
        return NextResponse.json({ error: "invalid_otp" }, { status: 400 });
    }
  }

  return NextResponse.json({
    ok: true,
    token: result.token,
    expiresInSeconds: result.expiresInSeconds,
  });
}
