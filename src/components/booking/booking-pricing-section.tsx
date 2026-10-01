import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { formatPrice, type PriceCurrency, type PriceTier } from "@/lib/pricing";
import { Field, describedBy } from "./booking-field";
import type { BookingErrors, BookingField, BookingValues } from "./booking-validation";

interface BookingPricingSectionProps {
  values: BookingValues;
  errors: BookingErrors;
  onChange: (field: BookingField, value: string) => void;
  guestCount: number;
  tier: PriceTier | null;
  total: number | null;
  locale: string;
  currency: PriceCurrency;
}

/** Guest count drives the live total: `guests × tier.pricePerGuest`. */
export function BookingPricingSection({
  values,
  errors,
  onChange,
  guestCount,
  tier,
  total,
  locale,
  currency,
}: BookingPricingSectionProps) {
  const t = useTranslations("booking");

  return (
    <section
      aria-labelledby="booking-pricing-heading"
      className="rounded-xl border bg-card p-5"
    >
      <h2
        id="booking-pricing-heading"
        className="text-sm font-semibold uppercase tracking-widest text-link"
      >
        {t("pricingTitle")}
      </h2>

      <div className="mt-4 grid gap-4">
        <div className="max-w-40">
          <Field id="booking-guests" label={t("guests")} error={errors.guests}>
            <Input
              id="booking-guests"
              name="guests"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              step={1}
              value={values.guests}
              onChange={(event) => onChange("guests", event.target.value)}
              aria-invalid={Boolean(errors.guests)}
              aria-describedby={describedBy("booking-guests", errors.guests)}
            />
          </Field>
        </div>

        {tier && total !== null && (
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              {t("perGuest", {
                price: formatPrice(tier.pricePerGuest, locale, currency),
                count: guestCount,
              })}
            </p>
            <p className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">{t("total")}</span>
              <span className="text-[1.8rem] font-semibold tabular-nums text-link">
                {formatPrice(total, locale, currency)}
              </span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
