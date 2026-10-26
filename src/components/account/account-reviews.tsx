"use client";

import { useTranslations } from "next-intl";
import { ReviewCard } from "@/components/reviews/review-card";
import type { TourReview } from "@/lib/reviews";

interface AccountReviewsProps {
  locale: string;
  reviews: TourReview[];
  onDeleted: (reference: string) => void;
}

/**
 * Account history tab: every review posted by the signed-in user. Delete
 * visibility is enforced per card by `currentUser.id === review.authorId`;
 * successful deletion is applied by the dashboard state owner so it survives
 * tab switches until the revalidated server payload arrives.
 */
export function AccountReviews({ locale, reviews, onDeleted }: AccountReviewsProps) {
  const t = useTranslations("account");
  const tReviews = useTranslations("destinations");

  if (reviews.length === 0) {
    return (
      <div className="rounded-none border border-dashed p-8 text-center text-muted-foreground">
        {t("reviewsEmpty")}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-sm font-semibold">{t("reviewsTitle")}</p>
      <p className="mb-5 text-sm text-muted-foreground">
        {t("reviewsSubtitle")}
      </p>
      <p className="mb-5 text-sm text-muted-foreground">
        {tReviews("reviews.count", { count: reviews.length })}
      </p>
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.reference}
            review={review}
            locale={locale}
            owned={false}
            onDeleted={() => onDeleted(review.reference)}
          />
        ))}
      </div>
    </div>
  );
}
