import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { PayloadTooLargeError, readBodyTextCapped } from "@/lib/assistant/body-limit";
import { checkRateLimit } from "@/lib/assistant/rate-limit";
import {
  getRatingAggregates,
  listReviewsForSlug,
  upsertReview,
  ReviewStoreError,
  type PublicReview,
  type RatingAggregate,
} from "@/lib/reviews-db";
import { revalidateReviewSurfaces } from "@/lib/reviews-revalidate";
import {
  isValidTourSlug,
  ReviewValidationError,
  validateReviewPayload,
} from "@/lib/reviews-validation";
import { resolveClientKey } from "@/lib/request-ip";
import {
  issueVisitor,
  newVisitorId,
  readVisitor,
  VISITOR_COOKIE,
  visitorCookieOptions,
} from "@/lib/visitor";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_500_000;
const WRITE_RATE_KEY = "review:write:";

function errorJson(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isDbUnavailable(error: unknown): boolean {
  return error instanceof Error && error.message === "db unavailable";
}

/** GET /api/reviews?slug= — list + AVG/COUNT aggregate, `owned` per viewer, Set-Cookie when absent. */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!isValidTourSlug(slug)) return errorJson("Invalid slug", 400);

  const visitor = readVisitor(req);
  const viewer = await currentUser();
  let reviews: PublicReview[];
  try {
    reviews = await listReviewsForSlug(slug, visitor, viewer?.id ?? null);
  } catch (error) {
    if (isDbUnavailable(error)) return errorJson("Storage unavailable", 503);
    console.error("[review] list failed", { slug, status: 500 });
    return errorJson("Reviews unavailable", 500);
  }

  const aggregate = (await getRatingAggregates([slug])).get(slug) ?? null;
  const response = NextResponse.json(
    { reviews, aggregate },
    { headers: { "Cache-Control": "no-store" } }
  );
  issueVisitor(response, visitor);
  return response;
}

/** POST /api/reviews — create or owner+window edit (upsert by reference) → 201. */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return errorJson("Unsupported media type", 415);
  }
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return errorJson("Payload too large", 413);
  if (!checkRateLimit(`${WRITE_RATE_KEY}${resolveClientKey(req)}`)) {
    return errorJson("Too many requests", 429);
  }

  let text: string;
  try {
    text = await readBodyTextCapped(req.body, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return errorJson("Payload too large", 413);
    return errorJson("Invalid body", 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return errorJson("Invalid JSON", 400);
  }

  const nowIso = new Date().toISOString();
  const currentVisitor = readVisitor(req);
  const visitor = currentVisitor ?? newVisitorId();
  const viewer = await currentUser();

  let review: PublicReview;
  let aggregate: RatingAggregate | null;
  try {
    review = await upsertReview(
      validateReviewPayload(body, nowIso),
      visitor,
      nowIso,
      viewer?.id ?? null
    );
    aggregate = (await getRatingAggregates([review.tourSlug])).get(review.tourSlug) ?? null;
  } catch (error) {
    if (error instanceof ReviewValidationError) return errorJson(error.message, 400);
    if (error instanceof ReviewStoreError) {
      return errorJson(error.message, error.code === "not_owner" ? 403 : 409);
    }
    if (isDbUnavailable(error)) return errorJson("Storage unavailable", 503);
    console.error("[review] write failed", { status: 500 });
    return errorJson("Review failed", 500);
  }

  revalidateReviewSurfaces(review.tourSlug);
  const response = NextResponse.json({ review, aggregate }, { status: 201 });
  if (!currentVisitor) response.cookies.set(VISITOR_COOKIE, visitor, visitorCookieOptions());
  return response;
}
