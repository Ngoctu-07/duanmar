"use client";

import { useEffect, useState } from "react";
import { fetchServerNow, isEditWindowExpired } from "@/lib/edit-window";
import type { TourReview } from "@/lib/reviews";

/**
 * 3h edit-window verdict for the prefilled form, gated on SERVER time so a
 * lying device clock cannot reopen a closed window (same predicate as the
 * card menu Edit item). Keyed by `reference:createdAt` so a stale verdict is
 * never reused; defaults to enabled until the verdict arrives (no
 * flash-disabled), fails CLOSED when `/api/server-time` is unreachable, and
 * returns `false` with zero state writes when there is no existing review —
 * the form re-enables instantly after a delete. UX affordance only: review
 * data is device-local, this is not authorization.
 */
export function useEditWindowGate(existing: TourReview | null): boolean {
  const [verdict, setVerdict] = useState<{ key: string; expired: boolean } | null>(null);

  useEffect(() => {
    if (!existing) return;
    const key = `${existing.reference}:${existing.createdAt}`;
    let cancelled = false;
    fetchServerNow().then((now) => {
      if (!cancelled) {
        setVerdict({
          key,
          expired: now === null || isEditWindowExpired(existing.createdAt, now),
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [existing]);

  if (!existing) return false;
  const key = `${existing.reference}:${existing.createdAt}`;
  return verdict?.key === key && verdict.expired;
}
