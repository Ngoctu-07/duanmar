import type { NextRequest } from "next/server";
import {
  maskEmail,
  maskPhone,
  validateContactPayload,
} from "@/lib/contact-validation";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 10_000;

/**
 * Public contact endpoint: validates the JSON payload, logs masked metadata
 * (no raw PII) and acks. No DB / no external calls by design — persistence and
 * rate limiting are documented non-functional gaps.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return Response.json({ error: "Unsupported media type" }, { status: 415 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const errors = validateContactPayload(body);
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  const values = body as Record<string, string>;
  console.log("[contact]", {
    at: new Date().toISOString(),
    nameLength: values.fullName.trim().length,
    email: maskEmail(values.email.trim()),
    phone: maskPhone(values.phone.trim()),
    messageLength: values.message.trim().length,
  });

  return Response.json({ ok: true });
}

export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
