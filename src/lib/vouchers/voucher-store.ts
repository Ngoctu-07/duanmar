import { createHash, randomUUID } from "node:crypto";
import {
  getDb,
  queryRow,
  queryRows,
  runStatement,
  withTransaction,
} from "@/lib/db/sqlite-store";

/**
 * Voucher wallet store (server only).
 *
 * A voucher is a snapshot of the promotion at claim time: title, description,
 * code, prices, expiry and the target tour. The `(user_id, promotion_id)`
 * unique pair makes "Claim now" idempotent — clicking twice returns the same
 * voucher instead of duplicating the wallet entry.
 */

export interface Voucher {
  id: string;
  promotionId: string;
  code: string;
  title: string;
  description: string;
  price: string | null;
  originalPrice: string | null;
  badge: string | null;
  validUntil: string | null;
  tourSlug: string | null;
  claimedAt: string;
}

export interface ClaimVoucherInput {
  promotionId: string;
  title: string;
  description?: string | null;
  promoCode?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  badge?: string | null;
  validUntil?: string | null;
  tourSlug?: string | null;
}

export type ClaimVoucherResult =
  | { ok: true; voucher: Voucher; created: boolean }
  | { ok: false; code: "invalid" | "db_unavailable" | "exhausted" };

/** Server-verified capacity, checked again inside the claim transaction. */
export interface ClaimCapacity {
  /** `null` = unlimited. */
  maxSlots: number | null;
  /** Manual (CMS) baseline already used; online claims are counted live. */
  baselineUsed: number;
}

const ID_PATTERN = /^[A-Za-z0-9_.-]{1,120}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

/** Same id shape the claim path accepts — used by the API before any CMS read. */
export function isValidPromotionId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

/** Deterministic fallback code so a wallet entry always shows something usable. */
export function generateVoucherCode(promotionId: string): string {
  const digest = createHash("sha256").update(promotionId).digest("hex");
  return `DUAN-${digest.slice(0, 6).toUpperCase()}`;
}

function resolveCode(input: ClaimVoucherInput): string {
  const supplied = typeof input.promoCode === "string" ? input.promoCode.trim().toUpperCase() : "";
  if (CODE_PATTERN.test(supplied)) return supplied;
  return generateVoucherCode(input.promotionId);
}

function sanitize(input: ClaimVoucherInput): Omit<Voucher, "id" | "claimedAt"> | null {
  const promotionId = text(input.promotionId, 120);
  const title = text(input.title, 200);
  if (!promotionId || !ID_PATTERN.test(promotionId) || !title) return null;

  const tourSlug = text(input.tourSlug, 120);
  const validUntil = text(input.validUntil, 10);

  return {
    promotionId,
    title,
    description: text(input.description, 600) ?? "",
    code: resolveCode(input),
    price: text(input.price, 40),
    originalPrice: text(input.originalPrice, 40),
    badge: text(input.badge, 40),
    validUntil: validUntil && ISO_DAY.test(validUntil) ? validUntil : null,
    tourSlug: tourSlug && SLUG_PATTERN.test(tourSlug) ? tourSlug : null,
  };
}

interface VoucherRow {
  id: string;
  promotion_id: string;
  code: string;
  title: string;
  description: string;
  price: string | null;
  original_price: string | null;
  badge: string | null;
  valid_until: string | null;
  tour_slug: string | null;
  claimed_at: string;
}

const COLUMNS =
  "id, promotion_id, code, title, description, price, original_price, badge, valid_until, tour_slug, claimed_at";

function mapRow(row: VoucherRow): Voucher {
  return {
    id: row.id,
    promotionId: row.promotion_id,
    code: row.code,
    title: row.title,
    description: row.description ?? "",
    price: row.price,
    originalPrice: row.original_price,
    badge: row.badge,
    validUntil: row.valid_until,
    tourSlug: row.tour_slug,
    claimedAt: row.claimed_at,
  };
}

export async function listVouchers(userId: string): Promise<Voucher[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await queryRows<VoucherRow>(
    db,
    `SELECT ${COLUMNS} FROM vouchers WHERE user_id = ? ORDER BY claimed_at DESC`,
    [userId]
  );
  return rows.map(mapRow);
}

/**
 * Remove wallet rows whose master promotion no longer exists.
 *
 * Scoped to one user so a CMS-wide cleanup can never touch another wallet.
 * Invalid IDs are ignored (defence in depth: the filter only produces IDs read
 * from rows, but this function is also callable from scripts). Failures are
 * swallowed — cleanup must never break the account page.
 */
export async function deleteVouchersByPromotionIds(
  userId: string,
  promotionIds: string[]
): Promise<number> {
  const valid = [...new Set(promotionIds.filter(isValidPromotionId))];
  if (valid.length === 0) return 0;
  const db = await getDb();
  if (!db) return 0;
  const placeholders = valid.map(() => "?").join(",");
  try {
    return await runStatement(
      db,
      `DELETE FROM vouchers WHERE user_id = ? AND promotion_id IN (${placeholders})`,
      [userId, ...valid]
    );
  } catch {
    return 0;
  }
}

/** One wallet row for a promotion (idempotent re-claim / capacity fast path). */
export async function findVoucher(
  userId: string,
  promotionId: string
): Promise<Voucher | null> {
  if (!isValidPromotionId(promotionId)) return null;
  const db = await getDb();
  if (!db) return null;
  const row = await queryRow<VoucherRow>(
    db,
    `SELECT ${COLUMNS} FROM vouchers WHERE user_id = ? AND promotion_id = ?`,
    [userId, promotionId]
  );
  return row ? mapRow(row) : null;
}

/** Live claim count per promotion (feeds `computePromotionCapacity`). */
export async function countVouchersByPromotion(
  promotionIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const valid = [...new Set(promotionIds.filter(isValidPromotionId))];
  if (valid.length === 0) return counts;
  const db = await getDb();
  if (!db) return counts;
  const placeholders = valid.map(() => "?").join(",");
  const rows = await queryRows<{ promotion_id: string; n: number }>(
    db,
    `SELECT promotion_id, COUNT(*) AS n FROM vouchers ` +
      `WHERE promotion_id IN (${placeholders}) GROUP BY promotion_id`,
    valid
  );
  for (const row of rows) counts.set(row.promotion_id, Number(row.n));
  return counts;
}

/** Idempotent claim: insert once, then always return the stored snapshot. */
export async function claimVoucher(
  userId: string,
  input: ClaimVoucherInput,
  nowIso = new Date().toISOString(),
  capacity: ClaimCapacity | null = null
): Promise<ClaimVoucherResult> {
  const snapshot = sanitize(input);
  if (!snapshot) return { ok: false, code: "invalid" };

  try {
    return await withTransaction(async (db) => {
      const existing = await queryRow<VoucherRow>(
        db,
        `SELECT ${COLUMNS} FROM vouchers WHERE user_id = ? AND promotion_id = ?`,
        [userId, snapshot.promotionId]
      );
      if (existing) {
        return { ok: true as const, voucher: mapRow(existing), created: false };
      }

      // Re-check inside the transaction so two near-simultaneous claims cannot
      // both slip past the last remaining slot.
      if (capacity && capacity.maxSlots !== null) {
        const used = await queryRow<{ n: number }>(
          db,
          "SELECT COUNT(*) AS n FROM vouchers WHERE promotion_id = ?",
          [snapshot.promotionId]
        );
        const available = Math.max(0, capacity.maxSlots - capacity.baselineUsed);
        if (Number(used?.n ?? 0) >= available) {
          return { ok: false as const, code: "exhausted" as const };
        }
      }

      const id = randomUUID();
      await runStatement(
        db,
        "INSERT INTO vouchers (id, user_id, promotion_id, code, title, description, price, " +
          "original_price, badge, valid_until, tour_slug, claimed_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          userId,
          snapshot.promotionId,
          snapshot.code,
          snapshot.title,
          snapshot.description,
          snapshot.price,
          snapshot.originalPrice,
          snapshot.badge,
          snapshot.validUntil,
          snapshot.tourSlug,
          nowIso,
        ]
      );

      return {
        ok: true as const,
        voucher: { id, claimedAt: nowIso, ...snapshot },
        created: true,
      };
    });
  } catch {
    return { ok: false, code: "db_unavailable" };
  }
}
