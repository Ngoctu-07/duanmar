import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NewsItem } from "@/lib/news-content-provider";
import { ArticleRichText } from "@/components/sanity/portable-text";
import { HeartButton } from "./heart-button";

interface FeedArticleBlockProps {
  item: NewsItem;
  /** Hydrated from the SQLite like store (server). */
  initialLikeCount?: number;
  /** Visitor-scoped vote state hydrated from the SQLite like store (server). */
  initialLiked?: boolean;
  /**
   * Detail mode: renders an h1 with plain text. Feed mode renders a linked h2.
   * The title styling is shared, so both routes look identical.
   */
  single?: boolean;
  /**
   * Detail mode only: label for the bottom "explore more articles" CTA that
   * routes back to the /blog archive. Omitted in feed mode (no CTA).
   */
  moreArticlesLabel?: string;
}

/** One title style for the feed and the detail route — no route-specific size. */
const ARTICLE_TITLE_CLASS =
  "mx-auto mt-3 max-w-4xl text-balance text-center font-display text-3xl font-normal leading-snug tracking-tight text-heading md:text-4xl";

/**
 * One block in the social-style continuous feed (plan 260929-2254):
 * centered title → full-width featured image → expanded single-column
 * body (max-w-4xl mx-auto — fixes the newspaper column clustering) →
 * bottom reaction bar. `border-t` supplies the divider between stacked
 * articles; no ordinals/numbering anywhere. Both `/blog` and `/blog/<slug>`
 * render this component, so the article UI is identical on both paths.
 */
export function FeedArticleBlock({
  item,
  initialLikeCount = 0,
  initialLiked = false,
  single = false,
  moreArticlesLabel,
}: FeedArticleBlockProps) {
  const Heading = single ? "h1" : "h2";

  return (
    <article
      data-testid="feed-article-block"
      className="border-t border-border py-12 first:border-t-0 first:pt-0"
    >
      <time
        dateTime={item.isoDate || undefined}
        className="text-xs font-medium uppercase tracking-widest text-link"
      >
        {item.date}
      </time>
      <Heading data-testid="feed-article-title" className={ARTICLE_TITLE_CLASS}>
        {single ? (
          item.title
        ) : (
          <Link
            href={`/blog/${item.slug}`}
            className="transition-colors hover:text-link"
          >
            {item.title}
          </Link>
        )}
      </Heading>
      {item.featuredImageUrl && (
        <figure className="relative mt-6 aspect-video overflow-hidden rounded-none">
          <Image
            src={item.featuredImageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </figure>
      )}
      <div className="mx-auto mt-6 max-w-4xl">
        {item.excerpt && (
          <p className="text-base italic text-body">{item.excerpt}</p>
        )}
        <ArticleRichText
          blocks={item.content}
          className="mt-4 space-y-5 text-base leading-relaxed text-body"
        />
      </div>
      {single && moreArticlesLabel && (
        <div className="mx-auto mt-10 max-w-4xl">
          <Link
            href="/blog"
            data-testid="blog-explore-more"
            className="group inline-flex items-center gap-2 rounded-none bg-transparent font-sans text-sm font-semibold uppercase tracking-[0.18em] text-link transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>{moreArticlesLabel}</span>
            <ArrowRight
              aria-hidden
              className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>
      )}
      <div className="mt-8 flex items-center border-t border-border pt-4">
        <HeartButton
          slug={item.slug}
          initialCount={initialLikeCount}
          initialLiked={initialLiked}
        />
      </div>
    </article>
  );
}
