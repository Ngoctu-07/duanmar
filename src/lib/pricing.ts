export interface PriceTier {
  minGuests: number;
  maxGuests: number | null;
  pricePerGuest: number;
  groupTotal: number;
}

interface RawTier {
  minGuests?: number | null;
  maxGuests?: number | null;
  pricePerGuestVnd?: number | null;
  pricePerGuestUsd?: number | null;
  groupTotalVnd?: number | null;
  groupTotalUsd?: number | null;
}

export interface TourPricingDoc {
  tiers?: RawTier[] | null;
}

export type PriceCurrency = "VND" | "USD";

/** VI shows VND, EN shows USD — no exchange-rate conversion, both values are authored. */
export function getCurrency(locale: string): PriceCurrency {
  return locale === "vi" ? "VND" : "USD";
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1;

interface MaybeTier {
  minGuests?: number | null;
  maxGuests: number | null;
  pricePerGuest?: number | null;
  groupTotal?: number | null;
}

/**
 * Drops malformed rows instead of rendering them: a missing price must hide the
 * block, never show a fabricated `0`/`NaN`. Tiers are sorted ascending so
 * authored order cannot put `8+` above `2`.
 */
export function mapPricingTiers(
  doc: TourPricingDoc | null | undefined,
  locale: string
): PriceTier[] {
  const currency = getCurrency(locale);

  const usable = (tier: MaybeTier): tier is PriceTier =>
    isPositiveInteger(tier.minGuests) &&
    (tier.maxGuests === null ||
      (isPositiveInteger(tier.maxGuests) &&
        tier.maxGuests >= (tier.minGuests as number))) &&
    typeof tier.pricePerGuest === "number" &&
    Number.isFinite(tier.pricePerGuest) &&
    tier.pricePerGuest > 0 &&
    typeof tier.groupTotal === "number" &&
    Number.isFinite(tier.groupTotal) &&
    tier.groupTotal > 0;

  return (doc?.tiers ?? [])
    .map<MaybeTier>((tier) => ({
      minGuests: tier.minGuests,
      maxGuests: tier.maxGuests ?? null,
      pricePerGuest:
        currency === "VND" ? tier.pricePerGuestVnd : tier.pricePerGuestUsd,
      groupTotal: currency === "VND" ? tier.groupTotalVnd : tier.groupTotalUsd,
    }))
    .filter(usable)
    .sort((a, b) => a.minGuests - b.minGuests);
}

/**
 * Tier used to price a guest count. An exact range match wins; otherwise the
 * count falls to the nearest range (below every range → first tier, above every
 * range → last tier, inside an authored gap → the range it is closest to) so
 * CMS tiers always yield a total without jumping to the priciest tier.
 * `null` only when there is no tier data at all or the count is not a positive
 * integer — callers then hide the price instead of inventing one.
 */
export function resolveTierForGuests(
  tiers: PriceTier[],
  guests: number
): PriceTier | null {
  if (!Number.isInteger(guests) || guests < 1 || tiers.length === 0) return null;

  const sorted = [...tiers].sort((a, b) => a.minGuests - b.minGuests);
  const exact = sorted.find(
    (tier) =>
      guests >= tier.minGuests &&
      (tier.maxGuests === null || guests <= tier.maxGuests)
  );
  if (exact) return exact;

  let nearest = sorted[0];
  let nearestDistance = tierDistance(guests, nearest);
  for (const candidate of sorted.slice(1)) {
    const distance = tierDistance(guests, candidate);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** How far `guests` sits outside a tier's range; `0` when inside it. */
function tierDistance(guests: number, tier: PriceTier): number {
  if (guests < tier.minGuests) return tier.minGuests - guests;
  if (tier.maxGuests !== null && guests > tier.maxGuests)
    return guests - tier.maxGuests;
  return 0;
}

/** Whole dollars / dong; fractional values still print with 2 decimals. */
export function formatPrice(
  value: number,
  locale: string,
  currency: PriceCurrency
): string {
  const numberLocale = locale === "vi" ? "vi-VN" : "en-US";
  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/* --- compact reference range used on listing cards --- */

export interface TourPricingSummaryDoc {
  tourSlug?: string | null;
  tiers?: Array<{
    pricePerGuestVnd?: number | null;
    pricePerGuestUsd?: number | null;
  }> | null;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface PriceRangeLabel {
  label: string;
  text: string;
}

type RangesBySlug = Record<string, Partial<Record<PriceCurrency, PriceRange>>>;

const isUsablePrice = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

function collectRange(values: Array<number | null | undefined>) {
  const prices = values.filter(isUsablePrice);
  if (prices.length === 0) return undefined;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * Per-slug min→max of price-per-guest, for both currencies at once.
 * Docs arrive newest-first (`order(_updatedAt desc, _id asc)`) and each slug is
 * claimed by the first doc seen, so a newer doc with unusable prices hides the
 * price instead of falling back to an older doc — matching the single-doc
 * detail query. A claimed slug may end up empty; consumers treat that as "no
 * price" and render nothing rather than a fabricated range.
 */
export function buildPriceRanges(
  docs: TourPricingSummaryDoc[] | null | undefined
): RangesBySlug {
  const ranges: RangesBySlug = {};

  for (const doc of docs ?? []) {
    const slug = typeof doc?.tourSlug === "string" ? doc.tourSlug.trim() : "";
    if (!slug || ranges[slug]) continue;

    ranges[slug] = {};
    const tiers = doc.tiers ?? [];
    const vnd = collectRange(tiers.map((tier) => tier.pricePerGuestVnd));
    const usd = collectRange(tiers.map((tier) => tier.pricePerGuestUsd));
    if (vnd) ranges[slug].VND = vnd;
    if (usd) ranges[slug].USD = usd;
  }

  return ranges;
}

/** Single value when min === max (`1.850.000 ₫`), never a duplicated range. */
export function formatPriceRange(
  range: PriceRange | undefined,
  locale: string
): string | null {
  if (!range) return null;
  const currency = getCurrency(locale);
  const min = formatPrice(range.min, locale, currency);
  return range.min === range.max ? min : `${min} – ${formatPrice(range.max, locale, currency)}`;
}

export function buildPriceRangeLabels(
  docs: TourPricingSummaryDoc[] | null | undefined,
  locale: string,
  label: string
): Record<string, PriceRangeLabel> {
  const ranges = buildPriceRanges(docs);
  const labels: Record<string, PriceRangeLabel> = {};

  for (const [slug, perCurrency] of Object.entries(ranges)) {
    const text = formatPriceRange(perCurrency[getCurrency(locale)], locale);
    if (text) labels[slug] = { label, text };
  }

  return labels;
}
