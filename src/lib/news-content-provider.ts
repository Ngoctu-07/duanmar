import { getMessages } from "next-intl/server";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { POST_BY_SLUG_QUERY, POSTS_QUERY } from "@/sanity/queries/posts";

export interface NewsItem {
  slug: string;
  title: string;
  date: string;
  category: string;
  /** Stable key for filtering: "story" | "pressRelease" | null (static items reverse-mapped) */
  categoryKey: string | null;
  excerpt: string;
  content: string[];
}

interface SanityPost {
  title_en?: string | null;
  title_vi?: string | null;
  excerpt_en?: string | null;
  excerpt_vi?: string | null;
  content_en?: string[] | null;
  content_vi?: string[] | null;
  slug?: { current?: string };
  category?: string | null;
  publishedAt?: string | null;
}

interface StaticNewsItem {
  title: string;
  date: string;
  category: string;
  excerpt: string;
  content: string[];
}

interface NewsMessages {
  news?: {
    categories?: Record<string, string>;
    items?: Record<string, StaticNewsItem>;
  };
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

function resolveCategory(
  key: string | null | undefined,
  messages: NewsMessages
): string {
  if (!key) return "";
  return messages.news?.categories?.[key] ?? key;
}

/** Reverse map: display label ("Story") → stable key ("story") for static items */
function labelToCategoryKey(
  label: string,
  messages: NewsMessages
): string | null {
  const categories = messages.news?.categories ?? {};
  for (const [key, value] of Object.entries(categories)) {
    if (value === label) return key;
  }
  return null;
}

function toNewsItem(post: SanityPost, locale: string, messages: NewsMessages): NewsItem {
  return {
    slug: post.slug?.current ?? "",
    title: pick(locale, post.title_en, post.title_vi),
    date: post.publishedAt ? formatNewsDate(post.publishedAt, locale) : "",
    category: resolveCategory(post.category, messages),
    categoryKey: post.category ?? null,
    excerpt: pick(locale, post.excerpt_en, post.excerpt_vi),
    content:
      (locale === "vi" ? post.content_vi : post.content_en) ??
      post.content_en ??
      post.content_vi ??
      [],
  };
}

function getStaticItems(messages: NewsMessages): Record<string, NewsItem> {
  const items = messages.news?.items ?? {};
  return Object.fromEntries(
    Object.entries(items).map(([slug, item]) => [
      slug,
      { ...item, slug, categoryKey: labelToCategoryKey(item.category, messages) },
    ])
  );
}

/**
 * CMS-first list: published posts (ordered by date) merged with static
 * messages fallback, deduped by slug (CMS wins) so porting an article to
 * Studio shadows its static twin without losing content.
 */
export async function getNewsList(locale: string): Promise<NewsItem[]> {
  const messages = (await getMessages()) as NewsMessages;
  let cmsItems: NewsItem[] = [];
  try {
    const posts = await fetchPublished(POSTS_QUERY, {}, { tags: ["sanity:news"] });
    if (Array.isArray(posts)) {
      cmsItems = (posts as SanityPost[])
        .map((post) => toNewsItem(post, locale, messages))
        .filter((item) => item.slug !== "");
    }
  } catch {
    // Sanity unavailable — static fallback below
  }
  const staticItems = getStaticItems(messages);
  const cmsSlugs = new Set(cmsItems.map((item) => item.slug));
  const rest = Object.values(staticItems).filter((item) => !cmsSlugs.has(item.slug));
  return [...cmsItems, ...rest];
}

/** CMS first, then static fallback; null when nothing matches. */
export async function getNewsArticle(
  slug: string,
  locale: string
): Promise<NewsItem | null> {
  const messages = (await getMessages()) as NewsMessages;
  try {
    const post = await fetchPublished(POST_BY_SLUG_QUERY, { slug }, {
      tags: [`sanity:news:${slug}`],
    });
    if (post?.slug?.current) return toNewsItem(post as SanityPost, locale, messages);
  } catch {
    // Sanity unavailable — static fallback below
  }
  const staticItem = getStaticItems(messages)[slug];
  return staticItem ?? null;
}

/** Story-category items (CMS + static), provider order, optionally limited. */
export async function getStories(
  locale: string,
  limit?: number
): Promise<NewsItem[]> {
  const stories = (await getNewsList(locale)).filter(
    (item) => item.categoryKey === "story"
  );
  return limit ? stories.slice(0, limit) : stories;
}
