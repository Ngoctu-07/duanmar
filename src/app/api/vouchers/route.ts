import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { loadWalletRows } from "@/lib/vouchers/load-voucher-wallet";
import { loadPromotionCapacity } from "@/lib/vouchers/voucher-capacity";
import {
  claimVoucher,
  findVoucher,
  isValidPromotionId,
  type ClaimVoucherInput,
} from "@/lib/vouchers/voucher-store";

export const runtime = "nodejs";

/**
 * `GET /api/vouchers` — the signed-in user's wallet, newest claim first.
 * `POST /api/vouchers` — idempotent claim of one promotion snapshot.
 * Both require a valid Auth.js session (401 otherwise).
 *
 * Master-document validation: GET runs every wallet row through
 * `loadWalletRows`, so claims whose promotion was deleted/unpublished or
 * deactivated never appear in the response (see `load-voucher-wallet.ts`).
 * The account page additionally purges orphaned rows; GET stays read-only.
 *
 * Capacity: a NEW claim is refused with 409 `exhausted` when the CMS slot
 * limit is reached (`usedCount >= maxSlots`, online claims counted live). An
 * already-claimed voucher is always returned unchanged so the wallet stays
 * idempotent even after the deal sells out.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { vouchers } = await loadWalletRows(user.id);
  return NextResponse.json({ vouchers });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: ClaimVoucherInput;
  try {
    body = (await request.json()) as ClaimVoucherInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!isValidPromotionId(body.promotionId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Existing wallet row wins over capacity: re-claiming is a no-op, never a 409.
  const existing = await findVoucher(user.id, body.promotionId);
  let capacity: { maxSlots: number | null; baselineUsed: number } | null = null;
  if (!existing) {
    const loaded = await loadPromotionCapacity(body.promotionId);
    if (loaded.known && loaded.isExhausted) {
      return NextResponse.json({ error: "exhausted" }, { status: 409 });
    }
    if (loaded.known) {
      capacity = { maxSlots: loaded.maxSlots, baselineUsed: loaded.baselineUsed };
    }
  }

  const result = await claimVoucher(user.id, body, undefined, capacity);
  if (!result.ok) {
    const status =
      result.code === "invalid" ? 400 : result.code === "exhausted" ? 409 : 503;
    return NextResponse.json({ error: result.code }, { status });
  }

  return NextResponse.json(
    { voucher: result.voucher, created: result.created },
    { status: result.created ? 201 : 200 }
  );
}
