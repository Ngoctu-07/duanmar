import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { PromotionCard } from "@/lib/promotions";

interface PromotionCardProps {
  card: PromotionCard;
  countdownLabel: string;
  viewTourLabel: string;
}

/** Single /deals card — server component, fed only by `toPromotionCard`. */
export function PromotionCard({ card, countdownLabel, viewTourLabel }: PromotionCardProps) {
  const hasDiscount = Boolean(card.price && card.originalPrice && card.price !== card.originalPrice);
  const mainPrice = card.price ?? card.originalPrice;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card">
      {card.bannerUrl && (
        <div className="relative aspect-video w-full">
          <Image
            src={card.bannerUrl}
            alt={card.bannerAlt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        {card.badgeTag && (
          <span className="mb-3 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-link">
            {card.badgeTag}
          </span>
        )}
        <h2 className="mb-2 text-xl font-semibold">{card.title}</h2>
        {card.description && (
          <p className="mb-4 text-sm text-muted-foreground">{card.description}</p>
        )}
        {mainPrice && (
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-lg font-bold text-link">{mainPrice}</span>
            {hasDiscount && <span className="text-sm text-muted-foreground line-through">{card.originalPrice}</span>}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span>
            {countdownLabel}
            {card.dateLabel && ` · ${card.dateLabel}`}
          </span>
          {card.tourSlug && (
            <Link
              href={`/explore/destinations/${card.tourSlug}`}
              className="rounded-md border px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
            >
              {viewTourLabel}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
