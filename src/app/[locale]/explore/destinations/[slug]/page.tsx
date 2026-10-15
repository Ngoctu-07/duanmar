import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { BookTicketButton } from "@/components/booking/book-ticket-button";
import { TourRatingBadge } from "@/components/rating/tour-rating-badge";
import { TourAttributeBadges } from "@/components/explore/tour-attribute-badges";
import { DestinationHeroCarousel } from "@/components/explore/destination-hero-carousel";
import { CustomerReviews } from "@/components/reviews/customer-reviews";
import { PriceBlock } from "@/components/pricing/price-block";
import {
  ItineraryAccordion,
  type ItineraryDay,
} from "@/components/explore/itinerary-accordion";
import { cn } from "@/lib/utils";
import { mapPricingTiers } from "@/lib/pricing";
import { pickGalleryImages } from "@/lib/destination-gallery";
import {
  resolveLocaleBlocks,
  resolveLocaleList,
  resolveLocaleString,
  type LocaleBlocks,
  type LocaleString,
} from "@/lib/bilingual-string";
import { readVisitor } from "@/lib/visitor";
import {
  getRatingAggregates,
  listReviewsForSlug,
  type PublicReview,
  type RatingAggregate,
} from "@/lib/reviews-db";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { DESTINATION_BY_SLUG_QUERY } from "@/sanity/queries/destinations";
import { TOUR_PRICING_BY_SLUG_QUERY } from "@/sanity/queries/tour-pricing";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function getDestination(slug: string) {
  return fetchPublished(DESTINATION_BY_SLUG_QUERY, { slug }, {
    tags: [`sanity:destination:${slug}`],
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const destination = await getDestination(slug);
  if (!destination) return {};
  const tourName = resolveLocaleString(destination.name, locale) ?? slug;
  const tourDescription = resolveLocaleString(destination.description, locale);
  return {
    title: `${tourName} | DuanMar`,
    description: tourDescription?.slice(0, 160),
  };
}

export default async function DestinationDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const [destination, pricingDoc, t] = await Promise.all([
    getDestination(slug),
    fetchPublished(TOUR_PRICING_BY_SLUG_QUERY, { slug }, {
      tags: [`sanity:pricing:${slug}`],
    }),
    getTranslations("destinations"),
  ]);

  if (!destination) notFound();

  // Server-side hydration: visitor-scoped review list + AVG/COUNT so the SSR
  // HTML already carries badge and cards (no empty→populated flash). Storage
  // degraded → leave both props undefined and let the client fetch instead of
  // freezing a wrong "0 reviews" verdict.
  let initialReviews: PublicReview[] | undefined;
  let initialAggregate: RatingAggregate | null | undefined;
  try {
    initialReviews = listReviewsForSlug(slug, readVisitor(await cookies()));
    initialAggregate = getRatingAggregates([slug]).get(slug) ?? null;
  } catch {
    initialReviews = undefined;
    initialAggregate = undefined;
  }

  const tiers = mapPricingTiers(pricingDoc, locale);
  // Bilingual hydration: CMS `{vi,en}` objects (or legacy plain strings)
  // resolve to the active locale, falling back to Vietnamese — never blank.
  const tourName = resolveLocaleString(destination.name, locale) ?? slug;
  const tourDescription = resolveLocaleString(destination.description, locale);
  interface RawItineraryDay {
    dayTitle: LocaleString;
    meals?: LocaleString | null;
    details?: LocaleBlocks;
  }
  const itineraryDays: ItineraryDay[] = ((destination.itinerary ?? []) as RawItineraryDay[]).map(
    (day) => ({
      dayTitle: resolveLocaleString(day.dayTitle, locale) ?? "",
      meals: resolveLocaleString(day.meals ?? null, locale),
      details: resolveLocaleBlocks(day.details, locale),
    })
  );
  const hasItinerary = itineraryDays.length > 0;
  const highlights = resolveLocaleList(destination.highlights, locale);
  const included = resolveLocaleList(destination.inclusions, locale);
  const excluded = resolveLocaleList(destination.exclusions, locale);
  const heroSlides = pickGalleryImages(destination)
    .map((image) =>
      image.asset?.url
        ? { src: image.asset.url, alt: image.alt || tourName }
        : null
    )
    .filter((slide): slide is { src: string; alt: string } => slide !== null);

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/explore/destinations"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← {t("backToList")}
      </Link>

      {heroSlides.length > 0 && <DestinationHeroCarousel slides={heroSlides} />}

      <div
        className={cn(
          "mt-8 grid grid-cols-1 gap-8",
          hasItinerary ? "lg:grid-cols-2 lg:gap-10" : "max-w-3xl"
        )}
      >
        {/* Overview: identity, description, price and reviews. */}
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full border px-3 py-1 text-xs font-medium capitalize">
              {destination.country?.[locale as "vi" | "en"] ??
                (destination.category === "domestic"
                  ? t("vietnam")
                  : t(destination.region as "north" | "central" | "south"))}
            </span>
            <TourAttributeBadges isSpecialTour={destination.isSpecialTour} />
            <BookTicketButton slug={destination.slug.current} />
          </div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <h1 className="min-w-0 text-4xl font-bold">{tourName}</h1>
            <TourRatingBadge slug={slug} initialAggregate={initialAggregate} />
          </div>
          {tourDescription && (
            <p className="text-lg text-muted-foreground whitespace-pre-line">
              {tourDescription}
            </p>
          )}
          {highlights.length > 0 && (
            <section aria-label={t("highlights")} className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-link">
                {t("highlights")}
              </h2>
              <ul className="mt-3 space-y-2">
                {highlights.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span aria-hidden className="mt-0.5 text-link">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <PriceBlock tiers={tiers} locale={locale} />

          {(included.length > 0 || excluded.length > 0) && (
            <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {included.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-link">
                    {t("included")}
                  </h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
                    {included.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {excluded.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-link">
                    {t("excluded")}
                  </h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
                    {excluded.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right column: day-by-day itinerary (hidden until CMS days exist). */}
        {hasItinerary && (
          <ItineraryAccordion title={t("itinerary.title")} days={itineraryDays} />
        )}

        {/* Own grid item so a long review list never pushes the itinerary off-screen on mobile. */}
        {/* key=slug: soft-nav to another tour remounts the section instead of
            briefly showing the previous tour's list while the refetch runs. */}
        <CustomerReviews
          key={slug}
          tourSlug={slug}
          locale={locale}
          initialReviews={initialReviews}
        />
      </div>
    </div>
  );
}
