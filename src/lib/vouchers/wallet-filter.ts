import type { PromotionRecord } from "@/lib/promotions";
import type { Voucher } from "@/lib/vouchers/voucher-store";

/**
 * Wallet ↔ master-promotion reconciliation (pure, server/client safe).
 *
 * Wallet rows are claim-time snapshots, so they survive the promotion document
 * being deleted or unpublished. Rendering those stale rows is what kept dead
 * vouchers in "My Vouchers". This module decides, for one wallet page load,
 * which rows still have a live master:
 *
 * - master absent from the published CMS read → orphaned (deleted/unpublished);
 *   hidden now and safe to purge permanently.
 * - master present but `isActive === false` → inactive; hidden now but the row
 *   is kept so re-activating the promotion restores the user's voucher.
 * - master present and active (or legacy docs with no `isActive` flag) → live.
 *
 * The caller must distinguish a successful read from a failed one: a `null`
 * CMS response is NOT an empty wallet. On failure the loader fails open with
 * snapshots and never purges, otherwise an outage would wipe every wallet.
 */

/** A published master counts as live unless it is explicitly deactivated. */
export function isLiveMasterPromotion(
  promo: Pick<PromotionRecord, "_id" | "isActive"> | null | undefined
): boolean {
  return Boolean(
    promo &&
      typeof promo._id === "string" &&
      promo._id.length > 0 &&
      promo.isActive !== false
  );
}

export interface WalletFilterResult {
  /** Rows whose master exists and is active, in original wallet order. */
  visible: Voucher[];
  /** Live masters for the visible rows (localization/capacity input). */
  livePromotions: PromotionRecord[];
  /** Promotion IDs with no master document (deleted/unpublished). */
  orphanedPromotionIds: string[];
  /** Promotion IDs whose master exists but is explicitly inactive. */
  inactivePromotionIds: string[];
}

export function filterWalletVouchers(
  vouchers: Voucher[],
  promotions: PromotionRecord[]
): WalletFilterResult {
  const byId = new Map(promotions.map((promo) => [promo._id, promo]));
  const visible: Voucher[] = [];
  const livePromotions: PromotionRecord[] = [];
  const orphaned = new Set<string>();
  const inactive = new Set<string>();

  for (const voucher of vouchers) {
    const promo = byId.get(voucher.promotionId);
    if (!promo) {
      orphaned.add(voucher.promotionId);
      continue;
    }
    if (!isLiveMasterPromotion(promo)) {
      inactive.add(voucher.promotionId);
      continue;
    }
    visible.push(voucher);
    livePromotions.push(promo);
  }

  return {
    visible,
    livePromotions,
    orphanedPromotionIds: [...orphaned],
    inactivePromotionIds: [...inactive],
  };
}
