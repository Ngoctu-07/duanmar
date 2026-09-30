import { getLocale, getTranslations } from "next-intl/server";
import {
  DestinationCard,
  type Destination,
} from "@/components/explore/destination-card";
import { filterDestinations } from "@/lib/tour-search";
import { buildPriceRangeLabels } from "@/lib/pricing";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { DESTINATIONS_QUERY } from "@/sanity/queries/destinations";
import { ALL_TOUR_PRICING_QUERY } from "@/sanity/queries/tour-pricing";

/**
 * Grid behind `/tours` and `/tours?search=…`: fetches every published
 * destination once (cached by query+params) and filters in memory, so the
 * whole result set shares a single Sanity read regardless of the query.
 */
export async function TourSearchResults({ query }: { query: string }) {
  const [rawDestinations, pricingDocs, actionT, toursT, priceT, locale] =
    await Promise.all([
      fetchPublished(DESTINATIONS_QUERY, { region: "" }, {
        tags: ["sanity:destination:list"],
      }),
      fetchPublished(ALL_TOUR_PRICING_QUERY, {}, {
        tags: ["sanity:pricing:all"],
      }),
      getTranslations("destinations"),
      getTranslations("tours"),
      getTranslations("priceRange"),
      getLocale(),
    ]);
  const destinations = filterDestinations(rawDestinations ?? [], query);

  if (destinations.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {query ? toursT("noSearchResults") : toursT("empty")}
      </p>
    );
  }

  const priceRanges = buildPriceRangeLabels(pricingDocs, locale, priceT("label"));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {destinations.map((dest: Destination) => (
        <DestinationCard
          key={dest._id}
          destination={dest}
          actionLabel={actionT("viewDetails")}
          priceRange={priceRanges[dest.slug.current]}
        />
      ))}
    </div>
  );
}
