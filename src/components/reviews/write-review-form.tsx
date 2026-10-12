"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReviewAvatar } from "@/components/reviews/review-avatar";
import { ReviewImageInput } from "@/components/reviews/review-image-input";
import { useEditWindowGate } from "@/components/reviews/use-edit-window-gate";
import { useWriteReviewState } from "@/components/reviews/use-write-review-state";
import { ReviewApiError, saveReviewApi } from "@/lib/reviews-api";
import type { TourReview } from "@/lib/reviews";

interface WriteReviewFormProps {
  tourSlug: string;
  locale: string;
  /** API-backed review list from the parent — drives prefill/edit gating. */
  reviews: TourReview[];
  onSaved: () => void;
}

/**
 * Booking-gated review form: enabled only when this device holds a booking for
 * the tour (disabled + hint before that, no hint pre-hydration). One review per
 * booking per tour — an existing one is pre-filled and re-submitted as an edit.
 * Submit goes to `POST /api/reviews`; 409 surfaces the edit-window copy, any
 * other failure shows the generic save error (list/badge keep prior state).
 */
export function WriteReviewForm({
  tourSlug,
  reviews,
  onSaved,
}: WriteReviewFormProps) {
  const t = useTranslations("destinations");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable per-mount callback: prefill when an existing review matches,
  // clear fields on the create path (or right after a delete) so a submit
  // cannot silently recreate the removed review.
  const applyPrefill = useCallback((review: TourReview | null) => {
    setRating(review ? review.rating : 0);
    setComment(review ? review.comment : "");
    setImages(review ? review.images : []);
  }, []);
  const { booking, existing, loaded } = useWriteReviewState(
    tourSlug,
    reviews,
    applyPrefill
  );

  const enabled = loaded && booking !== null;
  const editExpired = useEditWindowGate(existing);
  const formEnabled = enabled && !editExpired;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!booking || submitting) return;
    if (!rating || !comment.trim()) {
      setError(t("reviews.errorRequired"));
      return;
    }
    const review: TourReview = {
      reference: `${booking.reference}:${tourSlug}`,
      tourSlug,
      authorName: booking.fullName,
      authorEmail: booking.email,
      rating,
      comment: comment.trim(),
      images,
      createdAt: new Date().toISOString(),
      bookingReference: booking.reference,
    };
    setSubmitting(true);
    try {
      await saveReviewApi(review);
      setError(null);
      setSaved(true);
      setRating(0);
      setComment("");
      setImages([]);
      onSaved();
    } catch (failure) {
      setSaved(false);
      const closed =
        failure instanceof ReviewApiError && failure.status === 409;
      setError(closed ? t("reviews.editWindowClosed") : t("reviews.errorSave"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="write-review-form"
      aria-disabled={!formEnabled}
      className={`mb-6 rounded-xl border bg-card p-4 sm:p-5 ${
        !formEnabled ? "pointer-events-none opacity-60 grayscale" : ""
      }`}
    >
      <form onSubmit={onSubmit}>
      <h3 className="text-lg font-semibold">{t("reviews.writeReview")}</h3>

      {enabled && booking && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <ReviewAvatar name={booking.fullName} size="sm" />
          <span className="truncate">{booking.fullName}</span>
        </div>
      )}
      {loaded && !booking && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("reviews.writeReviewHint")}
        </p>
      )}
      {editExpired && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("reviews.editWindowClosed")}
        </p>
      )}

      <p className="mt-4 text-sm font-medium">{t("reviews.ratingLabel")}</p>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!formEnabled}
            aria-pressed={rating === star}
            aria-label={`${t("reviews.ratingLabel")} ${star}`}
            onClick={() => {
              setRating(star);
              setSaved(false);
              setError(null);
            }}
            className="rounded p-1 transition-colors hover:text-link"
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating ? "fill-current text-link" : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={comment}
        disabled={!formEnabled}
        onChange={(event) => {
          setComment(event.target.value);
          setSaved(false);
          setError(null);
        }}
        rows={4}
        placeholder={t("reviews.commentPlaceholder")}
        className="mt-3"
      />

      <ReviewImageInput value={images} disabled={!formEnabled} onChange={setImages} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={!formEnabled || submitting || !rating || !comment.trim()}
        >
          {submitting ? t("reviews.submitting") : t("reviews.submit")}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && saved && (
          <p className="text-sm text-link">{t("reviews.submitSuccess")}</p>
        )}
      </div>
      </form>
    </div>
  );
}
