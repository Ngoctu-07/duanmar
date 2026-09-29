import { getLocale, getTranslations } from "next-intl/server";
import {
  DestinationCard,
  type Destination,
} from "@/components/explore/destination-card";
import { buildPriceRangeLabels } from "@/lib/pricing";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { DESTINATIONS_BY_CATEGORY_QUERY } from "@/sanity/queries/destinations";
import { ALL_TOUR_PRICING_QUERY } from "@/sanity/queries/tour-pricing";

type TourCategory = "domestic" | "international";

/**
 * Category grid for /tours/domestic|international. GROQ enforces the filter
 * strictly (`category == $category`) — uncategorized docs render on neither
 * tab. Pill tabs live in tours/layout.tsx (persistent across tab switches).
 */
export async function TourCategorySection({
  category,
}: {
  category: TourCategory;
}) {
  const [rawDestinations, pricingDocs, t, toursT, priceT, locale] =
    await Promise.all([
      fetchPublished(DESTINATIONS_BY_CATEGORY_QUERY, { category }, {
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
  const destinations = rawDestinations ?? [];
  const priceRanges = buildPriceRangeLabels(pricingDocs, locale, priceT("label"));

  if (destinations.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {toursT("empty")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {destinations.map((dest: Destination) => (
        <DestinationCard
          key={dest._id}
          destination={dest}
          actionLabel={t("viewDetails")}
          priceRange={priceRanges[dest.slug.current]}
        />
      ))}
    </div>
  );
}
