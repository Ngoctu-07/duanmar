"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ReviewCard } from "@/components/reviews/review-card";
import { WriteReviewForm } from "@/components/reviews/write-review-form";
import {
  isMyReview,
  listReviews,
  REVIEWS_CHANGED_EVENT,
  REVIEWS_STORAGE_KEY,
  reviewsForSlug,
  type TourReview,
} from "@/lib/reviews";
import { BOOKINGS_STORAGE_KEY } from "@/lib/booking-history";

interface CustomerReviewsProps {
  tourSlug: string;
  locale: string;
}

/**
 * "Customer Reviews" section for the tour detail page. State owner: loads
 * device-local reviews after hydration, re-reads on cross-tab storage changes,
 * and refreshes when the write-review form saves.
 */
export function CustomerReviews({ tourSlug, locale }: CustomerReviewsProps) {
  const t = useTranslations("destinations");
  const [reviews, setReviews] = useState<TourReview[]>([]);
  const [ownedReferences, setOwnedReferences] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    const all = listReviews();
    setReviews(reviewsForSlug(all, tourSlug));
    // Device-local ownership (booking refs held on this device) — drives the
    // per-card actions menu; recomputed on every reviews/bookings change.
    setOwnedReferences(
      new Set(all.filter(isMyReview).map((review) => review.bookingReference))
    );
    setLoaded(true);
  }, [tourSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage read must run after mount
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === REVIEWS_STORAGE_KEY ||
        event.key === BOOKINGS_STORAGE_KEY ||
        event.key === null
      )
        refresh();
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

      <WriteReviewForm tourSlug={tourSlug} locale={locale} onSaved={refresh} />

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
