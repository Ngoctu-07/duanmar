import { type NextRequest, NextResponse } from "next/server";
import {
  ARTICLE_LIKES_SLUG_PATTERN,
  toggleArticleLike,
} from "@/lib/article-likes-db";
import { checkRateLimit } from "@/lib/assistant/rate-limit";
import { resolveClientKey } from "@/lib/request-ip";
import {
  isValidVisitor,
  newVisitorId,
  readVisitor,
  VISITOR_COOKIE,
  visitorCookieOptions,
} from "@/lib/visitor";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_000;

/**
 * Heart toggle endpoint (plan 261007-2145): atomically flips THIS
 * visitor's vote (like ↔ unlike) and returns the shared count. First-ever
 * click issues the `vn_visitor` HttpOnly cookie. No auth beyond the
 * anonymous cookie (documented demo trust model, forgeable by design).
 * Order: 400 → 413 → 429 → DB, so spam pays its rate-limit budget first.
 * Empty/JSON body both accepted; no PII in payload or logs.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!ARTICLE_LIKES_SLUG_PATTERN.test(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  if (!checkRateLimit(`like:${resolveClientKey(req)}`)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const current = readVisitor(req);
  const visitor = isValidVisitor(current) ? current : newVisitorId();

  try {
    const { count, isLiked } = await toggleArticleLike(slug, visitor);
    const response = NextResponse.json({ slug, count, isLiked });
    if (visitor !== current) {
      response.cookies.set(VISITOR_COOKIE, visitor, visitorCookieOptions());
    }
    console.log("[article-like]", {
      at: new Date().toISOString(),
      slug,
      count,
      isLiked,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "db unavailable") {
      return Response.json({ error: "Storage unavailable" }, { status: 503 });
    }
    console.error("[article-like] failed", { slug, error: message });
    return Response.json({ error: "Like failed" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
