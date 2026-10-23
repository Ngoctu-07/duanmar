import type { Voucher } from "./voucher-store";

/**
 * Pure voucher → discount arithmetic (client + server safe).
 *
 * The wallet stores a snapshot of the promotion, so the discount has to be
 * derived from what was claimed:
 *   1. an explicit percentage in the badge ("Giảm 20%") or the title;
 *   2. otherwise the promo price ratio (discounted ÷ original) when both
 *      snapshot prices are usable;
 *   3. otherwise no discount (0%).
 *
 * Only one voucher may apply to an order — enforced by the selector state, not
 * here, so this module stays a deterministic calculator.
 */

export interface VoucherDiscount {
  /** Effective percentage off the subtotal (0–100). */
  percent: number;
  /** Amount removed from the subtotal, rounded to 2 decimals. */
  amount: number;
  /** Final payable total (never below 0). */
  total: number;
}

const PERCENT_PATTERN = /(\d{1,3}(?:[.,]\d+)?)\s*%/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `"Giảm 20%"` → 20; malformed/absent → null. Clamped to 1–100. */
export function parseVoucherPercent(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(PERCENT_PATTERN);
  if (!match) return null;
  const percent = Number(match[1].replace(",", "."));
  if (!Number.isFinite(percent) || percent <= 0) return null;
  return Math.min(100, percent);
}

/**
 * Snapshot prices are already locale-formatted ("1.800.000 ₫" / "$150.00").
 * Both sides of the ratio use the same formatting, so stripping separators
 * keeps the ratio exact even when the scale differs.
 */
function parseAmount(value: string | null | undefined): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function priceRatioPercent(voucher: Voucher): number | null {
  const original = parseAmount(voucher.originalPrice);
  const price = parseAmount(voucher.price);
  if (!original || !price || price >= original) return null;
  return Math.min(100, Math.round((1 - price / original) * 100));
}

/** Effective percentage for a voucher, or null when no rule can be derived. */
export function voucherPercent(voucher: Voucher): number | null {
  return (
    parseVoucherPercent(voucher.badge) ??
    parseVoucherPercent(voucher.title) ??
    priceRatioPercent(voucher)
  );
}

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Day is inclusive; malformed `validUntil` is treated as non-expiring. */
export function isVoucherExpired(voucher: Voucher, today: string = todayIso()): boolean {
  if (!voucher.validUntil || !ISO_DAY.test(voucher.validUntil)) return false;
  return voucher.validUntil < today;
}

/** Tour-targeted vouchers only apply to the tour they were claimed for. */
export function isVoucherApplicable(
  voucher: Voucher,
  tourSlug: string,
  today: string = todayIso()
): boolean {
  if (isVoucherExpired(voucher, today)) return false;
  return !voucher.tourSlug || voucher.tourSlug === tourSlug;
}

/** Recalculate the order total for the selected voucher. */
export function resolveVoucherDiscount(
  voucher: Voucher | null | undefined,
  subtotal: number
): VoucherDiscount {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  const percent = voucher ? (voucherPercent(voucher) ?? 0) : 0;
  const amount = Math.round(safeSubtotal * percent) / 100;
  const total = Math.max(0, Math.round((safeSubtotal - amount) * 100) / 100);
  return { percent, amount, total };
}
