import {
  computePromotionCapacity,
  type PromotionCapacity,
  type PromotionRecord,
} from "@/lib/promotions";
import { countVouchersByPromotion } from "@/lib/vouchers/voucher-store";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { PROMOTIONS_BY_IDS_QUERY } from "@/sanity/queries/promotions";

/**
 * Server-only capacity lookup for the claim API. Reads the CMS limit/baseline
 * for one promotion and adds the live wallet-claim count. `known: false` means
 * the promotion document is gone (archived/deleted): the claim path then keeps
 * its historical permissive behavior instead of guessing a limit.
 */
export interface LoadedCapacity extends PromotionCapacity {
  known: boolean;
  /** CMS-only baseline (offline claims); online claims are counted live. */
  baselineUsed: number;
}

export async function loadPromotionCapacity(
  promotionId: string
): Promise<LoadedCapacity> {
  const [promotions, counts] = await Promise.all([
    fetchPublished(
      PROMOTIONS_BY_IDS_QUERY,
      { ids: [promotionId] },
      { tags: ["sanity:promotion:list"] }
    ),
    countVouchersByPromotion([promotionId]),
  ]);
  const promo = ((promotions ?? []) as PromotionRecord[])[0];
  const baseline = promo?.usedCount;
  return {
    ...computePromotionCapacity(promo ?? {}, counts.get(promotionId) ?? 0),
    known: Boolean(promo),
    baselineUsed:
      typeof baseline === "number" && Number.isInteger(baseline) && baseline > 0
        ? baseline
        : 0,
  };
}
