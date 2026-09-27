import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PriceRangeRow } from "@/components/pricing/price-range";
import type { PriceRangeLabel } from "@/lib/pricing";

interface ItinerarySummary {
  title: string;
  duration: string;
  regions: string;
  summary: string;
}

interface TrendingItinerariesProps {
  priceRanges: Record<string, PriceRangeLabel>;
}

export async function TrendingItineraries({
  priceRanges,
}: TrendingItinerariesProps) {
  const [t, th] = await Promise.all([
    getTranslations("home"),
    getTranslations("itineraries"),
  ]);
  const items = th.raw("items") as Record<string, ItinerarySummary>;
  const featured = Object.entries(items).slice(0, 3);

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{th("title")}</h2>
          <p className="mt-2 text-muted-foreground">{th("subtitle")}</p>
        </div>
        <Link
          href="/explore/itineraries"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("trendingViewAll")} →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featured.map(([slug, itinerary]) => (
          <Link
            key={slug}
            href={`/explore/itineraries/${slug}`}
            className="group flex flex-col rounded-xl border p-6 transition-colors hover:bg-muted"
          >
            <span className="mb-3 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {itinerary.duration}
            </span>
            <h3 className="mb-2 text-xl font-semibold transition-colors group-hover:text-primary">
              {itinerary.title}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">{itinerary.summary}</p>
            <PriceRangeRow priceRange={priceRanges[slug]} className="mb-4" />
            <p className="mt-auto text-xs text-muted-foreground">{itinerary.regions}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
