import { MapPin } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { PriceRangeRow } from "@/components/pricing/price-range";
import type { PriceRangeLabel } from "@/lib/pricing";
import { Link } from "@/i18n/navigation";

export interface Destination {
  _id: string;
  name: string;
  slug: { current: string };
  region: string;
  description?: string;
  image?: { asset?: { url: string }; alt?: string };
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
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {destination.image?.asset?.url && (
        <div className="aspect-video relative">
          <Image
            src={destination.image.asset.url}
            alt={destination.image.alt || destination.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
          <MapPin className="h-4 w-4" />
          <span className="capitalize">{destination.region}</span>
        </div>
        <h3 className="text-xl font-semibold mb-2">{destination.name}</h3>
        <p className="text-muted-foreground line-clamp-2 mb-4">
          {destination.description}
        </p>
        <PriceRangeRow priceRange={priceRange} className="mb-4" />
        <Link
          href={`/explore/destinations/${destination.slug.current}`}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {actionLabel}
        </Link>
      </CardContent>
    </Card>
  );
}
