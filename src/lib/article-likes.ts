/**
 * Client side of the global like system (plan 261007-2145): one POST
 * toggle helper for HeartButton plus cleanup of the retired device-local
 * vote list (`vn-liked-articles:v1` — dropped, not migrated; the server
 * SQLite store is the source of truth).
 */
export const LIKED_ARTICLES_STORAGE_KEY = "vn-liked-articles:v1";

export interface LikeToggleResult {
  slug: string;
  count: number;
  isLiked: boolean;
}

/** POST the visitor's toggle; throws on non-2xx or malformed payload. */
export async function postLikeToggle(slug: string): Promise<LikeToggleResult> {
  const response = await fetch(
    `/api/articles/${encodeURIComponent(slug)}/like`,
    { method: "POST" }
  );
  if (!response.ok) throw new Error(`like failed: ${response.status}`);
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") throw new Error("like failed: bad payload");
  const { count, isLiked } = data as { count?: unknown; isLiked?: unknown };
  if (typeof count !== "number" || typeof isLiked !== "boolean") {
    throw new Error("like failed: bad payload");
  }
  return { slug, count, isLiked };
}

/** Drop the legacy per-browser vote list; private mode / SSR → no-op. */
export function clearLegacyLikedArticles(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LIKED_ARTICLES_STORAGE_KEY);
  } catch {
    // storage unavailable (private mode) — nothing to clear
  }
}
