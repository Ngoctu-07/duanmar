import { getTranslations } from "next-intl/server";
import { formatPrice, getCurrency, type PriceTier } from "@/lib/pricing";

interface PriceBlockProps {
  tiers: PriceTier[];
  locale: string;
}

/**
 * Detailed price breakdown, placed directly under the tour description.
 * Red is used as an accent (label + per-guest prices) instead of colouring the
 * whole block, so the card stays compact and readable.
 * Renders nothing when no tiers are available — never shows made-up prices.
 */
export async function PriceBlock({ tiers, locale }: PriceBlockProps) {
  if (tiers.length === 0) return null;

  const t = await getTranslations("pricing");
  const currency = getCurrency(locale);

  return (
    <section
      aria-labelledby="tour-price-heading"
      className="mb-6 mt-6 rounded-xl border bg-card p-5"
    >
      <h2
        id="tour-price-heading"
        className="text-xs font-semibold uppercase tracking-widest text-destructive"
      >
        {t("label")}
      </h2>

      <div
        role="region"
        aria-labelledby="tour-price-heading"
        tabIndex={0}
        className="mt-3 overflow-x-auto"
      >
        <table className="w-full min-w-[20rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
              <th scope="col" className="py-2 pr-4 text-left font-medium">
                {t("tier")}
              </th>
              <th scope="col" className="py-2 pl-4 text-right font-medium">
                {t("perGuest")}
              </th>
              <th scope="col" className="py-2 pl-4 text-right font-medium">
                {t("groupTotal")}
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, index) => {
              const label =
                tier.maxGuests === null
                  ? t("guestsAtLeast", { min: tier.minGuests })
                  : tier.maxGuests === tier.minGuests
                    ? t("guestsSingle", { count: tier.minGuests })
                    : t("guestsRange", {
                        min: tier.minGuests,
                        max: tier.maxGuests,
                      });

              return (
                <tr
                  key={`${tier.minGuests}-${tier.maxGuests ?? "open"}-${index}`}
                  className="border-b border-border/60 last:border-0"
                >
                  <th scope="row" className="py-2.5 pr-4 text-left font-semibold">
                    {label}
                  </th>
                  <td className="py-2.5 pl-4 text-right font-semibold tabular-nums text-destructive">
                    {formatPrice(tier.pricePerGuest, locale, currency)}
                  </td>
                  <td className="py-2.5 pl-4 text-right tabular-nums text-muted-foreground">
                    {formatPrice(tier.groupTotal, locale, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t("disclaimer")}</p>
    </section>
  );
}
