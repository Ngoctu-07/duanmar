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
 * Resend HTTP adapter — plain fetch, zero npm deps (plan 260929-2229).
 * Requires `RESEND_API_KEY` + `EMAIL_FROM`; throws on config/transport error.
 */
const resendProvider: EmailProvider = {
  async send({ to, subject, html }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new Error("Email config missing: RESEND_API_KEY and EMAIL_FROM required for live send");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Resend send failed: ${response.status} ${detail.slice(0, 200)}`);
    }
    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { id: data.id ?? "resend-unknown", mode: "live" };
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
