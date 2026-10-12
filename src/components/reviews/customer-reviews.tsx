"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ReviewCard } from "@/components/reviews/review-card";
import { WriteReviewForm } from "@/components/reviews/write-review-form";
import {
  isMyReview,
  REVIEWS_CHANGED_EVENT,
  REVIEWS_STORAGE_KEY,
  type TourReview,
} from "@/lib/reviews";
import { fetchReviews, migrateLegacyReviews } from "@/lib/reviews-api";
import { BOOKINGS_STORAGE_KEY } from "@/lib/booking-history";

interface CustomerReviewsProps {
  tourSlug: string;
  locale: string;
  /** Server-computed rows (RSC detail page) — renders list + count without a flash. */
  initialReviews?: TourReview[];
}

/**
 * "Customer Reviews" section for the tour detail page. State owner: hydrates
 * from RSC props when present, refetches `GET /api/reviews` after mount and on
 * every `vn-reviews:changed`/cross-tab storage change, and kicks off the
 * one-shot `vn-reviews:v1` → SQLite migration on mount (never blocks paint).
 * Ownership = server `owned` (visitor cookie) AND device booking.
 */
export function CustomerReviews({ tourSlug, locale, initialReviews }: CustomerReviewsProps) {
  const t = useTranslations("destinations");
  const [reviews, setReviews] = useState<TourReview[]>(initialReviews ?? []);
  const [ownedReferences, setOwnedReferences] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(initialReviews !== undefined);
  const requestSeq = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const rows = (await fetchReviews(tourSlug)).reviews;
      if (seq !== requestSeq.current) return;
      setReviews(rows);
      // Server ownership (visitor cookie) gated on device bookings — drives the
      // per-card actions menu; recomputed on every reviews/bookings change.
      setOwnedReferences(
        new Set(
          rows.filter((row) => row.owned && isMyReview(row)).map((row) => row.bookingReference)
        )
      );
      setLoaded(true);
    } catch {
      // 503/network — keep the last known list; the next event retries
    }
  }, [tourSlug]);

  useEffect(() => {
    void migrateLegacyReviews();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first refresh awaits /api/reviews, nothing is written synchronously here
    void refresh();
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === REVIEWS_STORAGE_KEY ||
        event.key === BOOKINGS_STORAGE_KEY ||
        event.key === null
      ) {
        void refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(REVIEWS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(REVIEWS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return (
    <section
      id="customer-reviews"
      aria-labelledby="customer-reviews-title"
      className="mt-12"
    >
      <h2 id="customer-reviews-title" className="mb-1 text-2xl font-bold">
        {t("reviews.title")}
      </h2>
      {loaded && reviews.length > 0 && (
        <p className="mb-5 text-sm text-muted-foreground">
          {t("reviews.count", { count: reviews.length })}
        </p>
      )}

      <WriteReviewForm
        tourSlug={tourSlug}
        locale={locale}
        reviews={reviews}
        onSaved={refresh}
      />

      {!loaded || reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          {t("reviews.empty")}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.reference}
              review={review}
              locale={locale}
              owned={ownedReferences.has(review.bookingReference)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
