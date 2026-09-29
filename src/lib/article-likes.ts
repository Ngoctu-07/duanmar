/**
 * Per-browser "liked articles" persistence (plan 260929-2254).
 * One like per browser per article — `markArticleLiked` is append-only
 * (no un-like, no duplicate votes). Reviews-style changed event for
 * cross-component refresh; the `storage` event covers cross-tab.
 */
export const LIKED_ARTICLES_STORAGE_KEY = "vn-liked-articles:v1";
export const LIKED_ARTICLES_CHANGED_EVENT = "vn-liked-articles:changed";

const hasWindow = (): boolean => typeof window !== "undefined";

/** Tolerant read: corrupted JSON / private mode → []. */
export function getLikedArticleSlugs(): string[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(LIKED_ARTICLES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

export function isArticleLiked(slug: string): boolean {
  return getLikedArticleSlugs().includes(slug);
}

/** First like persists + fires the changed event. Returns false if already liked. */
export function markArticleLiked(slug: string): boolean {
  if (!hasWindow()) return false;
  if (isArticleLiked(slug)) return false;
  try {
    const next = [...getLikedArticleSlugs(), slug];
    window.localStorage.setItem(LIKED_ARTICLES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(LIKED_ARTICLES_CHANGED_EVENT));
    return true;
  } catch {
    // Storage unavailable — still treat as liked for this session's UI.
    return true;
  }
}
