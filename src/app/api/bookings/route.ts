import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { isTripBooking, type TripBooking } from "@/lib/booking-history";
import {
  clearBookingsForUser,
  listBookingsForUser,
  saveBookingForUser,
} from "@/lib/bookings/booking-store";

export const runtime = "nodejs";

/**
 * `GET /api/bookings`    — the signed-in user's trip history (newest first).
 * `POST /api/bookings`   — upsert one paid ticket by reference.
 * `DELETE /api/bookings` — remove every trip from the account.
 *
 * Local storage stays as an offline cache, but this table is the source of
 * truth across devices/sessions.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ bookings: listBookingsForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isTripBooking(body)) {
    return NextResponse.json({ error: "invalid_booking" }, { status: 400 });
  }

  const saved = saveBookingForUser(user.id, body as TripBooking);
  if (!saved) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cleared = clearBookingsForUser(user.id);
  if (!cleared) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
