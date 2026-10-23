import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { TourCard, TOUR_CARD_GRID, type Destination } from "@/components/tours/tour-card";
import { getDb } from "@/lib/db/sqlite-store";
import { buildPriceRangeLabels } from "@/lib/pricing";
import { getRatingAggregates } from "@/lib/reviews-db";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { DESTINATIONS_QUERY } from "@/sanity/queries/destinations";
import { ALL_TOUR_PRICING_QUERY } from "@/sanity/queries/tour-pricing";

export const metadata: Metadata = {
  title: "Destinations | DuanMar",
  description: "Discover places to visit across Vietnam",
};

export default async function DestinationsPage() {
  const [rawDestinations, pricingDocs, t, priceT, locale] = await Promise.all([
    fetchPublished(DESTINATIONS_QUERY, {}, {
      tags: ["sanity:destination:list"],
    }),
    fetchPublished(ALL_TOUR_PRICING_QUERY, {}, { tags: ["sanity:pricing:all"] }),
    getTranslations("destinations"),
    getTranslations("priceRange"),
    getLocale(),
  ]);
  const destinations = rawDestinations ?? [];
  const priceRanges = buildPriceRangeLabels(pricingDocs, locale, priceT("label"));
  // Batch AVG/COUNT for the card badges; storage degraded → `undefined` per
  // card so each badge falls back to its own client-side `/api/ratings` fetch.
  const aggregates = getDb()
    ? getRatingAggregates(destinations.map((dest: Destination) => dest.slug.current))
    : null;
  const aggregateFor = (slug: string) =>
    aggregates ? (aggregates.get(slug) ?? null) : undefined;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="display-title mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      {destinations.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{t("empty")}</p>
      ) : (
        <div className={TOUR_CARD_GRID}>
          {destinations.map((dest: Destination) => (
            <TourCard
              key={dest._id}
              destination={dest}
              actionLabel={t("viewDetails")}
              priceRange={priceRanges[dest.slug.current]}
              aggregate={aggregateFor(dest.slug.current)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
