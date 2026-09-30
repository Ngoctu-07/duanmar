import type { Destination } from "@/components/explore/destination-card";
import { normalizeSearchText } from "@/lib/search-normalize";

/**
 * Hero search submit target: trimmed query → `/tours?search=…`, empty → `/tours`.
 * `encodeURIComponent` keeps `&`/`=`/`#` from breaking the URL structure.
 */
export function buildToursHref(query: string): string {
  const trimmed = query.trim();
  return trimmed ? `/tours?search=${encodeURIComponent(trimmed)}` : "/tours";
}

/** Accent-insensitive token-AND match over the fields a traveller types. */
export function filterDestinations(
  destinations: Destination[],
  query: string
): Destination[] {
  const normalizedQuery = normalizeSearchText(query).trim();
  if (!normalizedQuery) return destinations;

  const tokens = normalizedQuery.split(/\s+/);
  return destinations.filter((destination) => {
    const haystack = normalizeSearchText(
      `${destination.name} ${destination.description ?? ""} ${
        destination.country?.vi ?? ""
      } ${destination.country?.en ?? ""} ${destination.region}`
    );
    return tokens.every((token) => haystack.includes(token));
  });
}
