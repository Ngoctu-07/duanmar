import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PromoVideo } from "@/components/homepage/promo-video";
import { AboutNarrative } from "@/components/homepage/about-narrative";
import type { PortableTextBlock } from "next-sanity";

/**
 * Homepage "About Us" band: 50/50 split — text + Contact CTA on the left,
 * promo video on the right. Sits directly below Featured Destinations.
 * Media comes from the `homepage` CMS doc (file upload > stream URL).
 * Narrative paragraph = CMS Portable Text (no hardcoded copy).
 */
export async function AboutUsSection({
  videoSrc,
  posterSrc,
  storyEn = null,
  storyVi = null,
}: {
  videoSrc?: string | null;
  posterSrc?: string | null;
  storyEn?: PortableTextBlock[] | null;
  storyVi?: PortableTextBlock[] | null;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("home"),
    getLocale(),
  ]);

  return (
    <section data-testid="about-us-section" className="border-y bg-muted/40 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="min-w-0">
            <h2 className="text-3xl font-bold">{t("aboutSection.title")}</h2>
            <AboutNarrative storyEn={storyEn} storyVi={storyVi} locale={locale} />
            <Button
              nativeButton={false}
              render={<Link href="/contact" />}
              className="mt-6 px-8 py-4 text-lg"
            >
              {t("aboutSection.cta")}
            </Button>
          </div>
          <PromoVideo videoSrc={videoSrc} posterSrc={posterSrc} />
        </div>
      </div>
    </section>
  );
}
