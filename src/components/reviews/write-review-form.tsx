"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthGate } from "@/components/auth/auth-provider";
import { ReviewAvatar } from "@/components/reviews/review-avatar";
import { ReviewImageInput } from "@/components/reviews/review-image-input";
import { useEditWindowGate } from "@/components/reviews/use-edit-window-gate";
import { useWriteReviewState } from "@/components/reviews/use-write-review-state";
import { ReviewApiError, saveReviewApi } from "@/lib/reviews-api";
import { REVIEW_EDIT_EVENT, type ReviewSubmission, type TourReview } from "@/lib/reviews";

interface WriteReviewFormProps {
  tourSlug: string;
  locale: string;
  /** API-backed review list from the parent — drives prefill/edit gating. */
  reviews: TourReview[];
  onSaved: () => void | Promise<void>;
}

/**
 * Booking-gated review form: enabled only when this device holds a booking for
 * the tour (disabled + hint before that, no hint pre-hydration). One review per
 * booking per tour — once it exists the form is hidden (only the thank-you
 * line right after submitting); the card menu's Edit reopens it pre-filled.
 * Submit goes to `POST /api/reviews`; 409 surfaces the edit-window copy, any
 * other failure shows the generic save error (list/badge keep prior state).
 */
export function WriteReviewForm({
  tourSlug,
  reviews,
  onSaved,
}: WriteReviewFormProps) {
  const t = useTranslations("destinations");
  const { user: authUser } = useAuthGate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Stable per-mount callback: prefill when an existing review matches,
  // clear fields on the create path (or right after a delete) so a submit
  // cannot silently recreate the removed review.
  const applyPrefill = useCallback((review: TourReview | null) => {
    setRating(review ? review.rating : 0);
    setComment(review ? review.comment : "");
    setImages(review ? review.images : []);
    // Review gone (deleted) → back to the plain create form.
    if (!review) {
      setEditing(false);
      setSaved(false);
    }
  }, []);
  const { booking, existing, loaded } = useWriteReviewState(
    tourSlug,
    reviews,
    applyPrefill
  );

  const enabled = loaded && booking !== null;
  const editExpired = useEditWindowGate(existing);
  const formEnabled = enabled && !editExpired;
  const hidden = existing !== null && !editing;

  useEffect(() => {
    const onEdit = () => {
      setEditing(true);
      setSaved(false);
      setError(null);
    };
    window.addEventListener(REVIEW_EDIT_EVENT, onEdit);
    return () => window.removeEventListener(REVIEW_EDIT_EVENT, onEdit);
  }, []);

  useEffect(() => {
    if (!editing) return;
    const form = wrapperRef.current;
    form?.scrollIntoView({ behavior: "smooth", block: "center" });
    form?.querySelector("textarea")?.focus();
  }, [editing]);

  const onCancel = () => {
    setEditing(false);
    setError(null);
    applyPrefill(existing);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!booking || submitting) return;
    if (!rating || !comment.trim()) {
      setError(t("reviews.errorRequired"));
      return;
    }
    const review: ReviewSubmission = {
      reference: `${booking.reference}:${tourSlug}`,
      tourSlug,
      rating,
      comment: comment.trim(),
      images,
      createdAt: new Date().toISOString(),
      bookingPaidAt: booking.paidAt,
      bookingReference: booking.reference,
    };
    setSubmitting(true);
    try {
      await saveReviewApi(review);
      // Refetch first so the saved review is in the list before the form hides.
      await onSaved();
      setError(null);
      setSaved(true);
      setEditing(false);
    } catch (failure) {
      setSaved(false);
      const closed =
        failure instanceof ReviewApiError && failure.status === 409;
      setError(closed ? t("reviews.editWindowClosed") : t("reviews.errorSave"));
    } finally {
      setSubmitting(false);
    }
  };

  if (hidden) {
    return saved ? (
      <p data-testid="review-submitted" className="mb-6 text-sm text-link">
        {t("reviews.submitSuccess")}
      </p>
    ) : null;
  }

  return (
    <div
      ref={wrapperRef}
      data-testid="write-review-form"
      aria-disabled={!formEnabled}
      className={`mb-6 rounded-none border bg-card p-4 sm:p-5 ${
        !formEnabled ? "pointer-events-none opacity-60 grayscale" : ""
      }`}
    >
      <form onSubmit={onSubmit}>
      <h3 className="text-lg font-semibold">{t("reviews.writeReview")}</h3>

      {enabled && booking && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <ReviewAvatar src={authUser?.avatarUrl ?? null} size="sm" />
          <span
            data-testid="review-author-preview"
            data-author-kind={authUser ? "user" : "guest"}
            className="truncate"
          >
            {authUser?.name || booking.fullName}
          </span>
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
            className="rounded-none p-1 transition-colors hover:text-link"
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
        {editing && existing && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            {t("reviews.cancelEdit")}
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && saved && (
          <p className="text-sm text-link">{t("reviews.submitSuccess")}</p>
        )}
      </div>
      </form>
    </div>
  );
}
