import type { PromotionRecord } from "@/lib/promotions";
import { computePromotionCapacity, type PromotionCapacity } from "@/lib/promotions";
import type { Voucher } from "@/lib/vouchers/voucher-store";
import {
  normalizeVoucherRequirements,
  type VoucherRequirements,
} from "@/lib/vouchers/voucher-eligibility";

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
 * - This function is fail-open by design: a missing promotion returns the
 *   stored snapshot. Wallet/checkout consumers must pre-filter through
 *   `loadVoucherWallet`/`filterWalletVouchers` so deleted masters never reach
 *   the UI; direct snapshot rendering still gets a usable card.
 *
 * Prices, promo code and expiry stay as claimed (they are the contract).
 */

export type VoucherLocale = "en" | "vi";

/** Wallet row + live slot capacity + live conditional requirements. */
export type VoucherView = Voucher & PromotionCapacity & VoucherRequirements;

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
  locale: string,
  claimedCounts: ReadonlyMap<string, number> = new Map()
): VoucherView[] {
  if (vouchers.length === 0) return vouchers as VoucherView[];
  const target = normalizeVoucherLocale(locale);
  const byId = new Map(promotions.map((promo) => [promo._id, promo]));

  return vouchers.map((voucher) => {
    const promo = byId.get(voucher.promotionId);
    // Capacity follows the live promotion, not the claim-time snapshot: a deal
    // that exhausts after the claim must still grey out in the wallet/checkout.
    const capacity = computePromotionCapacity(
      promo ?? {},
      claimedCounts.get(voucher.promotionId) ?? 0
    );
    // Guest/date rules follow the live promotion too (an edited rule applies
    // immediately; a deleted promotion fails open with no requirements).
    const requirements = normalizeVoucherRequirements(promo ?? {});
    if (!promo) return { ...voucher, ...capacity, ...requirements };

    return {
      ...voucher,
      ...capacity,
      ...requirements,
      // Empty string → the card renders the promo code (language-neutral).
      title: pickStrict(target, promo.title_vi, promo.title_en) ?? "",
      description: pickStrict(target, promo.description_vi, promo.description_en) ?? "",
      badge: pickStrict(target, promo.badgeTag_vi, promo.badgeTag_en),
    };
  });
}
