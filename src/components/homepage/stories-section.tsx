import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NewsItemCard } from "@/components/news/news-item-card";
import { getStories } from "@/lib/news-content-provider";
import { STORIES_SECTION_SUBTITLE_DEFAULT } from "@/lib/stories-section-copy";

type StoriesSectionProps = {
  /**
   * Subtitle from the `storiesSection` Sanity document. Holds the Vietnamese
   * copy, so the English locale keeps its i18n subtitle.
   */
  subtitle?: string | null;
};

export async function StoriesSection({
  subtitle = STORIES_SECTION_SUBTITLE_DEFAULT,
}: StoriesSectionProps = {}) {
  const [t, locale] = await Promise.all([
    getTranslations("blog"),
    getLocale(),
  ]);
  const stories = await getStories(locale, 3);

  if (stories.length === 0) return null;

  const subtitleText =
    locale === "en"
      ? t("subtitle")
      : subtitle?.trim() || STORIES_SECTION_SUBTITLE_DEFAULT;

  return (
    <section
      data-testid="stories-section"
      className="container mx-auto px-4 py-16"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display-title text-balance">
            {t("title")}
          </h2>
          <p
            data-testid="stories-section-subtitle"
            className="mt-2 font-sans text-neutral-400 opacity-80 tracking-wider"
          >
            {subtitleText}
          </p>
        </div>
        <Link
          href="/blog"
          className="text-sm font-medium text-link hover:underline"
        >
          {t("viewAll")} →
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <NewsItemCard
            key={story.slug}
            item={story}
            href={`/blog/${story.slug}`}
            ctaLabel={t("viewArticle")}
            showCategory={false}
          />
        ))}
      </div>
    </section>
  );
}
