import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PriceRangeRow } from "@/components/pricing/price-range";
import { buildPriceRangeLabels } from "@/lib/pricing";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { ALL_TOUR_PRICING_QUERY } from "@/sanity/queries/tour-pricing";

export const metadata: Metadata = {
  title: "Suggested Itineraries | DuanMar",
  description: "Ready-made routes from 3 to 14 days across Vietnam",
};

interface ItinerarySummary {
  title: string;
  duration: string;
  regions: string;
  summary: string;
}

export default async function ItinerariesPage() {
  const [t, priceT, locale, pricingDocs] = await Promise.all([
    getTranslations("itineraries"),
    getTranslations("priceRange"),
    getLocale(),
    fetchPublished(ALL_TOUR_PRICING_QUERY, {}, { tags: ["sanity:pricing:all"] }),
  ]);
  const items = t.raw("items") as Record<string, ItinerarySummary>;
  const priceRanges = buildPriceRangeLabels(pricingDocs, locale, priceT("label"));

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(items).map(([slug, itinerary]) => (
          <Link
            key={slug}
            href={`/explore/itineraries/${slug}`}
            className="group flex flex-col rounded-xl border p-6 transition-colors hover:bg-muted"
          >
            <span className="mb-3 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {itinerary.duration}
            </span>
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              {itinerary.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">{itinerary.summary}</p>
            <PriceRangeRow priceRange={priceRanges[slug]} className="mb-4" />
            <p className="mt-auto text-xs text-muted-foreground">{itinerary.regions}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
