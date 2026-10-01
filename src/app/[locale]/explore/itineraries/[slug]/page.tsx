import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PriceBlock } from "@/components/pricing/price-block";
import { mapPricingTiers } from "@/lib/pricing";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { TOUR_PRICING_BY_SLUG_QUERY } from "@/sanity/queries/tour-pricing";

interface ItineraryDay {
  day: string;
  title: string;
  content: string;
}

interface ItineraryData {
  title: string;
  duration: string;
  regions: string;
  summary: string;
  days: ItineraryDay[];
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function getItinerary(slug: string) {
  const t = await getTranslations("itineraries");
  const items = t.raw("items") as Record<string, ItineraryData>;
  const data = items[slug];
  if (!data) return null;
  return { t, data };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getItinerary(slug);
  if (!result) return {};
  return {
    title: `${result.data.title} | DuanMar`,
    description: result.data.summary,
  };
}

export default async function ItineraryPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const [result, pricingDoc] = await Promise.all([
    getItinerary(slug),
    fetchPublished(TOUR_PRICING_BY_SLUG_QUERY, { slug }, {
      tags: [`sanity:pricing:${slug}`],
    }),
  ]);

  if (!result) notFound();

  const { t, data } = result;
  const tiers = mapPricingTiers(pricingDoc, locale);

  return (
    <div className="container mx-auto px-4 py-16">
      <Link
        href="/explore/itineraries"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← {t("backToList")}
      </Link>

      <div className="mt-6 max-w-3xl">
        <span className="mb-3 block w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-link">
          {data.duration}
        </span>
        <h1 className="text-4xl font-bold mb-3">{data.title}</h1>
        <p className="text-muted-foreground mb-2">{data.regions}</p>
        <p className="text-lg text-muted-foreground mb-10">{data.summary}</p>

        <PriceBlock tiers={tiers} locale={locale} />

        <ol className="space-y-6">
          {data.days.map((day) => (
            <li key={day.day} className="rounded-xl border p-6">
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-link">
                  {day.day}
                </span>
                <h2 className="text-lg font-semibold">{day.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{day.content}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
