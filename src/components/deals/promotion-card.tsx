import Image from "next/image";
import { Ticket } from "lucide-react";
import type { PromotionCard } from "@/lib/promotions";
import { ClaimDealButton } from "./claim-deal-button";

interface PromotionCardProps {
  card: PromotionCard;
  countdownLabel: string;
  claimNowLabel: string;
  claimedLabel: string;
  /** The signed-in visitor already has this promotion in their wallet. */
  claimed: boolean;
}

/**
 * Single /deals card — server component, fed only by `toPromotionCard`.
 *
 * Structure mirrors the tour-card grid: sharp cover thumbnail on top, then a
 * content body (title → description → price → expiry) and a full-width red CTA
 * anchored to the bottom edge. The dark horror palette is preserved (no light
 * surfaces): `bg-card` + hairline white border + blood-red action button.
 */
export function PromotionCard({
  card,
  countdownLabel,
  claimNowLabel,
  claimedLabel,
  claimed,
}: PromotionCardProps) {
  const hasDiscount = Boolean(card.price && card.originalPrice && card.price !== card.originalPrice);
  const mainPrice = card.price ?? card.originalPrice;
  const href = card.tourSlug
    ? `/explore/destinations/${card.tourSlug}`
    : "/contact";

  return (
    <article className="group flex flex-col overflow-hidden rounded-none border border-white/10 bg-card">
      <div
        data-testid="deal-cover"
        data-cover-source={card.coverUrl ? "cms" : "fallback"}
        className="relative aspect-[16/10] w-full overflow-hidden rounded-none bg-[#1c1414]"
      >
        {card.coverUrl ? (
          <Image
            src={card.coverUrl}
            alt={card.coverAlt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="rounded-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          // Dark placeholder until an editor uploads a cover in the Studio.
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,#3a1114_0%,#1c1414_60%,#121212_100%)]"
          >
            <Ticket className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-primary/60" />
          </div>
        )}
        {card.badgeTag && (
          <span className="absolute left-4 top-4 bg-primary px-3 py-1 font-condensed text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground">
            {card.badgeTag}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h2 className="font-sans text-lg font-semibold leading-snug tracking-tight text-heading">
          {card.title}
        </h2>
        {card.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-body">{card.description}</p>
        )}
        {mainPrice && (
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-condensed text-lg font-medium text-link">{mainPrice}</span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">{card.originalPrice}</span>
            )}
          </div>
        )}
        <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {countdownLabel}
          {card.dateLabel && ` · ${card.dateLabel}`}
        </p>
        <div className="mt-auto pt-6">
          <ClaimDealButton
            card={card}
            href={href}
            label={claimNowLabel}
            claimedLabel={claimedLabel}
            claimed={claimed}
          />
        </div>
      </div>
    </article>
  );
}
