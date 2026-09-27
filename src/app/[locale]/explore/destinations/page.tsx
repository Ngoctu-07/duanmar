import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  DestinationCard,
  type Destination,
} from "@/components/explore/destination-card";
import { Link } from "@/i18n/navigation";
import { buildPriceRangeLabels } from "@/lib/pricing";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import {
  DESTINATIONS_QUERY,
} from "@/sanity/queries/destinations";
import { ALL_TOUR_PRICING_QUERY } from "@/sanity/queries/tour-pricing";

export const metadata: Metadata = {
  title: "Destinations | Vietnam Tourism",
  description: "Discover places to visit across Vietnam",
};

const REGIONS = ["north", "central", "south"] as const;

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const { region: rawRegion } = await searchParams;
  const region = REGIONS.includes(rawRegion as (typeof REGIONS)[number])
    ? rawRegion!
    : "";

  const [rawDestinations, pricingDocs, t, priceT, locale] = await Promise.all([
    fetchPublished(DESTINATIONS_QUERY, { region }, {
      tags: ["sanity:destination:list"],
    }),
    fetchPublished(ALL_TOUR_PRICING_QUERY, {}, { tags: ["sanity:pricing:all"] }),
    getTranslations("destinations"),
    getTranslations("priceRange"),
    getLocale(),
  ]);
  const destinations = rawDestinations ?? [];
  const priceRanges = buildPriceRangeLabels(pricingDocs, locale, priceT("label"));

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <Link
          href="/explore/destinations"
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            region === ""
              ? "bg-primary text-primary-foreground border-primary"
              : "hover:bg-muted"
          }`}
        >
          {t("all")}
        </Link>
        {REGIONS.map((r) => (
          <Link
            key={r}
            href={`/explore/destinations?region=${r}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              region === r
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            }`}
          >
            {t(r)}
          </Link>
        ))}
      </div>

      {destinations.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest: Destination) => (
            <DestinationCard
              key={dest._id}
              destination={dest}
              actionLabel={t("viewDetails")}
              priceRange={priceRanges[dest.slug.current]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
