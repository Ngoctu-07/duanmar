import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TourRatingBadge } from "@/components/rating/tour-rating-badge";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { DESTINATIONS_QUERY } from "@/sanity/queries/destinations";
import {
  DestinationsMap,
  type MapDestination,
} from "@/components/explore/destinations-map";

export const metadata: Metadata = {
  title: "Interactive Map | DuanMar",
  description: "Explore destinations across Vietnam on the map",
};

const REGION_KEYS = ["north", "central", "south"] as const;

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [destinations, t, td] = await Promise.all([
    fetchPublished(DESTINATIONS_QUERY, { region: "" }, {
      tags: ["sanity:destination:list"],
    }),
    getTranslations("map"),
    getTranslations("destinations"),
  ]);

  interface DestinationRow {
    name: string;
    slug: { current: string };
    region: string | null;
    lat: number | null;
    lng: number | null;
  }
  const rows = (destinations ?? []) as DestinationRow[];
  const items: (MapDestination & { region: string })[] = rows.map((d) => ({
    name: d.name,
    slug: d.slug.current,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
    region: d.region ?? "",
  }));
  const missingCoords = items.some((item) => item.lat == null || item.lng == null);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <DestinationsMap destinations={items} locale={locale} />

      {missingCoords && items.length > 0 && (
        <p className="mt-3 text-sm text-muted-foreground text-center">
          {t("markersNote")}
        </p>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">{t("listTitle")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/explore/destinations/${item.slug}`}
              className="group rounded-xl border p-5 transition-colors hover:bg-muted"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 font-semibold group-hover:text-primary transition-colors">
                  {item.name}
                </h3>
                <TourRatingBadge slug={item.slug} />
              </div>
              {REGION_KEYS.includes(item.region as (typeof REGION_KEYS)[number]) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {td(item.region as "north" | "central" | "south")}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
