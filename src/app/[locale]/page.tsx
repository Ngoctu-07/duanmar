import { HeroSection } from "@/components/homepage/hero-section";
import { QuickAccessIcons } from "@/components/homepage/quick-access-icons";
import { FeaturedDestinations } from "@/components/homepage/featured-destinations";
import { ExperienceCategories } from "@/components/homepage/experience-categories";
import { NewsletterCTA } from "@/components/homepage/newsletter-cta";
import { StoriesSection } from "@/components/homepage/stories-section";
import { EventsTicker } from "@/components/homepage/events-ticker";
import { TrendingItineraries } from "@/components/homepage/trending-itineraries";
import { TradeCtaBand } from "@/components/homepage/trade-cta-band";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { HOMEPAGE_QUERY, FEATURED_DESTINATIONS_QUERY } from "@/sanity/queries/homepage";
import { ALL_TOUR_PRICING_QUERY } from "@/sanity/queries/tour-pricing";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPriceRangeLabels } from "@/lib/pricing";

export default async function HomePage() {
  const [locale, priceT, homepageData, destinationsData, pricingDocs] =
    await Promise.all([
      getLocale(),
      getTranslations("priceRange"),
      fetchPublished(HOMEPAGE_QUERY, {}, { tags: ["sanity:homepage"] }),
      fetchPublished(FEATURED_DESTINATIONS_QUERY, {}, {
        tags: ["sanity:destination:list"],
      }),
      fetchPublished(ALL_TOUR_PRICING_QUERY, {}, { tags: ["sanity:pricing:all"] }),
    ]);
  const priceRanges = buildPriceRangeLabels(pricingDocs, locale, priceT("label"));

  return (
    <>
      <HeroSection hero={homepageData} />
      <QuickAccessIcons />
      <FeaturedDestinations destinations={destinationsData || []} priceRanges={priceRanges} />
      <ExperienceCategories />
      <TrendingItineraries priceRanges={priceRanges} />
      <EventsTicker />
      <StoriesSection />
      <TradeCtaBand />
      <NewsletterCTA />
    </>
  );
}
