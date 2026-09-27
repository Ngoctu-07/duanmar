import type { useTranslations } from "next-intl";
import { formatTravelDate } from "@/lib/date-window";
import { formatPrice, type PriceCurrency } from "@/lib/pricing";
import type { BookingValues } from "./booking-validation";

export interface TicketRow {
  label: string;
  value: string;
  strong?: boolean;
}

interface TicketRowsInput {
  t: ReturnType<typeof useTranslations>;
  reference: string;
  tourName: string;
  values: BookingValues;
  guestCount: number;
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
  total,
  locale,
  currency,
}: TicketRowsInput): TicketRow[] {
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
    { label: t("difficulty"), value: t(values.difficulty) },
    ...(values.notes.trim()
      ? [{ label: t("notes"), value: values.notes.trim() }]
      : []),
    ...(total !== null
      ? [
          {
            label: t("total"),
            value: formatPrice(total, locale, currency),
            strong: true,
          },
        ]
      : []),
  ];
}
