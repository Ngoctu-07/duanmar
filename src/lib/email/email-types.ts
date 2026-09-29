import type { PaymentMethod } from "@/lib/payment";

/**
 * Server-validated payload for the delayed booking-confirmation email
 * (plan 260929-2229). Built client-side at payment success, POSTed to
 * /api/booking-confirmation, hydrated into the bilingual HTML template.
 */
export interface BookingConfirmationPayload {
  reference: string;
  slug: string;
  tourName: string;
  fullName: string;
  email: string;
  phone: string;
  /** ISO date string `YYYY-MM-DD` — rendered DD/MM/YYYY in the email. */
  travelDate: string;
  guests: number;
  total: number;
  currency: "VND" | "USD";
  paymentMethod: PaymentMethod;
  notes: string;
  locale: "en" | "vi";
}

export type EmailJobStatus = "queued" | "sent" | "dry-run" | "failed";

export interface EmailJob {
  id: string;
  to: string;
  subject: string;
  status: EmailJobStatus;
  sendAt: number;
  attempts: number;
  error?: string;
}
