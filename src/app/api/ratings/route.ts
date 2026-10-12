import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db/sqlite-store";
import { getRatingAggregates, type RatingAggregate } from "@/lib/reviews-db";

export const runtime = "nodejs";

const MAX_SLUGS = 100;

/**
 * GET /api/ratings?slugs=a,b,c — batch AVG/COUNT for badges and RSC
 * hydration (mirrors the article-like counts endpoint). Degrades the way
 * the plan requires: no DB → 503 (callers keep their initial props),
 * slugs without reviews are simply absent from `aggregates`.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("slugs");
  if (!raw) return Response.json({ error: "Missing slugs" }, { status: 400 });
  const slugs = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (slugs.length === 0 || slugs.length > MAX_SLUGS) {
    return Response.json({ error: "Invalid slugs" }, { status: 400 });
  }
  if (!getDb()) {
    return Response.json({ error: "Storage unavailable" }, { status: 503 });
  }

  const found = getRatingAggregates(slugs);
  const aggregates: Record<string, RatingAggregate> = {};
  for (const slug of new Set(slugs)) {
    const entry = found.get(slug);
    if (entry) aggregates[slug] = entry;
  }
  return Response.json({ aggregates });
}

export function POST() {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "GET" } }
  );
}
