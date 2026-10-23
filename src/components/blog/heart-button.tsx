"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { clearLegacyLikedArticles, postLikeToggle } from "@/lib/article-likes";

interface HeartButtonProps {
  slug: string;
  initialCount: number;
  /** Visitor-scoped vote state hydrated by the RSC blog pages. */
  initialLiked?: boolean;
}

/**
 * Social-style reaction toggle (plan 261007-2145): like ↔ unlike against
 * the shared server count. Optimistic flip first, then reconcile with the
 * authoritative `{count,isLiked}` — any failure reverts both fields to the
 * pre-click state. Locked while a toggle is in flight so a double click
 * cannot double-count. Retires the device-local vote list on mount.
 */
export function HeartButton({
  slug,
  initialCount,
  initialLiked = false,
}: HeartButtonProps) {
  const t = useTranslations("blog");
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    clearLegacyLikedArticles();
  }, []);

  const handleClick = () => {
    if (pending) return;
    const previous = { count, liked };
    setLiked(!previous.liked);
    setCount(Math.max(0, previous.count + (previous.liked ? -1 : 1)));
    setPending(true);
    postLikeToggle(slug)
      .then((result) => {
        setCount(result.count);
        setLiked(result.isLiked);
      })
      .catch(() => {
        setCount(previous.count);
        setLiked(previous.liked);
      })
      .finally(() => setPending(false));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={t(liked ? "liked" : "like")}
      data-testid="like-button"
      className="inline-flex items-center gap-2 rounded-none border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-link hover:text-link disabled:cursor-wait"
    >
      <Heart
        aria-hidden="true"
        className={`h-5 w-5 ${liked ? "text-link fill-current" : ""}`}
      />
      <span aria-live="polite" className="tabular-nums font-medium">
        {count}
      </span>
    </button>
  );
}
