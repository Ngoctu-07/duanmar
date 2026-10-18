import { CRYPTO_METHOD } from "@/lib/crypto-payment";

/** Fiat rails — settled via MoMo e-wallet / bank transfer (mock payload). */
export type FiatPaymentMethod = "momo" | "bank";

/**
 * All selectable payment rails. `crypto_metamask` is an independent Web3
 * settlement layer (ERC-20 stablecoin transfer) and does NOT use the fiat
 * QR payload — see `crypto-payment.ts`.
 */
export type PaymentMethod = FiatPaymentMethod | typeof CRYPTO_METHOD;

export const FIAT_PAYMENT_METHODS: FiatPaymentMethod[] = ["momo", "bank"];
export const PAYMENT_METHODS: PaymentMethod[] = [...FIAT_PAYMENT_METHODS, CRYPTO_METHOD];

/** Narrow a method to the fiat subset (everything except the crypto rail). */
export function isFiatPaymentMethod(method: PaymentMethod): method is FiatPaymentMethod {
  return method === "momo" || method === "bank";
}

/**
 * Demo payload only — no payment gateway is connected, so the QR encodes a
 * readable mock string (amount + order reference) instead of a real transfer.
 */
export function buildPaymentPayload(
  method: FiatPaymentMethod,
  amount: number,
  reference: string
): string {
  const safeReference = reference.replace(/[^A-Za-z0-9-]/g, "");

  if (method === "momo") {
    return `momo://pay?amount=${amount}&order=${safeReference}&txn=VNTOUR`;
  }

  return `BANK|acc=000123456789|bank=VPB|amount=${amount}|ref=${safeReference}`;
}
