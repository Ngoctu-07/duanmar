import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import {
  claimVoucher,
  listVouchers,
  type ClaimVoucherInput,
} from "@/lib/vouchers/voucher-store";

export const runtime = "nodejs";

/**
 * `GET /api/vouchers` — the signed-in user's wallet, newest claim first.
 * `POST /api/vouchers` — idempotent claim of one promotion snapshot.
 * Both require a valid Auth.js session (401 otherwise).
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({ vouchers: listVouchers(user.id) });
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

  const result = await claimVoucher(user.id, body);
  if (!result.ok) {
    const status = result.code === "invalid" ? 400 : 503;
    return NextResponse.json({ error: result.code }, { status });
  }

  return NextResponse.json(
    { voucher: result.voucher, created: result.created },
    { status: result.created ? 201 : 200 }
  );
}
