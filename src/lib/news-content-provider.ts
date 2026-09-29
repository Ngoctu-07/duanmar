import type { PortableTextBlock } from "next-sanity";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { ARTICLE_BY_SLUG_QUERY, ARTICLES_QUERY } from "@/sanity/queries/articles";

/** List/card/feed model shared by blog, news, homepage stories, search, sitemap. */
export interface NewsItem {
  slug: string;
  title: string;
  /** Display date ("28 Aug 2026" en / "28/08/2026" vi) */
  date: string;
  /** Raw CMS date for <time dateTime={isoDate}> */
  isoDate: string;
  /** Articles carry no category; cards render pills only when truthy. */
  category?: string;
  excerpt: string;
  content: PortableTextBlock[];
  featuredImageUrl?: string | null;
}

interface SanityArticle {
  title_en?: string | null;
  title_vi?: string | null;
  excerpt_en?: string | null;
  excerpt_vi?: string | null;
  content_en?: PortableTextBlock[] | null;
  content_vi?: PortableTextBlock[] | null;
  slug?: { current?: string };
  publishedAt?: string | null;
  featuredImage?: { asset?: { url?: string } | null } | null;
}

const pick = (locale: string, en?: string | null, vi?: string | null): string =>
  (locale === "vi" ? vi ?? en : en ?? vi) ?? "";

/** CMS date "YYYY-MM-DD" → "28 Aug 2026" (en) / "28/08/2026" (vi), UTC to avoid day shift */
export function formatNewsDate(iso: string, locale: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const options: Intl.DateTimeFormatOptions =
    locale === "vi"
      ? { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }
      : { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

function toNewsItem(article: SanityArticle, locale: string): NewsItem {
  const isoDate = article.publishedAt ?? "";
  return {
    slug: article.slug?.current ?? "",
    title: pick(locale, article.title_en, article.title_vi),
    date: isoDate ? formatNewsDate(isoDate, locale) : "",
    isoDate,
    excerpt: pick(locale, article.excerpt_en, article.excerpt_vi),
    content:
      (locale === "vi" ? article.content_vi : article.content_en) ??
      article.content_en ??
      article.content_vi ??
      [],
    featuredImageUrl: article.featuredImage?.asset?.url ?? null,
  };
}

/**
 * Latest published articles (CMS-only — legacy static mock stories were
 * purged per plan 260929-2151). Empty list when Sanity is unavailable.
 */
export async function getNewsList(locale: string): Promise<NewsItem[]> {
  try {
    const articles = await fetchPublished(ARTICLES_QUERY, {}, { tags: ["sanity:news"] });
    if (!Array.isArray(articles)) return [];
    return (articles as SanityArticle[])
      .map((article) => toNewsItem(article, locale))
      .filter((item) => item.slug !== "");
  } catch {
    return [];
  }
}

/** Single article by slug; null when missing or Sanity is unavailable. */
export async function getNewsArticle(
  slug: string,
  locale: string
): Promise<NewsItem | null> {
  try {
    const article = await fetchPublished(ARTICLE_BY_SLUG_QUERY, { slug }, {
      tags: [`sanity:news:${slug}`],
    });
    if (article?.slug?.current) return toNewsItem(article as SanityArticle, locale);
  } catch {
    // fall through → null
  }
  return null;
}

/** Latest articles (homepage summary widget + blog list), provider order. */
export async function getStories(
  locale: string,
  limit?: number
): Promise<NewsItem[]> {
  const articles = await getNewsList(locale);
  return limit ? articles.slice(0, limit) : articles;
}
