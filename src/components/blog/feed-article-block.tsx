import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { NewsItem } from "@/lib/news-content-provider";
import { ArticleRichText } from "@/components/sanity/portable-text";
import { HeartButton } from "./heart-button";

interface FeedArticleBlockProps {
  item: NewsItem;
  /** Hydrated from the SQLite like store (server). */
  initialLikeCount?: number;
  /** Detail mode: renders an h1 (feed mode uses h2). */
  single?: boolean;
}

/**
 * One block in the social-style continuous feed (plan 260929-2254):
 * oversized title → full-width featured image → expanded single-column
 * body (max-w-4xl mx-auto — fixes the newspaper column clustering) →
 * bottom reaction bar. `border-t` supplies the divider between stacked
 * articles; no ordinals/numbering anywhere.
 */
export function FeedArticleBlock({
  item,
  initialLikeCount = 0,
  single = false,
}: FeedArticleBlockProps) {
  const Heading = single ? "h1" : "h2";

  return (
    <article
      data-testid="feed-article-block"
      className="border-t border-border py-12 first:border-t-0 first:pt-0"
    >
      <time
        dateTime={item.isoDate || undefined}
        className="text-xs font-medium uppercase tracking-widest text-primary"
      >
        {item.date}
      </time>
      <Heading className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight transition-colors hover:text-primary md:text-5xl">
        {single ? (
          item.title
        ) : (
          <Link href={`/blog/${item.slug}`}>{item.title}</Link>
        )}
      </Heading>
      {item.featuredImageUrl && (
        <figure className="relative mt-6 aspect-video overflow-hidden rounded-xl">
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
          <p className="text-lg italic text-muted-foreground">{item.excerpt}</p>
        )}
        <ArticleRichText
          blocks={item.content}
          className="mt-4 space-y-5 text-lg leading-relaxed text-foreground/80"
        />
      </div>
      <div className="mt-8 flex items-center border-t border-border pt-4">
        <HeartButton slug={item.slug} initialCount={initialLikeCount} />
      </div>
    </article>
  );
}
