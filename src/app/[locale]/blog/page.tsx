import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewsItemCard } from "@/components/news/news-item-card";
import { getStories } from "@/lib/news-content-provider";

export const metadata: Metadata = {
  title: "Stories & Inspiration | Vietnam Tourism",
  description: "Travel stories and local voices from across Vietnam",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function BlogPage({ params }: PageProps) {
  const { locale } = await params;
  const [t, stories] = await Promise.all([getTranslations("blog"), getStories(locale)]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      {stories.length === 0 ? (
        <p className="mx-auto max-w-3xl text-center text-muted-foreground">
          {t("subtitle")}
        </p>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
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
      )}
    </div>
  );
}
