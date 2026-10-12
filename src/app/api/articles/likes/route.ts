import { type NextRequest, NextResponse } from "next/server";
import {
  ARTICLE_LIKES_SLUG_PATTERN,
  getArticleLikeCounts,
  getVisitorLikedSlugs,
} from "@/lib/article-likes-db";
import { getDb } from "@/lib/db/sqlite-store";
import {
  isValidVisitor,
  newVisitorId,
  readVisitor,
  VISITOR_COOKIE,
  visitorCookieOptions,
} from "@/lib/visitor";

export const runtime = "nodejs";

const MAX_SLUGS = 50;

/**
 * Batch like-state endpoint (plan 261007-2145) for client hydration:
 * `GET /api/articles/likes?slugs=a,b` → `{counts,liked}`. DB up → every
 * valid slug present in both maps (absent count would be 0, absent vote
 * false); DB degraded → 200 with empty maps. Issues `vn_visitor` when the
 * caller has none so the answer is already visitor-scoped.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    ),
  ];
  if (
    slugs.length === 0 ||
    slugs.length > MAX_SLUGS ||
    !slugs.every((slug) => ARTICLE_LIKES_SLUG_PATTERN.test(slug))
  ) {
    return Response.json({ error: "Invalid slugs" }, { status: 400 });
  }

  const current = readVisitor(req);
  const visitor = isValidVisitor(current) ? current : newVisitorId();
  const counts = getArticleLikeCounts(slugs);
  const liked = getVisitorLikedSlugs(slugs, visitor);
  const degraded = getDb() === null;
  const payload = degraded
    ? { counts: {}, liked: {} }
    : {
        counts: Object.fromEntries(
          slugs.map((slug) => [slug, counts.get(slug) ?? 0])
        ),
        liked: Object.fromEntries(
          slugs.map((slug) => [slug, liked.get(slug) ?? false])
        ),
      };

  const response = NextResponse.json(payload);
  if (visitor !== current) {
    response.cookies.set(VISITOR_COOKIE, visitor, visitorCookieOptions());
  }
  return response;
}
