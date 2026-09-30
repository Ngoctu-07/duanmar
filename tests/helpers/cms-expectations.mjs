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

/** Raw GROQ over the configured dataset (env-driven, same precedence as the UI). */
async function sanityQuery(query, params = {}) {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing (process env / .env.local)");
  }
  const search = `?query=${encodeURIComponent(query)}` + Object.entries(params)
    .map(([key, value]) => `&${encodeURIComponent(`$${key}`)}=${encodeURIComponent(JSON.stringify(value))}`)
    .join("");
  const url = `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}${search}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const json = await res.json();
  return json.result ?? null;
}

/**
 * Published tourPricing doc (tiers + global maxCapacity) for a tour slug.
 * No per-date ledger lives in the CMS anymore — booked guests come from the
 * device's confirmed bookings (see remainingOn).
 */
export async function fetchTourPricing(tourSlug = "hcm") {
  return sanityQuery(
    '*[_type == "tourPricing" && tourSlug == $slug] | order(_updatedAt desc, _id asc)[0]{tiers, maxCapacity}',
    { slug: tourSlug }
  );
}

/**
 * Deterministically resolves a tour slug that BOTH (a) has a published
 * tourPricing doc with at least one tier and (b) maps to a published
 * destination page. Intersection uses exact string equality — no trim — so it
 * mirrors the app's exact-slug pricing lookup and rejects malformed slugs
 * (e.g. a trailing-space tourSlug that the detail page can never render).
 *
 * Never hardcode a slug: CMS reseeds silently invalidate hardcoded fixtures.
 * Returns `{ slug, doc }` or `null` when no tour satisfies both conditions.
 */
export async function resolveTourPricingFixture() {
  const [pricing, destinations] = await Promise.all([
    sanityQuery('*[_type == "tourPricing" && count(tiers) > 0] | order(_updatedAt desc, _id asc){tourSlug, tiers, maxCapacity}'),
    sanityQuery('*[_type == "destination" && defined(slug.current)]{ "slug": slug.current }'),
  ]);
  const pages = new Set((destinations ?? []).map((d) => d?.slug).filter((s) => typeof s === "string"));
  const candidates = (pricing ?? [])
    .filter((doc) => typeof doc?.tourSlug === "string" && pages.has(doc.tourSlug))
    .sort((a, b) => a.tourSlug.localeCompare(b.tourSlug));
  const first = candidates[0];
  return first ? { slug: first.tourSlug, doc: first } : null;
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
