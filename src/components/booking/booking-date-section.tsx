import { useTranslations } from "next-intl";
import { TravelDateField } from "./travel-date-field";
import type { TourCapacity } from "@/lib/tour-capacity";
import type {
  BookingErrors,
  BookingField,
  BookingValues,
} from "./booking-validation";

interface BookingDateSectionProps {
  values: BookingValues;
  errors: BookingErrors;
  onChange: (field: BookingField, value: string) => void;
  locale: string;
  /** `null` = tour has no capacity configured (calendar stays window-only). */
  capacity?: TourCapacity | null;
  /** Drives the spots-left disable rule on the calendar. */
  guestCount?: number;
}

export function BookingDateSection({
  values,
  errors,
  onChange,
  locale,
  capacity,
  guestCount = 1,
}: BookingDateSectionProps) {
  const t = useTranslations("booking");

  return (
    <section
      aria-labelledby="booking-date-heading"
      className="rounded-xl border bg-card p-5"
    >
      <h2
        id="booking-date-heading"
        className="text-sm font-semibold uppercase tracking-widest text-destructive"
      >
        {t("dateTitle")}
      </h2>

      <div className="mt-4">
        <TravelDateField
          value={values.travelDate}
          error={errors.travelDate}
          onChange={(iso) => onChange("travelDate", iso)}
          locale={locale}
          capacity={capacity}
          guestCount={guestCount}
        />
      </div>
    </section>
  );
}
