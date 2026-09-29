import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getStories } from "@/lib/news-content-provider";
import { getArticleLikeCounts } from "@/lib/article-likes-db";
import { FeedArticleBlock } from "@/components/blog/feed-article-block";

export const metadata: Metadata = {
  title: "Stories & Inspiration | DuanMar",
  description: "Travel stories and local voices from across Vietnam",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Social-style continuous feed (plan 260929-2254): vertical article
 * stream — oversized title → full-width image → single-column body →
 * heart reaction bar — with dividers between blocks. No ordinals.
 */
export default async function BlogPage({ params }: PageProps) {
  const { locale } = await params;
  const [t, articles] = await Promise.all([getTranslations("blog"), getStories(locale)]);
  const likeCounts = getArticleLikeCounts(articles.map((item) => item.slug));

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      {articles.length === 0 ? (
        <p className="mx-auto max-w-3xl text-center text-muted-foreground">
          {t("subtitle")}
        </p>
      ) : (
        <div className="mx-auto max-w-4xl">
          {articles.map((item) => (
            <FeedArticleBlock
              key={item.slug}
              item={item}
              initialLikeCount={likeCounts.get(item.slug) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
