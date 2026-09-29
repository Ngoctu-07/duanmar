"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  LIKED_ARTICLES_CHANGED_EVENT,
  isArticleLiked,
  markArticleLiked,
} from "@/lib/article-likes";

interface HeartButtonProps {
  slug: string;
  initialCount: number;
}

function subscribeToLiked(onChange: () => void) {
  const refresh = () => onChange();
  window.addEventListener(LIKED_ARTICLES_CHANGED_EVENT, refresh);
  window.addEventListener("storage", refresh);
  return () => {
    window.removeEventListener(LIKED_ARTICLES_CHANGED_EVENT, refresh);
    window.removeEventListener("storage", refresh);
  };
}

/**
 * Social-style reaction button (plan 260929-2254): 1 like per browser
 * (localStorage), optimistic +1 with POST reconcile, persistent red fill.
 * Re-clicking a liked article is a no-op (no duplicate votes).
 * Liked state reads via useSyncExternalStore (SSR-safe, no effect setState).
 */
export function HeartButton({ slug, initialCount }: HeartButtonProps) {
  const t = useTranslations("blog");
  const [count, setCount] = useState(initialCount);

  const subscribe = useCallback(
    (onChange: () => void) => subscribeToLiked(onChange),
    []
  );
  const getSnapshot = useCallback(() => isArticleLiked(slug), [slug]);
  const getServerSnapshot = useCallback(() => false, []);
  const liked = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleClick = () => {
    if (liked) return; // already voted — keep red, block duplicate
    if (!markArticleLiked(slug)) return;
    setCount((current) => current + 1); // optimistic
    void fetch(`/api/articles/${encodeURIComponent(slug)}/like`, {
      method: "POST",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { count?: number } | null) => {
        if (data && typeof data.count === "number") setCount(data.count);
      })
      .catch(() => undefined); // keep optimistic count on failure
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={t(liked ? "liked" : "like")}
      data-testid="like-button"
      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-red-300 hover:text-red-500"
    >
      <Heart
        aria-hidden="true"
        className={`h-5 w-5 ${liked ? "text-red-500 fill-current" : ""}`}
      />
      <span aria-live="polite" className="tabular-nums font-medium">
        {count}
      </span>
    </button>
  );
}
