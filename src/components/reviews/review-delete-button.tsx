"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteReviewApi } from "@/lib/reviews-api";

interface ReviewDeleteButtonProps {
  reference: string;
  onDeleted?: () => void;
}

/**
 * Direct owner delete affordance. Visibility is decided by `ReviewCard` from
 * `currentUser.id === review.authorId`; the server repeats the same check
 * against the session before deleting.
 */
export function ReviewDeleteButton({ reference, onDeleted }: ReviewDeleteButtonProps) {
  const t = useTranslations("destinations");
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (busy) return;
    if (!window.confirm(t("reviews.deleteConfirm"))) return;
    setBusy(true);
    try {
      await deleteReviewApi(reference);
      onDeleted?.();
    } catch {
      // Non-owner / network failure: the refetched list remains canonical.
    } finally {
      setBusy(false);
    }
  };

  const label = t("reviews.menuDelete");

  return (
    <button
      type="button"
      data-testid="review-delete"
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={onDelete}
      className="rounded-none p-1 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
