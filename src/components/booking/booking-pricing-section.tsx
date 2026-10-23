import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { formatPrice, type PriceCurrency, type PriceTier } from "@/lib/pricing";
import type { VoucherDiscount } from "@/lib/vouchers/voucher-discount";
import { Field, describedBy } from "./booking-field";
import type { BookingErrors, BookingField, BookingValues } from "./booking-validation";

interface BookingPricingSectionProps {
  values: BookingValues;
  errors: BookingErrors;
  onChange: (field: BookingField, value: string) => void;
  guestCount: number;
  tier: PriceTier | null;
  /** Guests × price-per-guest, before any voucher. */
  subtotal: number | null;
  /** Applied voucher discount (`null` when no voucher is selected). */
  discount: VoucherDiscount | null;
  voucherCode: string | null;
  /** Subtotal minus discount — the amount actually charged. */
  payable: number | null;
  locale: string;
  currency: PriceCurrency;
}

/**
 * Guest count drives the live subtotal; the voucher (if any) recalculates the
 * payable total in the same render, so the breakdown never shows stale values.
 */
export function BookingPricingSection({
  values,
  errors,
  onChange,
  guestCount,
  tier,
  subtotal,
  discount,
  voucherCode,
  payable,
  locale,
  currency,
}: BookingPricingSectionProps) {
  const t = useTranslations("booking");
  const discountApplied = discount !== null && discount.amount > 0;

  return (
    <section
      aria-labelledby="booking-pricing-heading"
      className="rounded-none border bg-card p-5"
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

        {tier && subtotal !== null && (
          <div className="rounded-none bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              {t("perGuest", {
                price: formatPrice(tier.pricePerGuest, locale, currency),
                count: guestCount,
              })}
            </p>

            <dl className="mt-3 space-y-1.5 text-sm" data-testid="price-breakdown">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{t("subtotal")}</dt>
                <dd
                  data-testid="price-subtotal"
                  className="tabular-nums font-medium"
                >
                  {formatPrice(subtotal, locale, currency)}
                </dd>
              </div>

              {discountApplied && (
                <div
                  data-testid="price-discount"
                  data-percent={discount.percent}
                  className="flex items-baseline justify-between gap-3 text-link"
                >
                  <dt>
                    {voucherCode
                      ? t("discountWithCode", { code: voucherCode })
                      : t("discount")}
                  </dt>
                  <dd className="tabular-nums font-medium">
                    −{formatPrice(discount.amount, locale, currency)}
                  </dd>
                </div>
              )}

              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                <dt className="font-medium">{t("totalPayable")}</dt>
                <dd
                  data-testid="price-payable"
                  className="text-[1.8rem] font-semibold tabular-nums text-link"
                >
                  {formatPrice(payable ?? subtotal, locale, currency)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}
