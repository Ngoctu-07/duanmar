import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NewsItemCard } from "@/components/news/news-item-card";
import { getStories } from "@/lib/news-content-provider";

export async function StoriesSection() {
  const [t, locale] = await Promise.all([
    getTranslations("blog"),
    getLocale(),
  ]);
  const stories = await getStories(locale, 3);

  if (stories.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/blog"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")} →
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <NewsItemCard
            key={story.slug}
            item={story}
            href={`/news/${story.slug}`}
            ctaLabel={t("viewArticle")}
            showCategory={false}
          />
        ))}
      </div>
    </section>
  );
}
