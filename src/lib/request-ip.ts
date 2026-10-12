import type { NextRequest } from "next/server";

/**
 * Client key for rate limiting: `x-real-ip` (proxy-set) wins, else the
 * rightmost `x-forwarded-for` hop (appended by the nearest trusted proxy),
 * else `local` (direct dev). Trust assumption: a spoofing client can only
 * control entries its own proxy does not append — documented in
 * `docs/ai-assistant.md`.
 */
export function resolveClientKey(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return "local";
}
