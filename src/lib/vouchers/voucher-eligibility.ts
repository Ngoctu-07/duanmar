import type { PromotionRecord } from "@/lib/promotions";
import { isVoucherExpired } from "@/lib/vouchers/voucher-discount";

/**
 * Conditional voucher eligibility (client + server safe, pure).
 *
 * The wallet row is a claim-time snapshot, but the conditional rules live on
 * the live CMS promotion (attached by `localizeVouchers`). Checkout evaluates
 * every row against the current booking state, so changing the guest count or
 * the travel date re-renders the list with no request:
 *
 *   isGuestEligible = !minGuests || currentGuests >= minGuests
 *   isDateEligible  = (!startDate || bookingDate >= startDate)
 *                  && (!endDate   || bookingDate <= endDate)
 *   isEligible      = isGuestEligible && isDateEligible
 *                     && !expired && !other-tour && !exhausted
 *
 * Dates are inclusive ISO days (`YYYY-MM-DD`), so lexicographic comparison is
 * exact. Missing booking date + a configured window = not eligible (the user
 * must pick a date first). Invalid CMS values fail open (no restriction).
 */

export interface VoucherRequirements {
  /** `null` = any party size. */
  minGuests: number | null;
  /** Inclusive ISO day (`YYYY-MM-DD`) or `null` = no lower bound. */
  startDate: string | null;
  /** Inclusive ISO day (`YYYY-MM-DD`) or `null` = no upper bound. */
  endDate: string | null;
}

export type VoucherIneligibilityReason =
  | "exhausted"
  | "expired"
  | "tour"
  | "guests"
  | "date";

export interface VoucherEligibilityContext {
  /** Current checkout guest count (may be NaN while the input is empty). */
  guests: number;
  /** Selected travel date (`YYYY-MM-DD`) or empty/null before selection. */
  bookingDate: string | null | undefined;
  /** Tour being booked (tour-targeted vouchers only apply to it). */
  tourSlug: string;
  /** Test seam; defaults to today in UTC. */
  today?: string;
}

export interface VoucherEligibility {
  isGuestEligible: boolean;
  isDateEligible: boolean;
  isEligible: boolean;
  /** Highest-priority blocker (`null` when eligible). */
  reason: VoucherIneligibilityReason | null;
  /** Every blocker, in display priority order. */
  reasons: VoucherIneligibilityReason[];
}

/** Minimal wallet shape the evaluator needs (a `VoucherView` satisfies it). */
export interface VoucherEligibilityTarget extends VoucherRequirements {
  tourSlug: string | null;
  validUntil: string | null;
  isExhausted?: boolean;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` / ISO datetime → `YYYY-MM-DD`; anything else → `null`. */
export function normalizeEligibilityDay(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const day = value.trim().slice(0, 10);
  return ISO_DAY.test(day) ? day : null;
}

/** Normalize CMS fields; blank/1/invalid guest limits mean "any party size". */
export function normalizeVoucherRequirements(
  promo:
    | Pick<PromotionRecord, "minGuests" | "startDate" | "endDate">
    | null
    | undefined
): VoucherRequirements {
  const minGuests = promo?.minGuests;
  return {
    minGuests:
      typeof minGuests === "number" && Number.isInteger(minGuests) && minGuests > 1
        ? minGuests
        : null,
    startDate: normalizeEligibilityDay(promo?.startDate),
    endDate: normalizeEligibilityDay(promo?.endDate),
  };
}

export function evaluateVoucherEligibility(
  voucher: VoucherEligibilityTarget,
  context: VoucherEligibilityContext
): VoucherEligibility {
  const guests = Number(context.guests);
  const isGuestEligible =
    voucher.minGuests === null ||
    (Number.isFinite(guests) && guests >= voucher.minGuests);

  const bookingDate = normalizeEligibilityDay(context.bookingDate);
  const hasWindow = voucher.startDate !== null || voucher.endDate !== null;
  let isDateEligible = true;
  if (hasWindow) {
    if (bookingDate === null) {
      isDateEligible = false;
    } else {
      if (voucher.startDate !== null && bookingDate < voucher.startDate) {
        isDateEligible = false;
      }
      if (voucher.endDate !== null && bookingDate > voucher.endDate) {
        isDateEligible = false;
      }
    }
  }

  const reasons: VoucherIneligibilityReason[] = [];
  if (voucher.isExhausted) reasons.push("exhausted");
  if (isVoucherExpired(voucher, context.today)) reasons.push("expired");
  if (voucher.tourSlug && voucher.tourSlug !== context.tourSlug) {
    reasons.push("tour");
  }
  if (!isGuestEligible) reasons.push("guests");
  if (!isDateEligible) reasons.push("date");

  return {
    isGuestEligible,
    isDateEligible,
    isEligible: reasons.length === 0,
    reason: reasons[0] ?? null,
    reasons,
  };
}
