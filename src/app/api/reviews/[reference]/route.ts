import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/assistant/rate-limit";
import {
  deleteReview,
  getRatingAggregates,
  ReviewStoreError,
} from "@/lib/reviews-db";
import { isValidReference } from "@/lib/reviews-validation";
import { resolveClientKey } from "@/lib/request-ip";
import { readVisitor } from "@/lib/visitor";

export const runtime = "nodejs";

/**
 * DELETE /api/reviews/[reference] — owner-only, any age (only edits sit
 * behind the 3h window): 400 bad reference, 403 not owner, 404 unknown,
 * 429 over rate limit, 503 no DB. No cookie issuance (a freshly minted
 * visitor owns nothing), no PII in body or logs.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  if (!isValidReference(reference)) {
    return Response.json({ error: "Invalid reference" }, { status: 400 });
  }
  if (!checkRateLimit(`review:write:${resolveClientKey(req)}`)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const visitor = readVisitor(req);
  if (!visitor) return Response.json({ error: "Not owner" }, { status: 403 });

  try {
    const deleted = await deleteReview(reference, visitor);
    const aggregate =
      (await getRatingAggregates([deleted.tourSlug])).get(deleted.tourSlug) ?? null;
    return Response.json({ reference: deleted.reference, aggregate });
  } catch (error) {
    if (error instanceof ReviewStoreError) {
      const status = error.code === "not_found" ? 404 : 403;
      return Response.json({ error: error.message }, { status });
    }
    if (error instanceof Error && error.message === "db unavailable") {
      return Response.json({ error: "Storage unavailable" }, { status: 503 });
    }
    console.error("[review] delete failed", { reference, status: 500 });
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}

export function GET() {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "DELETE" } }
  );
}
