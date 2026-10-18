/**
 * Bilingual CMS string — the `{ vi, en }` shape used by `country.name` and now
 * by the homepage hero slogan / global footer slogan.
 *
 * Editors may fill only one language, so a missing/blank active-locale value
 * falls back to the other locale before the caller falls back to i18n. Returns
 * `null` when neither side has usable text (never an empty string, so callers
 * can use `?? fallback` without an `||` trap).
 */

import type { PortableTextBlock } from "next-sanity";

export type BilingualString = {
  vi?: string | null;
  en?: string | null;
} | null;

/**
 * Legacy-tolerant locale string: pre-localization docs stored a plain
 * `string`; localized docs store `{ vi, en }`. Accepts both.
 */
export type LocaleString = string | BilingualString;

/** Legacy-tolerant locale string array. */
export type LocaleStringList =
  | string[]
  | { vi?: string[] | null; en?: string[] | null }
  | null
  | undefined;

/** Legacy-tolerant Portable Text: bare blocks, or `{ vi, en }` block arrays. */
export type LocaleBlocks =
  | PortableTextBlock[]
  | { vi?: PortableTextBlock[] | null; en?: PortableTextBlock[] | null }
  | null
  | undefined;

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

const cleanStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];

/**
 * Tour editorial string resolver: legacy plain strings pass through, `{vi,en}`
 * objects resolve active locale → **vi** → en (Vietnamese is the authoring
 * language, so an empty `en` payload always shows `vi` — never a blank box).
 */
export function resolveLocaleString(value: LocaleString, locale: string): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (!value) return null;
  const active = (isKnownLocale(locale) ? value[locale] : null)?.trim();
  if (active) return active;
  return value.vi?.trim() || value.en?.trim() || null;
}

/** Same chain for localized string arrays; always returns an array. */
export function resolveLocaleList(value: LocaleStringList, locale: string): string[] {
  if (Array.isArray(value)) return cleanStringList(value);
  if (!value) return [];
  const active = cleanStringList(isKnownLocale(locale) ? value[locale] : null);
  if (active.length > 0) return active;
  return cleanStringList(value.vi).length > 0 ? cleanStringList(value.vi) : cleanStringList(value.en);
}

/** Same chain for localized Portable Text blocks; always returns an array. */
export function resolveLocaleBlocks(value: LocaleBlocks, locale: string): PortableTextBlock[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  const active = (isKnownLocale(locale) ? value[locale] : null) ?? [];
  if (active.length > 0) return active;
  return (value.vi ?? []).length > 0 ? (value.vi ?? []) : (value.en ?? []);
}

/**
 * Monolingual base field + explicit English companion field
 * (`destination.description` + `descriptionEn`, `itinerary` + `itineraryEn`).
 *
 * EN locale → trimmed `english` when non-empty, else fall back to the base
 * field. Any other locale → base field only (the base is the Vietnamese
 * source). Never returns an empty string, so callers can chain `??`.
 */
export function resolveLocalizedField(
  base: LocaleString,
  english: string | null | undefined,
  locale: string
): string | null {
  if (locale === "en") {
    const translated = typeof english === "string" ? english.trim() : "";
    if (translated) return translated;
  }
  return resolveLocaleString(base, locale);
}
