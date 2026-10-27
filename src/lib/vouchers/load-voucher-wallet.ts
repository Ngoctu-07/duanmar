import type { PromotionRecord } from "@/lib/promotions";
import { localizeVouchers, type VoucherView } from "@/lib/vouchers/localize";
import {
  countVouchersByPromotion,
  deleteVouchersByPromotionIds,
  listVouchers,
  type Voucher,
} from "@/lib/vouchers/voucher-store";
import { filterWalletVouchers } from "@/lib/vouchers/wallet-filter";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { PROMOTIONS_BY_IDS_QUERY } from "@/sanity/queries/promotions";

/**
 * Server-only wallet reader with master-document validation.
 *
 * Every consumer (account page, checkout, JSON API) goes through this loader so
 * a stale claim can never leak back into a response:
 * 1. read the snapshot rows from SQLite;
 * 2. fetch the referenced promotions from the published CMS perspective;
 * 3. hide rows whose master is deleted/unpublished or explicitly inactive;
 * 4. optionally delete the orphaned rows (dashboard retrieval only).
 *
 * Failure policy: `fetchPublished` resolves to `null` when the CMS read fails.
 * That is NOT "all masters deleted" — the loader then fails open with the
 * snapshots and never purges, so a Sanity outage cannot empty every wallet.
 */

export interface LoadWalletOptions {
  /**
   * Permanently delete rows whose master document no longer exists. Use on
   * dashboard/API retrieval; leave off for read-only checkout renders.
   * Inactive-but-existing masters are never purged (re-activation restores).
   */
  purgeOrphans?: boolean;
}

export interface WalletRows {
  vouchers: Voucher[];
  /** `true` when the CMS read failed and the rows were returned unvalidated. */
  degraded: boolean;
  /** Number of orphaned rows deleted by this call (0 unless `purgeOrphans`). */
  purgedCount: number;
}

interface WalletSnapshot extends WalletRows {
  /** Live masters for localization; empty on a degraded read (snapshots win). */
  promotions: PromotionRecord[];
}

async function loadWalletSnapshot(
  userId: string,
  { purgeOrphans = false }: LoadWalletOptions
): Promise<WalletSnapshot> {
  const wallet = await listVouchers(userId);
  if (wallet.length === 0) {
    return { vouchers: [], promotions: [], degraded: false, purgedCount: 0 };
  }

  const promotionIds = [...new Set(wallet.map((voucher) => voucher.promotionId))];
  const promotions = await fetchPublished(
    PROMOTIONS_BY_IDS_QUERY,
    { ids: promotionIds },
    { tags: ["sanity:promotion:list"] }
  );

  if (promotions === null) {
    return { vouchers: wallet, promotions: [], degraded: true, purgedCount: 0 };
  }

  const { visible, livePromotions, orphanedPromotionIds } = filterWalletVouchers(
    wallet,
    promotions as PromotionRecord[]
  );

  let purgedCount = 0;
  if (purgeOrphans && orphanedPromotionIds.length > 0) {
    purgedCount = await deleteVouchersByPromotionIds(userId, orphanedPromotionIds);
  }

  return {
    vouchers: visible,
    promotions: livePromotions,
    degraded: false,
    purgedCount,
  };
}

/** Raw, master-validated wallet rows for the JSON API. */
export async function loadWalletRows(
  userId: string,
  options: LoadWalletOptions = {}
): Promise<WalletRows> {
  const { vouchers, degraded, purgedCount } = await loadWalletSnapshot(userId, options);
  return { vouchers, degraded, purgedCount };
}

/** Localized, master-validated wallet views for account/checkout pages. */
export async function loadVoucherWallet(
  userId: string,
  locale: string,
  options: LoadWalletOptions = {}
): Promise<VoucherView[]> {
  const snapshot = await loadWalletSnapshot(userId, options);
  if (snapshot.vouchers.length === 0) return [];

  const promotionIds = [...new Set(snapshot.vouchers.map((voucher) => voucher.promotionId))];
  return localizeVouchers(
    snapshot.vouchers,
    snapshot.promotions,
    locale,
    await countVouchersByPromotion(promotionIds)
  );
}
