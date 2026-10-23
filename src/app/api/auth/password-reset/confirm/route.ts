import { NextResponse } from "next/server";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { confirmPasswordReset } from "@/lib/auth/password-reset-store";

export const runtime = "nodejs";

/**
 * `POST /api/auth/password-reset/confirm` — Step C. Stores the new scrypt hash,
 * burns the reset token (and every other outstanding reset for the account).
 *
 * The client signs in immediately afterwards with the new credentials, which
 * issues the normal Auth.js session cookie.
 */
export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { token?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }

  const result = confirmPasswordReset(token, password);
  if (!result.ok) {
    switch (result.reason) {
      case "expired_token":
        return NextResponse.json({ error: "reset_expired" }, { status: 410 });
      case "db_unavailable":
        return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
      case "invalid_password":
        return NextResponse.json({ error: "invalid_password" }, { status: 400 });
      default:
        return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, email: result.email });
}
