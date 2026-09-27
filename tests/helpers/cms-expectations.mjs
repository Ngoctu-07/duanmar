/**
 * Live CMS expectations: read the published tourPricing doc straight from
 * Content Lake so browser tests assert "UI == published source of truth"
 * instead of hardcoding fixture values that break whenever the CMS changes.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

/**
 * Published tourPricing doc (tiers + global maxCapacity) for a tour slug.
 * No per-date ledger lives in the CMS anymore — booked guests come from the
 * device's confirmed bookings (see remainingOn).
 */
export async function fetchTourPricing(tourSlug = "hcm") {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing (process env / .env.local)");
  }
  const query =
    '*[_type == "tourPricing" && tourSlug == $slug] | order(_updatedAt desc, _id asc)[0]{tiers, maxCapacity}';
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}` +
    `?query=${encodeURIComponent(query)}&${encodeURIComponent("$slug")}=${encodeURIComponent(JSON.stringify(tourSlug))}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const json = await res.json();
  return json.result ?? null;
}

/** vi-VN integer + currency mark, matching the UI's normalized rendering. */
export const fmtVnd = (n) => `${n.toLocaleString("vi-VN")} ₫`;

function tierDistance(guests, tier) {
  if (guests < tier.minGuests) return tier.minGuests - guests;
  if (tier.maxGuests !== null && tier.maxGuests !== undefined && guests > tier.maxGuests)
    return guests - tier.maxGuests;
  return 0;
}

/**
 * Mirrors src/lib/pricing.ts resolveTierForGuests: exact tier first, else the
 * nearest tier across gaps. Kept in sync manually — a failure here usually
 * means the clamp logic changed.
 */
export function resolveTier(tiers, guests) {
  if (!Number.isInteger(guests) || guests < 1 || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.minGuests - b.minGuests);
  const exact = sorted.find(
    (t) => guests >= t.minGuests && (t.maxGuests === null || t.maxGuests === undefined || guests <= t.maxGuests)
  );
  if (exact) return exact;
  let nearest = sorted[0];
  let best = tierDistance(guests, nearest);
  for (const tier of sorted.slice(1)) {
    const d = tierDistance(guests, tier);
    if (d < best) {
      nearest = tier;
      best = d;
    }
  }
  return nearest;
}

/** Expected UI breakdown for a guest count: { rate, total, rateText, totalText }. */
export function expectedBreakdown(doc, guests) {
  const tier = resolveTier(doc?.tiers ?? [], guests);
  if (!tier) return null;
  const rate = tier.pricePerGuestVnd;
  return { rate, total: rate * guests, rateText: fmtVnd(rate), totalText: fmtVnd(rate * guests) };
}

/**
 * Remaining seats for an ISO date under the single-ledger model:
 * `published maxCapacity − Σ guests of successful device bookings`
 * (`bookedByDate`), or null when the CMS has no usable maxCapacity (P4).
 * Mirrors src/lib/tour-capacity.ts remainingSlots.
 */
export function remainingOn(doc, iso, bookedByDate = {}) {
  const cap = doc?.maxCapacity;
  if (typeof cap !== "number" || !Number.isFinite(cap) || cap <= 0) return null;
  return Math.max(0, cap - (bookedByDate[iso] ?? 0));
}
