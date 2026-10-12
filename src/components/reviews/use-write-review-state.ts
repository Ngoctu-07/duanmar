"use client";

import { useEffect, useState } from "react";
import {
  BOOKINGS_STORAGE_KEY,
  listBookings,
  type TripBooking,
} from "@/lib/booking-history";
import type { TourReview } from "@/lib/reviews";

/**
 * Booking/existing-review lookup for the write-review form. The booking still
 * comes from device storage (re-read after mount and on cross-tab booking
 * changes); the existing review comes from the API-backed list the parent
 * (`CustomerReviews`) passes down, so `applyPrefill` always sees server truth:
 * create path gets `null` (clears stale fields instead of silently
 * recreating a deleted review), edit path gets the saved review.
 */
export function useWriteReviewState(
  tourSlug: string,
  reviews: TourReview[],
  applyPrefill: (review: TourReview | null) => void
): { booking: TripBooking | null; existing: TourReview | null; loaded: boolean } {
  const [booking, setBooking] = useState<TripBooking | null>(null);
  const [existing, setExisting] = useState<TourReview | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const match = listBookings().find((entry) => entry.slug === tourSlug) ?? null;
      const found = match
        ? reviews.find(
            (entry) => entry.reference === `${match.reference}:${tourSlug}`
          ) ?? null
        : null;
      setBooking(match);
      setExisting(found);
      applyPrefill(found);
      setLoaded(true);
    };
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === BOOKINGS_STORAGE_KEY || event.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [tourSlug, reviews, applyPrefill]);

  return { booking, existing, loaded };
}
