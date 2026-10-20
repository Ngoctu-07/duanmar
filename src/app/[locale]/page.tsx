import { HeroSection } from "@/components/homepage/hero-section";
import { HomeSearch } from "@/components/homepage/home-search";
import { FeaturedDestinations } from "@/components/homepage/featured-destinations";
import { EditorialAnnouncementSection } from "@/components/homepage/editorial-announcement-section";
import { AboutUsSection } from "@/components/homepage/about-us-section";
import { StoriesSection } from "@/components/homepage/stories-section";
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
  // Hero media: uploaded promo file wins over the external stream URL; the
  // poster (else the hero image) frames the video before playback.
  const heroVideoSrc =
    homepageData?.promoVideo?.asset?.url ??
    homepageData?.promoVideoUrl ??
    null;
  const heroPosterSrc = homepageData?.promoVideoPoster?.asset?.url ?? null;
  // About Us media: uploaded file wins over the external stream URL (plan 260929-1500).
  const aboutVideoSrc =
    homepageData?.aboutUsVideo?.asset?.url ??
    homepageData?.aboutUsVideoStreamUrl ??
    null;
  const aboutPosterSrc = homepageData?.aboutUsVideoPoster?.asset?.url ?? null;

  return (
    <>
      <HeroSection
        hero={homepageData}
        videoSrc={heroVideoSrc}
        posterSrc={heroPosterSrc}
      />
      <HomeSearch />
      <FeaturedDestinations destinations={destinationsData || []} priceRanges={priceRanges} />
      <EditorialAnnouncementSection
        data={homepageData?.editorialAnnouncement ?? null}
      />
      <AboutUsSection
        videoSrc={aboutVideoSrc}
        posterSrc={aboutPosterSrc}
        storyEn={homepageData?.narrativeStory_en ?? null}
        storyVi={homepageData?.narrativeStory_vi ?? null}
      />
      <StoriesSection />
    </>
  );
}
