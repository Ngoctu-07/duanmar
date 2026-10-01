import { HeroSection } from "@/components/homepage/hero-section";
import { QuickAccessIcons } from "@/components/homepage/quick-access-icons";
import { FeaturedDestinations } from "@/components/homepage/featured-destinations";
import { AboutUsSection } from "@/components/homepage/about-us-section";
import { StoriesSection } from "@/components/homepage/stories-section";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { HOMEPAGE_QUERY, FEATURED_DESTINATIONS_QUERY } from "@/sanity/queries/homepage";
import { ALL_TOUR_PRICING_QUERY } from "@/sanity/queries/tour-pricing";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPriceRangeLabels } from "@/lib/pricing";
import { pickBilingual } from "@/lib/bilingual-string";

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
  // Bilingual CMS slogan → legacy heroSubtitle → i18n fallback inside the component.
  const heroSlogan =
    pickBilingual(homepageData?.heroSlogan, locale) ||
    homepageData?.heroSubtitle?.trim() ||
    null;
  // About Us media: uploaded file wins over the external stream URL (plan 260929-1500).
  const aboutVideoSrc =
    homepageData?.aboutUsVideo?.asset?.url ??
    homepageData?.aboutUsVideoStreamUrl ??
    null;
  const aboutPosterSrc = homepageData?.aboutUsVideoPoster?.asset?.url ?? null;

  return (
    <>
      <HeroSection hero={homepageData} slogan={heroSlogan} />
      <QuickAccessIcons />
      <FeaturedDestinations destinations={destinationsData || []} priceRanges={priceRanges} />
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
