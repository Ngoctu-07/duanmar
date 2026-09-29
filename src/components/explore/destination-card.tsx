import { MapPin } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { PriceRangeRow } from "@/components/pricing/price-range";
import type { PriceRangeLabel } from "@/lib/pricing";
import { Link } from "@/i18n/navigation";
import { TourRatingBadge } from "@/components/rating/tour-rating-badge";
import { TourAttributeBadges } from "@/components/explore/tour-attribute-badges";
import { pickCoverImage } from "@/lib/destination-gallery";

export interface Destination {
  _id: string;
  name: string;
  slug: { current: string };
  region: string;
  category?: "domestic" | "international";
  country?: { vi: string; en: string; code?: string } | null;
  description?: string;
  isSpecialTour?: boolean;
  image?: { asset?: { url: string }; alt?: string };
  galleryImages?: { asset?: { url: string }; alt?: string }[];
}

interface DestinationCardProps {
  destination: Destination;
  actionLabel: string;
  priceRange?: PriceRangeLabel | null;
}

export function DestinationCard({
  destination,
  actionLabel,
  priceRange,
}: DestinationCardProps) {
  const cover = pickCoverImage(destination);
  const locale = useLocale();
  const t = useTranslations("destinations");
  // Locale-aware country label: assigned country doc → localized name;
  // unassigned domestic doc → Vietnam fallback; unassigned international → legacy region.
  const countryLabel =
    destination.country?.[locale as "vi" | "en"] ??
    (destination.category === "domestic" ? t("vietnam") : destination.region);
  return (
    <Card className="group relative overflow-hidden cursor-pointer transition-shadow hover:shadow-lg">
      {/* Full-card stretched hit area: clicking anywhere on the card
          (image, padding, whitespace, text) routes to the detail page. */}
      <Link
        href={`/explore/destinations/${destination.slug.current}`}
        aria-label={destination.name}
        className="absolute inset-0 z-10 cursor-pointer"
      />
      {cover?.asset?.url && (
        <div className="aspect-video relative">
          <Image
            src={cover.asset.url}
            alt={cover.alt || destination.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
          <MapPin className="h-4 w-4" />
          <span className="capitalize">{countryLabel}</span>
          <TourAttributeBadges
            isSpecialTour={destination.isSpecialTour}
          />
        </div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-xl font-semibold">{destination.name}</h3>
          <TourRatingBadge slug={destination.slug.current} />
        </div>
        <p className="text-muted-foreground line-clamp-2 mb-4">
          {destination.description}
        </p>
        <PriceRangeRow priceRange={priceRange} className="mb-4" />
        {/* Visual action button (now non-interactive — the card overlay link
            above handles routing); scaled ~1.5× per plan 260929-2207. */}
        <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-base font-medium transition-colors">
          {actionLabel}
        </span>
      </CardContent>
    </Card>
  );
}
