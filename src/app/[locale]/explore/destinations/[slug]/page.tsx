import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { BookTicketButton } from "@/components/booking/book-ticket-button";
import { TourRatingBadge } from "@/components/rating/tour-rating-badge";
import { TourAttributeBadges } from "@/components/explore/tour-attribute-badges";
import { DestinationHeroCarousel } from "@/components/explore/destination-hero-carousel";
import { CustomerReviews } from "@/components/reviews/customer-reviews";
import { PriceBlock } from "@/components/pricing/price-block";
import { mapPricingTiers } from "@/lib/pricing";
import { pickGalleryImages } from "@/lib/destination-gallery";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import {
  DESTINATION_BY_SLUG_QUERY,
  DESTINATION_SLUGS_QUERY,
} from "@/sanity/queries/destinations";
import { TOUR_PRICING_BY_SLUG_QUERY } from "@/sanity/queries/tour-pricing";

/** ISR safety net: regenerate at most every 5 min if the revalidate webhook misses. */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function getDestination(slug: string) {
  return fetchPublished(DESTINATION_BY_SLUG_QUERY, { slug }, {
    tags: [`sanity:destination:${slug}`],
  });
}

export async function generateStaticParams() {
  const slugs = await fetchPublished(DESTINATION_SLUGS_QUERY);
  return (slugs ?? []).map((entry: { slug: string }) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getDestination(slug);
  if (!destination) return {};
  return {
    title: `${destination.name} | DuanMar`,
    description: destination.description?.slice(0, 160),
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

  const tiers = mapPricingTiers(pricingDoc, locale);
  const heroSlides = pickGalleryImages(destination)
    .map((image) =>
      image.asset?.url
        ? { src: image.asset.url, alt: image.alt || destination.name }
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

      <div className="mt-8 max-w-3xl">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-full border px-3 py-1 text-xs font-medium capitalize">
            {destination.country?.[locale as "vi" | "en"] ??
              (destination.category === "domestic"
                ? t("vietnam")
                : t(destination.region as "north" | "central" | "south"))}
          </span>
          <TourAttributeBadges
            isSpecialTour={destination.isSpecialTour}
          />
          <BookTicketButton slug={destination.slug.current} />
        </div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-4xl font-bold">{destination.name}</h1>
          <TourRatingBadge slug={slug} />
        </div>
        {destination.description && (
          <p className="text-lg text-muted-foreground whitespace-pre-line">
            {destination.description}
          </p>
        )}

        <PriceBlock tiers={tiers} locale={locale} />

        <CustomerReviews tourSlug={slug} locale={locale} />
      </div>
    </div>
  );
}
