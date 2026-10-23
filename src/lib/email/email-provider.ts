import type { BookingConfirmationPayload } from "@/lib/email/email-types";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  id: string;
  mode: "live" | "dry-run";
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

/**
 * Machine-readable delivery failure. The `message` is safe to return to the
 * client; provider detail stays in `providerDetail` for server logs only.
 */
export type EmailFailureReason =
  | "missing_api_key"
  | "missing_sender"
  | "sender_domain_unverified"
  | "invalid_api_key"
  | "invalid_sender"
  | "recipient_not_allowed"
  | "rate_limited"
  | "network_error"
  | "provider_error";

export const EMAIL_FAILURE_MESSAGES: Record<EmailFailureReason, string> = {
  missing_api_key: "Email delivery is not configured (RESEND_API_KEY missing).",
  missing_sender: "Email delivery is not configured (EMAIL_FROM missing).",
  sender_domain_unverified:
    "The sender domain is not verified with the email provider. Verify the domain in Resend, then retry.",
  invalid_api_key: "The email provider rejected the API key.",
  invalid_sender: "The configured sender address is invalid.",
  recipient_not_allowed:
    "The email provider only allows test recipients for the sandbox sender.",
  rate_limited: "The email provider is rate limiting requests. Try again shortly.",
  network_error: "Could not reach the email provider.",
  provider_error: "The email provider rejected the message.",
};

export class EmailDeliveryError extends Error {
  readonly reason: EmailFailureReason;
  readonly status?: number;
  /** Raw provider response, clipped. Never contains the API key or the OTP. */
  readonly providerDetail?: string;

  constructor(reason: EmailFailureReason, providerDetail?: string, status?: number) {
    super(EMAIL_FAILURE_MESSAGES[reason]);
    this.name = "EmailDeliveryError";
    this.reason = reason;
    this.status = status;
    this.providerDetail = providerDetail;
  }
}

/**
 * Sender identity resolution. `EMAIL_FROM` is the canonical variable;
 * `SENDER_EMAIL` is accepted as an alias for deployments that use that name.
 */
export function resolveSenderAddress(): string {
  return (process.env.EMAIL_FROM || process.env.SENDER_EMAIL || "").trim();
}

export function hasLiveEmailConfig(): boolean {
  return Boolean(process.env.RESEND_API_KEY && resolveSenderAddress());
}

function classifyResendFailure(status: number, detail: string): EmailFailureReason {
  const text = detail.toLowerCase();
  if (status === 401 || text.includes("api key")) return "invalid_api_key";
  if (status === 403 && text.includes("domain is not verified")) {
    return "sender_domain_unverified";
  }
  if (status === 403 && text.includes("only send testing emails")) {
    return "recipient_not_allowed";
  }
  if (status === 422) return "invalid_sender";
  if (status === 429) return "rate_limited";
  return "provider_error";
}

function providerDetail(raw: string): string {
  const clipped = raw.slice(0, 300);
  try {
    const parsed = JSON.parse(raw) as { message?: unknown; name?: unknown };
    if (typeof parsed.message === "string" && parsed.message.length > 0) {
      return parsed.message.slice(0, 300);
    }
    if (typeof parsed.name === "string" && parsed.name.length > 0) {
      return parsed.name.slice(0, 300);
    }
  } catch {
    // Plain-text provider response — keep the clipped body.
  }
  return clipped;
}

/**
 * Resend HTTP adapter — plain fetch, zero npm deps (plan 260929-2229).
 * Requires `RESEND_API_KEY` + a sender (`EMAIL_FROM` or `SENDER_EMAIL`);
 * throws a typed `EmailDeliveryError` on config/transport/provider failure.
 */
const resendProvider: EmailProvider = {
  async send({ to, subject, html }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new EmailDeliveryError("missing_api_key", "RESEND_API_KEY is not set");
    }
    const from = resolveSenderAddress();
    if (!from) {
      throw new EmailDeliveryError(
        "missing_sender",
        "Neither EMAIL_FROM nor SENDER_EMAIL is set"
      );
    }

    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, html }),
        // Never let a stalled provider hold the OTP request open indefinitely.
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new EmailDeliveryError("network_error", detail.slice(0, 300));
    }

    const raw = await response.text().catch(() => "");
    if (!response.ok) {
      const detail = providerDetail(raw);
      throw new EmailDeliveryError(
        classifyResendFailure(response.status, raw),
        detail,
        response.status
      );
    }

    let id = "resend-unknown";
    try {
      const data = JSON.parse(raw) as { id?: unknown };
      if (typeof data.id === "string" && data.id.length > 0) id = data.id;
    } catch {
      // A 2xx without a JSON body still counts as dispatched.
    }
    return { id, mode: "live" };
  },
};

/**
 * Dry-run adapter (dev/tests default): logs metadata only — never delivers.
 * PII is masked; the full body is NOT logged.
 */
const dryRunProvider: EmailProvider = {
  async send({ to, subject }) {
    const at = new Date().toISOString();
    console.info("[email:dry-run]", {
      at,
      toDomain: to.split("@")[1] ?? "unknown",
      subject,
    });
    return { id: `dry-run-${Date.now()}`, mode: "dry-run" };
  },
};

/** Live when `RESEND_API_KEY` set, otherwise log-only dry-run. */
export function getProvider(): EmailProvider {
  return process.env.RESEND_API_KEY ? resendProvider : dryRunProvider;
}

/** Small helper the queue uses to send a rendered confirmation. */
export async function sendConfirmationEmail(
  payload: BookingConfirmationPayload,
  rendered: { subject: string; html: string }
): Promise<SendEmailResult> {
  return getProvider().send({
    to: payload.email,
    subject: rendered.subject,
    html: rendered.html,
  });
}
