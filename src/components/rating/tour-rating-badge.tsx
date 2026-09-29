"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  formatRating,
  getAggregate,
  listReviews,
  REVIEWS_CHANGED_EVENT,
  REVIEWS_STORAGE_KEY,
} from "@/lib/reviews";

interface TourRatingBadgeProps {
  /** Destination slug; when absent the badge renders nothing (non-tour surfaces). */
  slug?: string;
}

/**
 * Derived star-rating badge ("4.0 ★") for a tour. Reads device-local reviews
 * after hydration (SSR-safe slot), re-reads on cross-tab storage changes, and
 * renders nothing at 0 reviews.
 */
export function TourRatingBadge({ slug }: TourRatingBadgeProps) {
  const t = useTranslations("destinations");
  const [loaded, setLoaded] = useState(false);
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const refresh = () => {
      const aggregate = getAggregate(listReviews(), slug);
      setAvg(aggregate?.avg ?? null);
      setCount(aggregate?.count ?? 0);
      setLoaded(true);
    };
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === REVIEWS_STORAGE_KEY || event.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(REVIEWS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(REVIEWS_CHANGED_EVENT, refresh);
    };
  }, [slug]);

  if (!slug) return null;
  if (!loaded) {
    return (
      <span
        data-testid="tour-rating-badge-slot"
        className="inline-block h-6 min-w-[4.5rem]"
        aria-hidden
      />
    );
  }
  if (avg === null) return null;

  return (
    <span
      data-testid="tour-rating-badge"
      aria-label={t("ratingAria", { avg: formatRating(avg), count })}
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary tabular-nums"
    >
      {formatRating(avg)}
      <Star className="h-3 w-3 fill-current" aria-hidden />
    </span>
  );
}
