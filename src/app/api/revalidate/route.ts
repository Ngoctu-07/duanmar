import { revalidatePath, revalidateTag } from "next/cache";
import { parseBody } from "next-sanity/webhook";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Sanity publish webhook: verify HMAC signature, then purge all CMS-backed caches. */
export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    return Response.json(
      { revalidated: false, error: "Sanity revalidation is not configured" },
      { status: 503 }
    );
  }

  // parseBody verifies `sanity-webhook-signature` (HMAC-SHA256) and waits for
  // Content Lake eventual consistency so the refetch sees the published doc.
  let isValidSignature: boolean | null = null;
  try {
    ({ isValidSignature } = await parseBody(req, secret));
  } catch {
    // Malformed body/JSON — treat like a bad signature.
    return Response.json({ revalidated: false }, { status: 401 });
  }
  if (isValidSignature !== true) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  try {
    // "max" = expire immediately (Next 16 profile arg). Global tag covers every
    // fetchPublished entry; path purge covers any untagged static HTML.
    revalidateTag("sanity", "max");
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("[revalidate] cache purge failed", error);
    return Response.json({ revalidated: false }, { status: 500 });
  }

  return Response.json({ revalidated: true, time: new Date().toISOString() });
}

export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
