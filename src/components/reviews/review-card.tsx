"use client";

import { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthGate } from "@/components/auth/auth-provider";
import { ReviewAvatar } from "@/components/reviews/review-avatar";
import { ReviewActionsMenu } from "@/components/reviews/review-actions-menu";
import { ReviewDeleteButton } from "@/components/reviews/review-delete-button";
import { ReviewImageLightbox } from "@/components/reviews/review-image-lightbox";
import { formatRating, type TourReview } from "@/lib/reviews";

interface ReviewCardProps {
  review: TourReview;
  locale: string;
  owned: boolean;
  onDeleted?: () => void;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/** One review: avatar + author + date, star row, comment, up to 3 photos (click = lightbox). */
export function ReviewCard({ review, locale, owned, onDeleted }: ReviewCardProps) {
  const t = useTranslations("destinations");
  const { user } = useAuthGate();
  const [activeImage, setActiveImage] = useState<string | null>(null);
  // Strict client-side ownership: only the signed-in author can see Delete.
  const canDelete = Boolean(
    user?.id && review.authorId && user.id === review.authorId
  );

  return (
    <>
      <article
        data-testid="review-card"
        className="rounded-none border bg-card p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <ReviewAvatar name={review.authorName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {review.authorName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(review.createdAt, locale)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {owned && <ReviewActionsMenu review={review} />}
            {canDelete && (
              <ReviewDeleteButton reference={review.reference} onDeleted={onDeleted} />
            )}
          </div>
        </div>

        <div
          className="mt-3 flex items-center gap-0.5"
          aria-label={t("reviews.ratingAria", {
            avg: formatRating(review.rating),
            count: 1,
          })}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              aria-hidden
              className={`h-4 w-4 ${
                star <= review.rating
                  ? "fill-current text-link"
                  : "text-muted-foreground/40"
              }`}
            />
          ))}
        </div>

        <p className="mt-3 whitespace-pre-line break-words text-sm text-muted-foreground">
          {review.comment}
        </p>

        {review.images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {review.images.slice(0, 3).map((image, index) => (
              <button
                key={index}
                type="button"
                data-testid="review-image-thumb"
                aria-label={`${index + 1}/${review.images.length} ${t("reviews.lightboxImageAlt", {
                  author: review.authorName,
                })}`}
                onClick={() => setActiveImage(image)}
                className="rounded-none focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Image
                  src={image}
                  alt={review.authorName}
                  width={112}
                  height={112}
                  loading="lazy"
                  className="h-24 w-24 rounded-none object-cover sm:h-28 sm:w-28"
                />
              </button>
            ))}
          </div>
        )}
      </article>

      <ReviewImageLightbox
        src={activeImage}
        author={review.authorName}
        onClose={() => setActiveImage(null)}
      />
    </>
  );
}
