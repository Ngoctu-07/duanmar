import type { PriceRangeLabel } from "@/lib/pricing";

interface PriceRangeRowProps {
  priceRange?: PriceRangeLabel | null;
  className?: string;
}

/**
 * One-line reference price for listing cards. Renders nothing when the tour has
 * no pricing data, so cards without a doc look exactly as they did before.
 */
export function PriceRangeRow({ priceRange, className }: PriceRangeRowProps) {
  if (!priceRange?.text) return null;

  return (
    <p
      className={`flex items-baseline justify-between gap-3 text-xs ${className ?? ""}`}
    >
      <span className="text-muted-foreground">{priceRange.label}</span>
      <span className="font-semibold tabular-nums text-primary">
        {priceRange.text}
      </span>
    </p>
  );
}
