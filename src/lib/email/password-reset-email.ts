import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  EmailDeliveryError,
  getProvider,
  resolveSenderAddress,
  type SendEmailResult,
} from "@/lib/email/email-provider";

/**
 * Password-recovery email: bilingual (EN + VI) dark-brand template with the
 * 6-digit OTP and the 1-minute expiry warning.
 *
 * Rendered on demand (no stored HTML) so copy changes ship without touching the
 * queue. All interpolated values are digits, so no user input enters the markup.
 *
 * SECURITY: the code is a secret. It is dispatched to the recipient only —
 * never returned to the browser, never rendered in the UI and never written to
 * the console. Local development writes the message to a server-side maildrop
 * (see `deliverToDevMaildrop`) so the 60-second flow stays testable without a
 * mail provider.
 */

export interface PasswordResetEmailInput {
  code: string;
  expiresInSeconds: number;
}

/** Overrides the dev maildrop directory (tests point it at a temp folder). */
export const MAILDROP_DIR_ENV = "PASSWORD_RESET_MAILDROP_DIR";
const DEFAULT_MAILDROP_DIR = "data/dev-mail";
const MAILDROP_MAX_AGE_MS = 60 * 60 * 1000;

export function renderPasswordResetEmail({
  code,
  expiresInSeconds,
}: PasswordResetEmailInput): { subject: string; html: string; text: string } {
  const minutes = Math.max(1, Math.round(expiresInSeconds / 60));
  const subject = "[DuanMar] Password reset code / Mã đặt lại mật khẩu";
  const text =
    `Your DuanMar password reset code is ${code}. ` +
    `It expires in ${minutes} minute(s).\n\n` +
    `Mã đặt lại mật khẩu DuanMar của bạn là ${code}. ` +
    `Mã hết hạn sau ${minutes} phút.`;

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0b0b0b;font-family:'Barlow Semi Condensed',Arial,sans-serif;color:#f5f5f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#111111;border:1px solid #2a2a2a;">
      <tr>
        <td style="height:4px;background:#7f1d1d;font-size:0;line-height:0;">&nbsp;</td>
      </tr>
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#dd8578;">DuanMar</p>
          <h1 style="margin:0;font-size:22px;line-height:1.25;text-transform:uppercase;letter-spacing:0.02em;color:#ffffff;">
            Password reset code
          </h1>
          <p style="margin:4px 0 0;font-size:13px;color:#a3a3a3;">Mã đặt lại mật khẩu</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px;">
          <div style="border:1px solid #3a3a3a;background:#0b0b0b;padding:18px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#a3a3a3;">
              Your code / Mã của bạn
            </p>
            <p style="margin:0;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:0.32em;color:#ffffff;">
              ${code}
            </p>
          </div>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#d4d4d4;">
            Enter this code within <strong style="color:#ffffff;">${minutes} minute</strong> — it expires immediately after.
          </p>
          <p style="margin:4px 0 0;font-size:13px;line-height:1.6;color:#a3a3a3;">
            Nhập mã trong vòng <strong style="color:#ffffff;">${minutes} phút</strong> — mã sẽ hết hạn ngay sau đó.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 24px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#737373;">
            If you did not request this, ignore this email and keep your password.
            <br />
            Nếu bạn không yêu cầu, hãy bỏ qua email này và giữ nguyên mật khẩu.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

function maildropDir(): string {
  return process.env[MAILDROP_DIR_ENV]?.trim() || DEFAULT_MAILDROP_DIR;
}

/** Drops messages older than an hour so a long dev session cannot pile up. */
async function pruneMaildrop(dir: string, now: number): Promise<void> {
  try {
    const names = await readdir(dir);
    await Promise.all(
      names.map(async (name) => {
        if (!name.endsWith(".json")) return;
        const path = join(dir, name);
        const info = await stat(path).catch(() => null);
        if (info && now - info.mtimeMs > MAILDROP_MAX_AGE_MS) await rm(path, { force: true });
      })
    );
  } catch {
    // Best effort — a missing/unreadable folder never fails the delivery.
  }
}

/**
 * Development/test transport (no `RESEND_API_KEY`): writes the rendered message
 * to a gitignored, server-side maildrop folder (`data/dev-mail` by default).
 * The code lands in the recipient's inbox in production; locally it lands in a
 * file only the server process can reach — never in the response, the DOM or
 * the logs.
 */
async function deliverToDevMaildrop(input: {
  to: string;
  code: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const dir = maildropDir();
  const now = Date.now();
  const slug = `${input.to.split("@")[1] ?? "local"}-${now}`.replace(/[^a-z0-9.-]+/gi, "-");
  const file = `${slug}.json`;

  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, file),
    JSON.stringify(
      {
        to: input.to,
        subject: input.subject,
        code: input.code,
        html: input.html,
        text: input.text,
        deliveredAt: new Date(now).toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );
  await pruneMaildrop(dir, now);

  // Metadata only — the OTP itself must never reach a log sink.
  console.info("[email:dev-maildrop]", {
    at: new Date(now).toISOString(),
    toDomain: input.to.split("@")[1] ?? "unknown",
    subject: input.subject,
    file,
  });

  return { id: `maildrop-${now}`, mode: "dry-run" };
}

/**
 * Delivers the OTP to the account's mailbox.
 *
 * - `RESEND_API_KEY` set → live HTTP dispatch through Resend (the real path).
 *   In development a provider rejection (e.g. the sending domain is not yet
 *   verified) falls back to the local maildrop so the 60-second flow stays
 *   usable; production never falls back — it fails loudly with 502.
 * - Production without a key → throws, so the route answers 502 instead of
 *   pretending a code was sent.
 * - Development/test without a key → server-side maildrop file (see above).
 */
export async function sendPasswordResetEmail(input: {
  to: string;
  code: string;
  expiresInSeconds: number;
}): Promise<SendEmailResult> {
  const rendered = renderPasswordResetEmail(input);

  if (process.env.RESEND_API_KEY) {
    if (!resolveSenderAddress()) {
      const error = new EmailDeliveryError(
        "missing_sender",
        "Neither EMAIL_FROM nor SENDER_EMAIL is set"
      );
      if (process.env.NODE_ENV === "production") throw error;
      console.warn("[email:dev-maildrop] live send skipped — no sender configured; using dev maildrop", {
        reason: error.reason,
      });
      return deliverToDevMaildrop({
        to: input.to,
        code: input.code,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    }

    try {
      return await getProvider().send({
        to: input.to,
        subject: rendered.subject,
        html: rendered.html,
      });
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      // Dev-only safety net: keep the 60-second flow usable while the provider
      // domain is being verified. The failure is logged with its typed reason
      // so a real production problem is never silently swallowed.
      console.warn("[email:dev-maildrop] live send failed — falling back to the dev maildrop", {
        reason: error instanceof EmailDeliveryError ? error.reason : "provider_error",
        status: error instanceof EmailDeliveryError ? error.status : undefined,
        detail:
          error instanceof EmailDeliveryError
            ? error.providerDetail ?? error.message
            : error instanceof Error
              ? error.message
              : String(error),
      });
      return deliverToDevMaildrop({
        to: input.to,
        code: input.code,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new EmailDeliveryError(
      "missing_api_key",
      "RESEND_API_KEY is not configured for password-reset delivery"
    );
  }

  return deliverToDevMaildrop({
    to: input.to,
    code: input.code,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}
