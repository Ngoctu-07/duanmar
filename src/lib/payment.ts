export type PaymentMethod = "momo" | "bank";

export const PAYMENT_METHODS: PaymentMethod[] = ["momo", "bank"];

/**
 * Demo payload only — no payment gateway is connected, so the QR encodes a
 * readable mock string (amount + order reference) instead of a real transfer.
 */
export function buildPaymentPayload(
  method: PaymentMethod,
  amount: number,
  reference: string
): string {
  const safeReference = reference.replace(/[^A-Za-z0-9-]/g, "");

  if (method === "momo") {
    return `momo://pay?amount=${amount}&order=${safeReference}&txn=VNTOUR`;
  }

  return `BANK|acc=000123456789|bank=VPB|amount=${amount}|ref=${safeReference}`;
}
