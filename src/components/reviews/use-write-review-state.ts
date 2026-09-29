"use client";

import { useEffect, useState } from "react";
import {
  BOOKINGS_STORAGE_KEY,
  listBookings,
  type TripBooking,
} from "@/lib/booking-history";
import {
  listReviews,
  REVIEWS_CHANGED_EVENT,
  REVIEWS_STORAGE_KEY,
  type TourReview,
} from "@/lib/reviews";

/**
 * Device-local booking/existing-review lookup for the write-review form.
 * Re-reads after mount, on cross-tab storage changes (bookings AND reviews)
 * and on the reviews change event; every re-read hands the latest matching
 * review to `applyPrefill` (create path passes `null` so the form clears stale
 * fields instead of silently recreating a deleted review).
 */
export function useWriteReviewState(
  tourSlug: string,
  applyPrefill: (review: TourReview | null) => void
): { booking: TripBooking | null; existing: TourReview | null; loaded: boolean } {
  const [booking, setBooking] = useState<TripBooking | null>(null);
  const [existing, setExisting] = useState<TourReview | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const match = listBookings().find((entry) => entry.slug === tourSlug) ?? null;
      const found = match
        ? listReviews().find(
            (entry) => entry.reference === `${match.reference}:${tourSlug}`
          )
        : null;
      setBooking(match);
      setExisting(found ?? null);
      applyPrefill(found ?? null);
      setLoaded(true);
    };
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === BOOKINGS_STORAGE_KEY ||
        event.key === REVIEWS_STORAGE_KEY ||
        event.key === null
      ) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(REVIEWS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(REVIEWS_CHANGED_EVENT, refresh);
    };
  }, [tourSlug, applyPrefill]);

  return { booking, existing, loaded };
}
