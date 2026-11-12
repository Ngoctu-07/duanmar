"use client";

import { useTranslations } from "next-intl";
import { TourCard, TOUR_CARD_GRID, type Destination } from "@/components/tours/tour-card";
import type { PriceRangeLabel } from "@/lib/pricing";

interface FeaturedDestinationsProps {
  destinations: Destination[];
  priceRanges: Record<string, PriceRangeLabel>;
}

/**
 * Homepage "Featured Destinations" — open horror-gallery layout: a tall
 * condensed title, then borderless cards with wide sharp-cornered thumbnails
 * and left-aligned content beneath (no visible card box). No eyebrow label sits
 * above the heading.
 */
export function FeaturedDestinations({
  destinations,
  priceRanges,
}: FeaturedDestinationsProps) {
  const t = useTranslations("home");

  return (
    <section
      id="featured-tours"
      data-testid="featured-destinations"
      className="relative scroll-mt-20 pb-20 md:pb-28"
    >
      <div className="container mx-auto px-4">
        <header className="mx-auto mb-14 max-w-4xl text-center md:mb-20">
          <h2 className="display-title">{t("featuredDestinations")}</h2>
        </header>
        <div className={TOUR_CARD_GRID}>
          {destinations.map((dest) => (
            <TourCard
              key={dest._id}
              destination={dest}
              actionLabel={t("exploreNow")}
              priceRange={priceRanges[dest.slug.current]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
