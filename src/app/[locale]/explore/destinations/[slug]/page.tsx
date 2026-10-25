import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { BookTicketButton } from "@/components/booking/book-ticket-button";
import { TourRatingBadge } from "@/components/rating/tour-rating-badge";
import { TourAttributeBadges } from "@/components/explore/tour-attribute-badges";
import { TourDetailExtras } from "@/components/explore/tour-detail-extras";
import { TourPoster } from "@/components/explore/tour-poster";
import { CustomerReviews } from "@/components/reviews/customer-reviews";
import { PriceBlock } from "@/components/pricing/price-block";
import { ItineraryAccordion, type ItineraryDay } from "@/components/explore/itinerary-accordion";
import { cn } from "@/lib/utils";
import { mapPricingTiers } from "@/lib/pricing";
import { pickPosterImage } from "@/lib/destination-poster";
import {
  resolveLocaleBlocks,
  resolveLocaleList,
  resolveLocaleString,
  resolveLocalizedField,
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
  const tourDescription = resolveLocalizedField(
    destination.description,
    destination.descriptionEn,
    locale
  );
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
    initialReviews = await listReviewsForSlug(slug, readVisitor(await cookies()));
    initialAggregate = (await getRatingAggregates([slug])).get(slug) ?? null;
  } catch {
    initialReviews = undefined;
    initialAggregate = undefined;
  }

  const tiers = mapPricingTiers(pricingDoc, locale);
  // Base fields are the primary Vietnamese source (VI renders them
  // directly); EN renders descriptionEn/itineraryEn with base fallback.
  const tourName = resolveLocaleString(destination.name, locale) ?? slug;
  const tourDescription = resolveLocalizedField(
    destination.description,
    destination.descriptionEn,
    locale
  );
  interface RawItineraryDay {
    dayTitle: LocaleString;
    meals?: LocaleString | null;
    details?: LocaleBlocks;
  }
  const nonEmptyDays = (value: unknown): RawItineraryDay[] | null =>
    Array.isArray(value) && value.length > 0 ? (value as RawItineraryDay[]) : null;
  const rawItineraryDays =
    (locale === "en" ? nonEmptyDays(destination.itineraryEn) : null) ??
    ((destination.itinerary ?? []) as RawItineraryDay[]);
  const itineraryDays: ItineraryDay[] = rawItineraryDays.map((day) => ({
    dayTitle: resolveLocaleString(day.dayTitle, locale) ?? "",
    meals: resolveLocaleString(day.meals ?? null, locale),
    details: resolveLocaleBlocks(day.details, locale),
  }));
  const hasItinerary = itineraryDays.length > 0;
  const highlights = resolveLocaleList(destination.highlights, locale);
  const included = resolveLocaleList(destination.inclusions, locale);
  const excluded = resolveLocaleList(destination.exclusions, locale);
  // Single Studio poster asset — no gallery array, no slider. Tours without one
  // keep the single-column reading measure.
  const poster = pickPosterImage(destination);
  const posterImage = poster?.asset?.url
    ? { src: poster.asset.url, alt: poster.alt || tourName }
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link
        href="/explore/destinations"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← {t("backToList")}
      </Link>

      {/* Header row: title + tags. Outside the grid so the poster can start on
          the description baseline. Wide horizontal gap keeps the display title
          visually separated from the taxonomy chips; it collapses to the row
          gap when the header wraps. */}
      <header className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-5">
        <h1 className="display-title min-w-0">{tourName}</h1>
        <TourRatingBadge slug={slug} initialAggregate={initialAggregate} />
        <div
          data-testid="tour-meta-tags"
          className="flex flex-wrap items-center gap-5"
        >
          <span
            data-testid="tour-country-chip"
            className="rounded-none border px-3 py-1 text-sm font-medium capitalize"
          >
            {destination.country?.[locale as "vi" | "en"] ??
              (destination.category === "domestic"
                ? t("vietnam")
                : t(destination.region as "north" | "central" | "south"))}
          </span>
          <TourAttributeBadges isSpecialTour={destination.isSpecialTour} />
          <BookTicketButton slug={destination.slug.current} />
        </div>
      </header>

      {/* Two-column body: description → itinerary → price left, static poster
          right; items-start keeps both tops equal. */}
      <div
        className={cn(
          "mt-8 grid grid-cols-1 items-start gap-8",
          posterImage ? "lg:grid-cols-2 lg:gap-8" : "max-w-3xl"
        )}
      >
        <article className="flex min-w-0 flex-col gap-6">
          {tourDescription && (
            <p
              data-testid="tour-description"
              className="text-lg text-muted-foreground whitespace-pre-line text-justify"
            >
              {tourDescription}
            </p>
          )}

          {hasItinerary && (
            <ItineraryAccordion title={t("itinerary.title")} days={itineraryDays} />
          )}

          <PriceBlock tiers={tiers} locale={locale} />
        </article>

        {posterImage && <TourPoster image={posterImage} />}
      </div>

      <TourDetailExtras
        highlights={highlights}
        included={included}
        excluded={excluded}
      />

      {/* key=slug remounts on soft-nav instead of showing the previous list. */}
      <div className="mt-14">
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
