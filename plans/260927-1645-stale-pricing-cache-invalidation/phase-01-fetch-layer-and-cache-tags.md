# Phase 01 — Fetch layer: cache tags, origin reads, DRY migration

Context: `plan.md` root cause 1–3. Reports: `plans/reports/` (n/a — scout done inline).
Priority: P0 · Status: **done** (approved 2026-09-27)

## Overview

Make every CMS read taggable/invalidatable and always origin-fresh, then migrate raw
`client.fetch(...)` call sites onto the one tagged entry point.

## Key insights

- `next-sanity@11` only re-exports `@sanity/client` — its `fetch` does **not** accept
  Next `next: { tags }` options (verified in `node_modules/next-sanity/dist/index.d.ts`).
  → tags must come from **`unstable_cache()`** (`next/cache`, present in next@16.3.6).
- `revalidateTag` purges `unstable_cache` entries by tag and re-renders routes that used them,
  including build-time SSG pages — this unfreezes `[slug]` without a redeploy.
- `parseBody` from `next-sanity/webhook` waits for Content Lake eventual consistency →
  webhook-triggered refetch won't read pre-publish data.
- Fail-open must be preserved: `.catch(() => null)` stays (cache layer under it).

## Requirements

- FR1: `useCdn: false` in `src/sanity/lib/client.ts`.
- FR2: `fetchPublished(query, params, { tags? })` → `unstable_cache` wrapper, key includes
  query + JSON params (collision-safe), `tags: ["sanity", ...extra]`, `throwOnError`-free,
  still `.catch(() => null)`.
- FR3: migrate raw call sites to `fetchPublished` (they all already pass
  `{ perspective: "published", stega: false }` — identical semantics).
- FR4: entity tags where a slug is known: `sanity:destination:<slug>`, `sanity:pricing:<slug>`
  (extra arg), plus global `sanity` on everything.
- FR5: no behavior change for empty/null docs (P4).

## Related code files

Modify:
- `src/sanity/lib/client.ts` (useCdn false)
- `src/sanity/lib/fetch-published.ts` (unstable_cache + tags param)
- `src/app/[locale]/explore/destinations/page.tsx` (1 raw fetch)
- `src/app/[locale]/explore/destinations/[slug]/page.tsx` (3 raw: getDestination, generateStaticParams, pricing)
- `src/app/[locale]/page.tsx` (2 raw: HOMEPAGE, FEATURED)
- `src/app/[locale]/explore/map/page.tsx` (1), `src/app/[locale]/search/page.tsx` (1)
- `src/lib/news-content-provider.ts` (2)
- CMS pages (P3): add `export const revalidate = 300` to homepage, destinations list,
  `[slug]` detail, itineraries, map, search if SSG-tagged.

## Implementation steps

1. `client.ts`: `useCdn: false`.
2. `fetchPublished`: accept `options?: { tags?: string[] }`; wrap `client.fetch` in
   `unstable_cache(fn, ["sanity", query, JSON.stringify(params)], { tags: ["sanity", ...] })`;
   keep `.catch(() => null)`.
3. Replace each raw `client.fetch(Q, p, { perspective: "published", stega: false })` with
   `fetchPublished(Q, p, { tags: [...] })` (slug-aware tags where available).
4. (If P3) add `export const revalidate = 300` to the CMS-backed pages listed above.
5. Run `npx tsc --noEmit`, `npx eslint . --max-warnings=0`.

## Success criteria

- `grep -rn "client.fetch" src | grep -v sanity/lib` → only `fetchPublished` internals.
- `grep -rn "useCdn" src` → `false`.
- tsc/lint exit 0; `npm test` 10/10 still green.

## Risks

- `unstable_cache` JSON-serializes results (plain data only — GROQ returns plain objects ✓).
- Origin reads raise Sanity request volume (fine at this scale; note in docs).
- Double-caching (unstable_cache + SSG): acceptable — both cleared by phase 2.
