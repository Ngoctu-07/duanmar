import { MapPin } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { PriceRangeRow } from "@/components/pricing/price-range";
import type { PriceRangeLabel } from "@/lib/pricing";
import { Link } from "@/i18n/navigation";
import { TourRatingBadge } from "@/components/rating/tour-rating-badge";
import { pickCardImage } from "@/lib/destination-poster";
import {
  resolveLocaleString,
  resolveLocalizedField,
  type LocaleString,
} from "@/lib/bilingual-string";

export interface Destination {
  _id: string;
  name: LocaleString;
  slug: { current: string };
  region: string;
  category?: "domestic" | "international";
  country?: { vi: string; en: string; code?: string } | null;
  description?: LocaleString;
  /** Explicit English overview (base `description` is the VI source). */
  descriptionEn?: string | null;
  /** Landscape crop for cards; falls back to `mainPoster` when empty. */
  cardThumbnail?: { asset?: { url: string }; alt?: string };
  /** Portrait detail poster (also the card fallback). */
  mainPoster?: { asset?: { url: string }; alt?: string };
  /** Deprecated pre-refactor field, still projected as a fallback. */
  posterImage?: { asset?: { url: string }; alt?: string };
}

/**
 * Shared grid for every tour-card surface (homepage, categories, `/tours`,
 * search, destinations listing). Open cards need the homepage's roomier
 * rhythm — the same gaps are inherited everywhere so the layouts never drift.
 */
export const TOUR_CARD_GRID =
  "grid grid-cols-1 gap-14 md:grid-cols-2 md:gap-x-8 md:gap-y-16 lg:grid-cols-3";

interface TourCardProps {
  destination: Destination;
  actionLabel: string;
  priceRange?: PriceRangeLabel | null;
  /**
   * Server-computed rating aggregate (destinations listing RSC); `null` = the
   * server saw 0 reviews (badge hides), omit to let the badge fetch — other
   * consumers (homepage/search/category) keep the client-side path.
   */
  aggregate?: { avg: number; count: number } | null;
}

/**
 * THE tour card — single source of truth for every tour surface.
 *
 * Homepage "featured destinations" design adopted globally: an open (boxless)
 * card with a 16:9 sharp-cornered thumbnail, a small uppercase location meta row,
 * a large Gypsy title, a 2-line description, the price range and a solid red
 * action tag. No card background, border, shadow or radius is ever applied.
 */
export function TourCard({
  destination,
  actionLabel,
  priceRange,
  aggregate,
}: TourCardProps) {
  const cover = pickCardImage(destination);
  const locale = useLocale();
  const t = useTranslations("destinations");
  // Locale-aware country label: assigned country doc → localized name;
  // unassigned domestic doc → Vietnam fallback; unassigned international → legacy region.
  const countryLabel =
    destination.country?.[locale as "vi" | "en"] ??
    (destination.category === "domestic" ? t("vietnam") : destination.region);
  // Bilingual tour fields with vi fallback (legacy plain strings pass through).
  const tourName = resolveLocaleString(destination.name, locale) ?? "";
  // EN renders the explicit descriptionEn; empty/missing → base description.
  const tourDescription = resolveLocalizedField(
    destination.description ?? null,
    destination.descriptionEn,
    locale
  );

  return (
    <div
      data-slot="card"
      data-size="default"
      className="group relative flex cursor-pointer flex-col gap-5 rounded-none border-none bg-transparent p-0 text-sm text-card-foreground shadow-none"
    >
      {/* Full-card stretched hit area: clicking anywhere on the card
          (image, whitespace, text) routes to the detail page. */}
      <Link
        href={`/explore/destinations/${destination.slug.current}`}
        aria-label={tourName}
        className="absolute inset-0 z-10 cursor-pointer"
      />
      {cover?.asset?.url && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-none bg-[#1c1414]">
          <Image
            src={cover.asset.url}
            alt={cover.alt || tourName}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="rounded-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-none border border-white/10"
          />
        </div>
      )}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-link" />
          <span data-testid="tour-card-country" className="capitalize">
            {countryLabel}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-display text-3xl font-normal uppercase leading-[1.02] tracking-tight text-heading sm:text-[2rem]">
            {tourName}
          </h3>
          <TourRatingBadge
            slug={destination.slug.current}
            initialAggregate={aggregate}
          />
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-body">
          {tourDescription}
        </p>
        <PriceRangeRow priceRange={priceRange} className="mt-5" />
        {/* Visual action button (non-interactive — the card overlay link above
            handles routing). Kept as a span for the full-card click contract. */}
        <span className="mt-6 inline-flex items-center justify-center rounded-none bg-primary px-6 py-3 font-condensed text-sm font-medium uppercase tracking-[0.22em] text-primary-foreground transition-colors group-hover:bg-primary/90">
          {actionLabel}
        </span>
      </div>
    </div>
  );
}
