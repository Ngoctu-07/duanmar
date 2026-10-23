import type { PromotionRecord } from "@/lib/promotions";
import type { Voucher } from "@/lib/vouchers/voucher-store";

/**
 * Voucher copy is re-localized from the referenced CMS promotion on every
 * render. Rows themselves are claim-time snapshots, so their stored
 * title/description are frozen in whatever language the visitor used back then
 * — reading them directly is what produced the mixed-language wallet (one
 * voucher Vietnamese, the next English on the same page).
 *
 * Rules:
 * - Locale is normalized strictly to `vi` | `en` (`vi` only for `locale ===
 *   "vi"`; every other tag, including `en-US`/`fr`, resolves to English).
 * - Only the active language's fields are used. There is deliberately NO
 *   cross-language fallback: a missing translation leaves the field empty so
 *   the UI can fall back to the language-neutral promo code instead of printing
 *   the other language mid-list.
 * - A promotion that no longer exists at all (deleted, not just archived) is
 *   the single exception: the stored snapshot is better than a blank card.
 *
 * Prices, promo code and expiry stay as claimed (they are the contract).
 */

export type VoucherLocale = "en" | "vi";

/**
 * Strict two-way switch on the primary subtag: `vi` / `vi-VN` → Vietnamese,
 * everything else (`en`, `en-US`, `fr`, empty) → English. Locale is never used
 * to reach into the other language's fields.
 */
export function normalizeVoucherLocale(locale: string | null | undefined): VoucherLocale {
  const base = (locale ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return base === "vi" ? "vi" : "en";
}

/** Active-language field only — never the other locale's copy. */
function pickStrict(locale: VoucherLocale, vi?: string | null, en?: string | null): string | null {
  const value = locale === "vi" ? vi : en;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function localizeVouchers(
  vouchers: Voucher[],
  promotions: PromotionRecord[],
  locale: string
): Voucher[] {
  if (vouchers.length === 0) return vouchers;
  const target = normalizeVoucherLocale(locale);
  const byId = new Map(promotions.map((promo) => [promo._id, promo]));

  return vouchers.map((voucher) => {
    const promo = byId.get(voucher.promotionId);
    if (!promo) return voucher;

    return {
      ...voucher,
      // Empty string → the card renders the promo code (language-neutral).
      title: pickStrict(target, promo.title_vi, promo.title_en) ?? "",
      description: pickStrict(target, promo.description_vi, promo.description_en) ?? "",
      badge: pickStrict(target, promo.badgeTag_vi, promo.badgeTag_en),
    };
  });
}
