import { Link } from "@/i18n/navigation";
import type { NewsItem } from "@/lib/news-content-provider";

interface NewsItemCardProps {
  item: NewsItem;
  href: string;
  ctaLabel: string;
  showCategory?: boolean;
}

export function NewsItemCard({ item, href, ctaLabel, showCategory = true }: NewsItemCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-none border p-6 transition-colors hover:bg-muted"
    >
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {showCategory && item.category && (
          <span className="rounded-none bg-primary/10 px-2.5 py-0.5 font-medium text-link">
            {item.category}
          </span>
        )}
        <span>{item.date}</span>
      </div>
      <h2 className="mb-2 font-display text-2xl font-normal leading-snug text-heading transition-colors group-hover:text-link sm:text-3xl">
        {item.title}
      </h2>
      <p className="text-sm text-body">{item.excerpt}</p>
      <span className="mt-3 inline-block text-sm font-medium text-link">
        {ctaLabel} →
      </span>
    </Link>
  );
}
