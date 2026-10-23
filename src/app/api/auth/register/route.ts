import { NextResponse } from "next/server";
import {
  createUser,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth/user-store";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password";

export const runtime = "nodejs";

interface RegisterBody {
  email?: unknown;
  name?: unknown;
  password?: unknown;
}

const MAX_NAME = 80;
const MIN_NAME = 2;

/**
 * `POST /api/auth/register` — creates a credentials account, then the client
 * calls `signIn("credentials")` to open the session. Defensive validation:
 * unknown/mistyped fields are rejected before touching the DB.
 */
export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (name.length < MIN_NAME || name.length > MAX_NAME) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }

  const result = createUser({ email, name, password });
  if (!result.ok) {
    if (result.code === "duplicate") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ user: result.user }, { status: 201 });
}
