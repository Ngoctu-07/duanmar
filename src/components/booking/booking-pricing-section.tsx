import { useTranslations } from "next-intl";
import { formatPrice, type PriceCurrency, type PriceTier } from "@/lib/pricing";
import type { VoucherDiscount } from "@/lib/vouchers/voucher-discount";

interface BookingPricingSectionProps {
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
 * Final checkout summary, below the voucher step and directly above the
 * "Confirm booking" CTA. Everything here is derived from the live guest count
 * and applied voucher, so the discount line and red payable total can never
 * show stale values while the rest of the form is being edited.
 */
export function BookingPricingSection({
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
      data-testid="booking-price-summary"
      className="rounded-none border bg-card p-5"
    >
      <h2
        id="booking-pricing-heading"
        className="text-sm font-semibold uppercase tracking-widest text-link"
      >
        {t("priceSummaryTitle")}
      </h2>

      {/* No submittable guest count → no fabricated total; the guest field
          already carries the inline validation error. */}
      {tier && subtotal !== null && (
        <div className="mt-4">
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
    </section>
  );
}
