import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getNewsArticle } from "@/lib/news-content-provider";
import { getArticleLikeCounts, getVisitorLikedSlugs } from "@/lib/article-likes-db";
import { readVisitor } from "@/lib/visitor";
import { FeedArticleBlock } from "@/components/blog/feed-article-block";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function getArticle(slug: string, locale: string) {
  return getNewsArticle(slug, locale);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const data = await getArticle(slug, locale);
  if (!data) return {};
  return {
    title: `${data.title} | DuanMar`,
    description: data.excerpt,
  };
}

/**
 * Unified article detail (plan 260929-2254): renders the exact same
 * FeedArticleBlock as the /blog stream (single = h1, no divider). Old
 * /news/<slug> URLs permanent-redirect here via next.config.
 */
export default async function BlogArticlePage({ params }: PageProps) {
  const { slug, locale } = await params;
  const data = await getArticle(slug, locale);
  if (!data) notFound();

  const t = await getTranslations("news");
  const blogT = await getTranslations("blog");
  const visitor = readVisitor(await cookies());
  const likeCounts = getArticleLikeCounts([slug]);
  const likedSlugs = getVisitorLikedSlugs([slug], visitor);

  return (
    <div className="container mx-auto px-4 py-16">
      <Link
        href="/blog"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← {t("backToList")}
      </Link>

      <div className="mx-auto mt-6 max-w-4xl">
        <FeedArticleBlock
          item={data}
          single
          moreArticlesLabel={blogT("exploreMore")}
          initialLikeCount={likeCounts.get(slug) ?? 0}
          initialLiked={likedSlugs.get(slug) ?? false}
        />
      </div>
    </div>
  );
}
