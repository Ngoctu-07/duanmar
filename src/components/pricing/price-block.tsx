import { getTranslations } from "next-intl/server";
import { formatPrice, getCurrency, type PriceTier } from "@/lib/pricing";

interface PriceBlockProps {
  tiers: PriceTier[];
  locale: string;
}

/**
 * Detailed price breakdown, placed at the bottom of the tour text column.
 * Plain typography only — no card, border or fill: the heading, column labels
 * and weight/size hierarchy separate the data. Red stays an accent on the
 * heading + per-guest prices. Renders nothing when no tiers are available —
 * never shows made-up prices.
 */
export async function PriceBlock({ tiers, locale }: PriceBlockProps) {
  if (tiers.length === 0) return null;

  const t = await getTranslations("pricing");
  const currency = getCurrency(locale);

  return (
    <section
      aria-labelledby="tour-price-heading"
      className="mt-4 mb-8"
    >
      <h2
        id="tour-price-heading"
        className="text-xs font-semibold uppercase tracking-widest text-link"
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
            <tr className="text-xs uppercase tracking-widest text-muted-foreground">
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
                >
                  <th scope="row" className="py-3 pr-4 text-left font-semibold">
                    {label}
                  </th>
                  <td className="py-3 pl-4 text-right text-[1.4rem] font-semibold tabular-nums text-link">
                    {formatPrice(tier.pricePerGuest, locale, currency)}
                  </td>
                  <td className="py-3 pl-4 text-right text-[1.4rem] font-semibold tabular-nums text-muted-foreground">
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
