import type { NextRequest } from "next/server";
import {
  ARTICLE_LIKES_SLUG_PATTERN,
  incrementArticleLike,
} from "@/lib/article-likes-db";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_000;

/**
 * Optimistic heart endpoint (plan 260929-2254): atomically +1 the like
 * count for a slug in the SQLite store. No auth (same trust model as
 * localStorage reviews — documented, forgeable by design of this demo app).
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

  try {
    const count = incrementArticleLike(slug);
    console.log("[article-like]", { at: new Date().toISOString(), slug, count });
    return Response.json({ slug, count });
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
