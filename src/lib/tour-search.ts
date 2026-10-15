import type { Destination } from "@/components/explore/destination-card";
import { normalizeSearchText } from "@/lib/search-normalize";
import { resolveLocaleString } from "@/lib/bilingual-string";

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
    // Bilingual haystack: both locales so a query matches either language.
    const haystack = normalizeSearchText(
      `${resolveLocaleString(destination.name, "vi") ?? ""} ${resolveLocaleString(destination.name, "en") ?? ""} ${resolveLocaleString(destination.description ?? null, "vi") ?? ""} ${resolveLocaleString(destination.description ?? null, "en") ?? ""} ${
        destination.country?.vi ?? ""
      } ${destination.country?.en ?? ""} ${destination.region}`
    );
    return tokens.every((token) => haystack.includes(token));
  });
}
