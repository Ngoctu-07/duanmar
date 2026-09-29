"use client";

import { useEffect, useRef, useState } from "react";
import { EllipsisVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteReview, type TourReview } from "@/lib/reviews";
import { fetchServerNow, isEditWindowExpired } from "@/lib/edit-window";

interface ReviewActionsMenuProps {
  review: TourReview;
}

/**
 * Owner-only kebab menu on a review card: Edit (scrolls/focuses the write
 * form; native `disabled` once the 3h window vs SERVER time is closed) and
 * Delete (confirm → `deleteReview` → existing change event refreshes badge,
 * list and count everywhere). Bespoke dropdown (no Base UI Menu): its items
 * strip native `disabled`, which the edit gate requires. Client-side
 * ownership affordance only — not authorization.
 */
export function ReviewActionsMenu({ review }: ReviewActionsMenuProps) {
  const t = useTranslations("destinations");
  const [open, setOpen] = useState(false);
  const [editExpired, setEditExpired] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const evaluate = async () => {
    const now = await fetchServerNow();
    // No server time → fail closed (Edit stays disabled).
    setEditExpired(now === null ? true : isEditWindowExpired(review.createdAt, now));
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void evaluate();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onEdit = () => {
    setOpen(false);
    const form = document.querySelector('[data-testid="write-review-form"]');
    form?.scrollIntoView({ behavior: "smooth", block: "center" });
    form?.querySelector("textarea")?.focus();
  };

  const onDelete = () => {
    if (!window.confirm(t("reviews.deleteConfirm"))) return;
    deleteReview(review.reference);
    setOpen(false);
  };

  const itemClass =
    "flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:opacity-50";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        data-testid="review-actions-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("reviews.menuLabel")}
        onClick={toggle}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <EllipsisVertical className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          data-testid="review-actions-menu"
          className="absolute right-0 top-full z-10 mt-1 min-w-32 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            data-testid="review-actions-edit"
            disabled={editExpired}
            onClick={onEdit}
            className={itemClass}
          >
            {t("reviews.menuEdit")}
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="review-actions-delete"
            onClick={onDelete}
            className={itemClass}
          >
            {t("reviews.menuDelete")}
          </button>
        </div>
      )}
    </div>
  );
}
