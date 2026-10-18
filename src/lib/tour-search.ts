import type { Destination } from "@/components/explore/destination-card";
import { normalizeSearchText } from "@/lib/search-normalize";
import { resolveLocaleString, resolveLocalizedField } from "@/lib/bilingual-string";

/**
 * Hero search submit target: trimmed query → `/tours?search=…`, empty → `/tours`.
 * `encodeURIComponent` keeps `&`/`=`/`#` from breaking the URL structure.
 */
export function buildToursHref(query: string): string {
  const trimmed = query.trim();
  return trimmed ? `/tours?search=${encodeURIComponent(trimmed)}` : "/tours";
}

/**
 * Homepage minimalist search submit target: trimmed query → `/search?q=…`,
 * empty → `/search`. The dedicated results page renders the match list.
 */
export function buildSearchHref(query: string): string {
  const trimmed = query.trim();
  return trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
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
      `${resolveLocaleString(destination.name, "vi") ?? ""} ${resolveLocaleString(destination.name, "en") ?? ""} ${resolveLocaleString(destination.description ?? null, "vi") ?? ""} ${resolveLocalizedField(destination.description ?? null, destination.descriptionEn, "en") ?? ""} ${
        destination.country?.vi ?? ""
      } ${destination.country?.en ?? ""} ${destination.region}`
    );
    return tokens.every((token) => haystack.includes(token));
  });
}
