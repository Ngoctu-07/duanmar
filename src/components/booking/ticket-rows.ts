import type { useTranslations } from "next-intl";
import { formatTravelDate } from "@/lib/date-window";
import { formatPrice, type PriceCurrency } from "@/lib/pricing";
import { bookingDifficultyKey } from "@/lib/booking-difficulty";
import type { BookingValues } from "./booking-validation";

export interface TicketRow {
  label: string;
  value: string;
  strong?: boolean;
  price?: boolean;
}

interface TicketRowsInput {
  t: ReturnType<typeof useTranslations>;
  reference: string;
  tourName: string;
  values: BookingValues;
  guestCount: number;
  /** Chosen at checkout; legacy records may still carry lowercase values. */
  difficulty?: string | null;
  /** Pre-voucher total (`null` when the tour has no authored price). */
  subtotal?: number | null;
  /** Voucher amount removed from the subtotal. */
  discount?: number | null;
  /** Voucher code applied to the order (label only). */
  voucherCode?: string | null;
  /** Final payable amount (subtotal − discount). */
  total: number | null;
  locale: string;
  currency: PriceCurrency;
}

/**
 * Single source of truth for the ticket rows shown at checkout and on the
 * My Trips detail page — both must render the exact same information.
 */
export function buildTicketRows({
  t,
  reference,
  tourName,
  values,
  guestCount,
  difficulty = null,
  subtotal = null,
  discount = null,
  voucherCode = null,
  total,
  locale,
  currency,
}: TicketRowsInput): TicketRow[] {
  const showBreakdown =
    subtotal !== null && (discount ?? 0) > 0 && total !== null;
  // New tickets read the value from `BookingValues`; My Trips passes the
  // stored record explicitly so pre-existing rows still render.
  const difficultyKey = bookingDifficultyKey(difficulty ?? values.difficulty);

  return [
    { label: t("reference"), value: reference },
    { label: t("tour"), value: tourName },
    {
      label: t("travelDateLabel"),
      value: formatTravelDate(values.travelDate, locale),
      strong: true,
    },
    { label: t("fullName"), value: values.fullName.trim() },
    { label: t("email"), value: values.email.trim() },
    { label: t("phone"), value: values.phone.trim() },
    { label: t("guests"), value: String(guestCount) },
    ...(difficultyKey
      ? [{ label: t("difficulty"), value: t(difficultyKey) }]
      : []),
    ...(values.notes.trim()
      ? [{ label: t("notes"), value: values.notes.trim() }]
      : []),
    // Breakdown only exists when a voucher actually reduced the price, so
    // legacy/discount-free tickets keep their original two-line footer.
    ...(showBreakdown
      ? [
          {
            label: t("subtotal"),
            value: formatPrice(subtotal as number, locale, currency),
          },
          {
            label: voucherCode
              ? t("discountWithCode", { code: voucherCode })
              : t("discount"),
            value: `−${formatPrice(discount as number, locale, currency)}`,
            strong: true,
          },
        ]
      : []),
    ...(total !== null
      ? [
          {
            label: showBreakdown ? t("totalPayable") : t("total"),
            value: formatPrice(total, locale, currency),
            strong: true,
            price: true,
          },
        ]
      : []),
  ];
}
