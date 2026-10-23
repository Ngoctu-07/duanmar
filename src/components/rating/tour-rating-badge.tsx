"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  formatRating,
  REVIEWS_CHANGED_EVENT,
  REVIEWS_STORAGE_KEY,
} from "@/lib/reviews";
import { fetchRatingAggregates } from "@/lib/reviews-api";

type Aggregate = { avg: number; count: number };

interface TourRatingBadgeProps {
  /** Destination slug; when absent the badge renders nothing (non-tour surfaces). */
  slug?: string;
  /**
   * Server-computed aggregate: RSC surfaces (detail/map/destinations list)
   * render it synchronously (no slot flash); omit (`undefined`) to let the
   * badge fetch `/api/ratings` after hydration; `null` = server saw 0 reviews.
   */
  initialAggregate?: Aggregate | null;
}

interface BadgeView {
  slug: string | undefined;
  source: Aggregate | null | undefined;
  loaded: boolean;
  avg: number | null;
  count: number;
}

function toView(
  slug: string | undefined,
  initialAggregate: Aggregate | null | undefined
): BadgeView {
  return {
    slug,
    source: initialAggregate,
    loaded: initialAggregate !== undefined,
    avg: initialAggregate?.avg ?? null,
    count: initialAggregate?.count ?? 0,
  };
}

/**
 * Derived star-rating badge ("4.0 ★"). Hydrates from `initialAggregate` when
 * the RSC page provides one (renders immediately, refetches only on change
 * events); otherwise keeps the SSR-safe slot and fetches after mount. Never
 * reads localStorage — `vn-reviews:changed` (same tab) and `storage`
 * (cross-tab, pre-migration only) both trigger an API refetch.
 */
export function TourRatingBadge({ slug, initialAggregate }: TourRatingBadgeProps) {
  const t = useTranslations("destinations");
  const [view, setView] = useState(() => toView(slug, initialAggregate));
  // Soft navigation can hand the mounted badge a new slug/aggregate — realign
  // during render (React's documented props-adjust-state pattern).
  if (view.slug !== slug || view.source !== initialAggregate) {
    setView(toView(slug, initialAggregate));
  }
  const hydrated = initialAggregate !== undefined;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const found = (await fetchRatingAggregates([slug]))[slug];
        if (cancelled) return;
        setView((previous) => ({
          ...previous,
          loaded: true,
          avg: found?.avg ?? null,
          count: found?.count ?? 0,
        }));
      } catch {
        // 503/network — keep the last known render (initial props or slot)
      }
    };
    if (!hydrated) void refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === REVIEWS_STORAGE_KEY || event.key === null) void refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(REVIEWS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(REVIEWS_CHANGED_EVENT, refresh);
    };
  }, [slug, hydrated]);

  if (!slug) return null;
  if (!view.loaded) {
    return (
      <span
        data-testid="tour-rating-badge-slot"
        className="inline-block h-6 min-w-[4.5rem]"
        aria-hidden
      />
    );
  }
  if (view.avg === null) return null;

  return (
    <span
      data-testid="tour-rating-badge"
      aria-label={t("ratingAria", { avg: formatRating(view.avg), count: view.count })}
      className="inline-flex shrink-0 items-center gap-1 rounded-none bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-link tabular-nums"
    >
      {formatRating(view.avg)}
      <Star className="h-3 w-3 fill-current" aria-hidden />
    </span>
  );
}
