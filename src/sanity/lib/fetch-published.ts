import type { QueryParams } from "@sanity/client";
import { unstable_cache } from "next/cache";

import { client } from "./client";

/** Extra entity tags are appended to this global tag (invalidated by /api/revalidate). */
export const SANITY_TAG = "sanity";

export type FetchPublishedOptions = {
  /** Entity tags, e.g. `sanity:destination:hcm`. All fetches also carry the global tag. */
  tags?: string[];
};

/** Cache key for a query+params pair (collision-safe across distinct inputs). */
export function sanityCacheKey(query: string, params: QueryParams = {}): string[] {
  return ["fetchPublished", query, JSON.stringify(params)];
}

/** Tag list for a fetch: global tag + deduped entity tags. */
export function sanityTags(extra: string[] = []): string[] {
  return [...new Set([SANITY_TAG, ...extra])];
}

/**
 * Published-only, stega-off fetch with tag-based caching. A failed request
 * resolves to `null` so a broken/absent query degrades to "no data" instead of
 * failing the page. Cache entries are invalidated via `revalidateTag("sanity")`
 * (see /api/revalidate) and expire on their own after 300 s if the webhook misses.
 */
export async function fetchPublished<G extends string>(
  query: G,
  params: QueryParams = {},
  options: FetchPublishedOptions = {}
) {
  // Fail-open catch lives OUTSIDE the cache: failed reads must not be cached.
  const read = () =>
    client.fetch(query, params, { perspective: "published", stega: false });

  return unstable_cache(read, sanityCacheKey(query, params), {
    tags: sanityTags(options.tags),
    // Data-level safety net: entries expire ≤5 min even if the webhook misses,
    // independent of route-level ISR (most CMS routes render dynamically).
    revalidate: 300,
  })().catch(() => null);
}
