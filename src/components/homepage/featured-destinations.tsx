"use client";

import { useTranslations } from "next-intl";
import {
  DestinationCard,
  type Destination,
} from "@/components/explore/destination-card";
import type { PriceRangeLabel } from "@/lib/pricing";

interface FeaturedDestinationsProps {
  destinations: Destination[];
  priceRanges: Record<string, PriceRangeLabel>;
}

export function FeaturedDestinations({
  destinations,
  priceRanges,
}: FeaturedDestinationsProps) {
  const t = useTranslations("home");

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          {t("featuredDestinations")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest) => (
            <DestinationCard
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
