import { getTranslations } from "next-intl/server";
import { formatPrice, getCurrency, type PriceTier } from "@/lib/pricing";
import { BookTicketButton } from "@/components/booking/book-ticket-button";

interface PriceBlockProps {
  tiers: PriceTier[];
  locale: string;
  /** Tour slug — when present the booking CTA renders inside this card. */
  slug?: string;
}

/**
 * Right-hand booking card: the per-person unit price per group size plus the
 * primary "Book ticket" CTA.
 *
 * Per-person only by product decision — the derived group total column was
 * removed so the page never shows two competing prices. Renders nothing when a
 * tour has neither tiers nor a booking slug (itinerary pages keep the old
 * "no price, no block" behaviour); the tour detail page always passes a slug,
 * so its CTA survives even when the CMS has no pricing yet.
 */
export async function PriceBlock({ tiers, locale, slug }: PriceBlockProps) {
  if (tiers.length === 0 && !slug) return null;

  const t = await getTranslations("pricing");
  const currency = getCurrency(locale);

  return (
    <section
      aria-labelledby="tour-price-heading"
      data-testid="tour-pricing-card"
      className="rounded-none border border-white/10 bg-card p-5 sm:p-6"
    >
      <h2
        id="tour-price-heading"
        className="text-xs font-semibold uppercase tracking-widest text-link"
      >
        {t("label")}
      </h2>

      {tiers.length > 0 && (
        <div
          role="region"
          aria-labelledby="tour-price-heading"
          tabIndex={0}
          className="mt-3 overflow-x-auto"
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                <th scope="col" className="py-2 pr-4 text-left font-medium">
                  {t("tier")}
                </th>
                <th scope="col" className="py-2 pl-4 text-right font-medium">
                  {t("perGuest")}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tiers.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">{t("disclaimer")}</p>
      )}

      {slug && <BookTicketButton slug={slug} className="mt-5" />}
    </section>
  );
}
