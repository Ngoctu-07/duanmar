import { randomUUID } from "node:crypto";
import { renderConfirmationEmail } from "@/lib/email/confirmation-email-template";
import { sendConfirmationEmail } from "@/lib/email/email-provider";
import type {
  BookingConfirmationPayload,
  EmailJob,
} from "@/lib/email/email-types";

/** Default 2-minute offset per plan 260929-2229. */
export const DEFAULT_CONFIRMATION_EMAIL_DELAY_MS = 120_000;

const jobs = new Map<string, EmailJob>();

/** Env override (tests/local demo); garbage or negative → default. */
export function getConfirmationEmailDelayMs(): number {
  const raw = Number(process.env.BOOKING_EMAIL_DELAY_MS);
  return Number.isFinite(raw) && raw >= 0
    ? raw
    : DEFAULT_CONFIRMATION_EMAIL_DELAY_MS;
}

/**
 * Scheduler abstraction so the queue stays framework-agnostic and unit
 * testable; the API route injects a Next `after()`-based scheduler.
 */
export type EmailScheduler = (run: () => Promise<void>, delayMs: number) => void;

async function runJob(
  job: EmailJob,
  payload: BookingConfirmationPayload
): Promise<void> {
  job.attempts += 1;
  try {
    const rendered = renderConfirmationEmail(payload);
    const result = await sendConfirmationEmail(payload, rendered);
    job.status = result.mode === "dry-run" ? "dry-run" : "sent";
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : String(error);
    console.error("[booking-confirmation] send failed", {
      jobId: job.id,
      reference: payload.reference,
      error: job.error,
    });
  }
}

/**
 * Enqueues a delayed confirmation email. Registry is in-memory
 * (documented limitation: lost on process restart / dev hot-reload).
 */
export function enqueueConfirmationEmail(
  payload: BookingConfirmationPayload,
  schedule: EmailScheduler
): { jobId: string; sendAt: number } {
  const delayMs = getConfirmationEmailDelayMs();
  const jobId = randomUUID();
  const sendAt = Date.now() + delayMs;
  const job: EmailJob = {
    id: jobId,
    to: payload.email,
    subject: buildSubject(payload),
    status: "queued",
    sendAt,
    attempts: 0,
  };
  jobs.set(jobId, job);
  void schedule(() => runJob(job, payload), delayMs);
  return { jobId, sendAt };
}

function buildSubject(payload: BookingConfirmationPayload): string {
  // Subject only — html rendered at fire time (template may evolve).
  return renderConfirmationEmail({ ...payload }).subject;
}

export function getConfirmationEmailJob(id: string): EmailJob | undefined {
  return jobs.get(id);
}
