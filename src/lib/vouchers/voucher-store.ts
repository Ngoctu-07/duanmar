import { createHash, randomUUID } from "node:crypto";
import { getDb, withTransaction } from "@/lib/db/sqlite-store";

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
  | { ok: false; code: "invalid" | "db_unavailable" };

const ID_PATTERN = /^[A-Za-z0-9_.-]{1,120}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

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

export function listVouchers(userId: string): Voucher[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM vouchers WHERE user_id = ? ORDER BY claimed_at DESC`)
    .all(userId) as unknown as VoucherRow[];
  return rows.map(mapRow);
}

/** Idempotent claim: insert once, then always return the stored snapshot. */
export function claimVoucher(
  userId: string,
  input: ClaimVoucherInput,
  nowIso = new Date().toISOString()
): ClaimVoucherResult {
  const snapshot = sanitize(input);
  if (!snapshot) return { ok: false, code: "invalid" };

  try {
    return withTransaction((db) => {
      const existing = db
        .prepare(`SELECT ${COLUMNS} FROM vouchers WHERE user_id = ? AND promotion_id = ?`)
        .get(userId, snapshot.promotionId) as VoucherRow | undefined;
      if (existing) {
        return { ok: true as const, voucher: mapRow(existing), created: false };
      }

      const id = randomUUID();
      db.prepare(
        "INSERT INTO vouchers (id, user_id, promotion_id, code, title, description, price, " +
          "original_price, badge, valid_until, tour_slug, claimed_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
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
        nowIso
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
