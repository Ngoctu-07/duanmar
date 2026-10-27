import { formatPrice } from "@/lib/pricing";

/** Sanity image projection shared by the banner (legacy) and cover fields. */
export interface PromotionImage {
  asset?: { url?: string; metadata?: { dimensions?: { width?: number; height?: number } } };
  alt?: string | null;
}

/** Shape returned by `PROMOTIONS_QUERY` (see `src/sanity/queries/promotions.ts`). */
export interface PromotionRecord {
  _id: string;
  title_en?: string | null;
  title_vi?: string | null;
  badgeTag_en?: string | null;
  badgeTag_vi?: string | null;
  description_en?: string | null;
  description_vi?: string | null;
  discountedPrice?: number | null;
  originalPrice?: number | null;
  currency?: string | null;
  promoCode?: string | null;
  validUntil?: string | null;
  /** Master-document state: `false` = unpublished/inactive (hidden from wallets). */
  isActive?: boolean | null;
  /** Capacity: maximum claims allowed. Empty/null = unlimited. */
  maxSlots?: number | null;
  /** Capacity: offline/administrative claims already used (online claims are counted live). */
  usedCount?: number | null;
  /** Eligibility: minimum party size (blank/1 = any size). */
  minGuests?: number | null;
  /** Eligibility: earliest travel/booking date (inclusive ISO day). */
  startDate?: string | null;
  /** Eligibility: latest travel/booking date (inclusive ISO day). */
  endDate?: string | null;
  bannerImage?: PromotionImage | null;
  coverImage?: PromotionImage | null;
  targetTour?: { _id: string; slug?: string | null } | null;
}

/** View model consumed by `promotion-card.tsx` — locale already applied. */
export interface PromotionCard {
  id: string;
  title: string;
  badgeTag: string | null;
  description: string | null;
  price: string | null;
  originalPrice: string | null;
  promoCode: string | null;
  validUntil: string | null;
  daysLeft: number;
  dateLabel: string;
  tourSlug: string | null;
  coverUrl: string | null;
  coverAlt: string;
  /** Derived capacity state (see `computePromotionCapacity`). */
  maxSlots: number | null;
  usedCount: number;
  remainingSlots: number | null;
  isExhausted: boolean;
}

const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** UTC midnight timestamp for a `YYYY-MM-DD` date, or `null` when malformed. */
function utcDay(day: string | null | undefined): number | null {
  if (typeof day !== "string" || !ISO_DAY.test(day)) return null;
  const ts = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(ts) ? null : ts;
}

function todayMs(now?: Date): number {
  return utcDay((now ?? new Date()).toISOString().slice(0, 10)) ?? 0;
}

const isBlank = (value?: string | null): boolean => !value || value.trim() === "";

/**
 * Locale pick with the house fallback chain: `vi` → `title_vi`, everything
 * else → `title_en`; a blank/missing translation falls back to the other one.
 */
export function pickPromotionText(
  promo: PromotionRecord,
  locale: string
): { title: string; badgeTag: string | null; description: string | null } {
  const pick = (vi?: string | null, en?: string | null): string | null => {
    const primary = locale === "vi" ? vi : en;
    const secondary = locale === "vi" ? en : vi;
    if (!isBlank(primary)) return (primary as string).trim();
    if (!isBlank(secondary)) return (secondary as string).trim();
    return null;
  };

  return {
    title: pick(promo.title_vi, promo.title_en) ?? "",
    badgeTag: pick(promo.badgeTag_vi, promo.badgeTag_en),
    description: pick(promo.description_vi, promo.description_en),
  };
}

/** Fail closed: missing/malformed `validUntil` is never live. Day is inclusive. */
export function isPromotionLive(promo: PromotionRecord, now?: Date): boolean {
  const target = utcDay(promo.validUntil);
  if (target === null) return false;
  return target >= todayMs(now);
}

export function filterLivePromotions(
  promos: PromotionRecord[],
  now?: Date
): PromotionRecord[] {
  return promos.filter((promo) => isPromotionLive(promo, now));
}

/** Whole days until `validUntil` (0 = today is the last day, negative = past). */
export function daysUntilValid(validUntil: string | null | undefined, now?: Date): number {
  const target = utcDay(validUntil);
  if (target === null) return Number.NEGATIVE_INFINITY;
  return Math.round((target - todayMs(now)) / DAY_MS);
}

/**
 * Formats with the doc's own currency so the amount is never relabelled
 * (unlike `getCurrency(locale)`, which flips currency per locale). Returns
 * `null` for unusable input so the card omits the price instead of showing
 * `0`/`NaN`/a wrong symbol.
 */
export function formatPromoPrice(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: string
): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  if (currency !== "VND" && currency !== "USD") return null;
  return formatPrice(value, locale, currency);
}

/** Slot capacity of one promotion, derived from the CMS limit + live claims. */
export interface PromotionCapacity {
  /** `null` = no limit configured. */
  maxSlots: number | null;
  /** Baseline (CMS) + online wallet claims. */
  usedCount: number;
  /** `null` = unlimited; never negative. */
  remainingSlots: number | null;
  isExhausted: boolean;
}

const nonNegativeInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

/**
 * `isExhausted = usedCount >= maxSlots` (equivalently `remainingSlots <= 0`).
 * `onlineClaims` is the live count of wallet rows for this promotion; the CMS
 * `usedCount` is a manual baseline for offline/administrative redemptions, so
 * total used = baseline + online claims. Invalid/fractional values fail open
 * (unlimited) rather than locking every deal out.
 */
export function computePromotionCapacity(
  promo: Pick<PromotionRecord, "maxSlots" | "usedCount"> | null | undefined,
  onlineClaims = 0
): PromotionCapacity {
  const maxSlots = nonNegativeInt(promo?.maxSlots);
  const baseline = nonNegativeInt(promo?.usedCount) ?? 0;
  const claims = nonNegativeInt(onlineClaims) ?? 0;
  const usedCount = baseline + claims;
  const remainingSlots = maxSlots === null ? null : Math.max(0, maxSlots - usedCount);
  return { maxSlots, usedCount, remainingSlots, isExhausted: remainingSlots === 0 };
}

export function toPromotionCard(
  promo: PromotionRecord,
  locale: string,
  onlineClaims = 0
): PromotionCard {
  const text = pickPromotionText(promo, locale);
  const price = formatPromoPrice(promo.discountedPrice, promo.currency, locale);
  const original = formatPromoPrice(promo.originalPrice, promo.currency, locale);
  // Cover is the new card thumbnail; existing docs keep their banner as fallback.
  const image = promo.coverImage ?? promo.bannerImage;
  const coverAlt = image?.alt?.trim() || text.title;
  const numberLocale = locale === "vi" ? "vi-VN" : "en-GB";
  const dateLabel = utcDay(promo.validUntil)
    ? new Intl.DateTimeFormat(numberLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(promo.validUntil as string))
    : "";

  return {
    id: promo._id,
    title: text.title,
    badgeTag: text.badgeTag,
    description: text.description,
    price,
    originalPrice: original,
    promoCode: isBlank(promo.promoCode) ? null : (promo.promoCode as string).trim(),
    validUntil: utcDay(promo.validUntil) ? (promo.validUntil as string) : null,
    daysLeft: daysUntilValid(promo.validUntil),
    dateLabel,
    tourSlug: promo.targetTour?.slug ?? null,
    coverUrl: image?.asset?.url ?? null,
    coverAlt,
    ...computePromotionCapacity(promo, onlineClaims),
  };
}
