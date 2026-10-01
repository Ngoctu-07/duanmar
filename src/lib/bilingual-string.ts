/**
 * Bilingual CMS string — the `{ vi, en }` shape used by `country.name` and now
 * by the homepage hero slogan / global footer slogan.
 *
 * Editors may fill only one language, so a missing/blank active-locale value
 * falls back to the other locale before the caller falls back to i18n. Returns
 * `null` when neither side has usable text (never an empty string, so callers
 * can use `?? fallback` without an `||` trap).
 */

export type BilingualString = {
  vi?: string | null;
  en?: string | null;
} | null;

const isKnownLocale = (value: string): value is "vi" | "en" =>
  value === "vi" || value === "en";

/** Active locale → other locale → `null`. Whitespace-only values count as empty. */
export function pickBilingual(value: BilingualString, locale: string): string | null {
  if (!value) return null;
  const primary = (isKnownLocale(locale) ? value[locale] : null)?.trim();
  if (primary) return primary;
  // Non-vi locales (incl. an unexpected one) fall back to EN — `defaultLocale`.
  const secondary = (locale === "en" ? value.vi : value.en)?.trim();
  return secondary || null;
}
