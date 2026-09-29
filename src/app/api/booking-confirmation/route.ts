import type { NextRequest } from "next/server";
import { after } from "next/server";
import { maskEmail, maskPhone } from "@/lib/contact-validation";
import { validateBookingConfirmation } from "@/lib/booking-email-validation";
import { enqueueConfirmationEmail } from "@/lib/email/confirmation-email-queue";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;

/**
 * Public booking-confirmation endpoint (plan 260929-2229): validates the
 * payload (same guard chain as /api/contact), enqueues a delayed (default
 * 2 min) bilingual confirmation email, acks 202. PII logs are masked;
 * rate limiting is a documented non-functional gap.
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

  const result = validateBookingConfirmation(body);
  if (!result.ok) {
    return Response.json({ errors: result.errors }, { status: 400 });
  }
  const payload = result.payload;

  const { jobId, sendAt } = enqueueConfirmationEmail(payload, (run, delayMs) => {
    after(async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await run();
    });
  });

  console.log("[booking-confirmation]", {
    at: new Date().toISOString(),
    reference: payload.reference,
    email: maskEmail(payload.email),
    phone: maskPhone(payload.phone),
    paymentMethod: payload.paymentMethod,
    jobId,
    sendAt: new Date(sendAt).toISOString(),
  });

  return Response.json(
    { queued: true, jobId, sendAt: new Date(sendAt).toISOString() },
    { status: 202 }
  );
}

export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
