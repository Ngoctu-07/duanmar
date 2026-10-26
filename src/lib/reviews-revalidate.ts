import { revalidatePath } from "next/cache";

/**
 * Invalidate every server-rendered surface that shows a tour rating or review
 * list for both site locales. Actual paths (not dynamic patterns) keep the
 * invalidation reliable through the i18n rewrite; client components also
 * refetch via `vn-reviews:changed` for an immediate same-page update.
 */
const LOCALES = ["vi", "en"] as const;

const BASE_PATHS = [
  "",
  "/explore",
  "/explore/destinations",
  "/tours",
  "/search",
  "/account",
  "/my-trips",
] as const;

export function revalidateReviewSurfaces(tourSlug?: string): void {
  for (const locale of LOCALES) {
    for (const path of BASE_PATHS) {
      revalidatePath(`/${locale}${path}`, "page");
    }
    if (tourSlug) {
      revalidatePath(
        `/${locale}/explore/destinations/${encodeURIComponent(tourSlug)}`,
        "page"
      );
    }
  }
}
