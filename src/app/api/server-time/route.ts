export const runtime = "nodejs";
// Never prerender: a build-frozen timestamp would mark every review expired.
export const dynamic = "force-dynamic";

/** Current server UTC instant — the authority for the review edit window. */
export async function GET() {
  return Response.json({ time: new Date().toISOString() });
}
