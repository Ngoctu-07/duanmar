# Plan: Fix Stale Pricing Data & Cache Invalidation (Sanity → Web)

- Created: 2026-09-27 16:45 (bugfix workflow: scout → root cause → plan → **approval required**)
- Status: **done** (approved 2026-09-27, all 4 phases + review fixes)
- Reported at: `http://localhost:3000/en/explore/destinations/hcm` — Studio publish never reaches web UI.

## Root cause (3 layered defects)

1. **Build-time frozen pages (primary — "needs manual redeploy")**
   `src/app/[locale]/explore/destinations/[slug]/page.tsx` uses `generateStaticParams()` (line 28) with **no `revalidate`, no cache tags** → prerendered at `next build` (build output: `● SSG`) and served byte-identical forever. Pricing doc fetched inside that render (`TOUR_PRICING_BY_SLUG_QUERY`, line ~49) is baked into HTML. Same class: homepage (`src/app/[locale]/page.tsx` fetches `ALL_TOUR_PRICING_QUERY`).
2. **Sanity CDN layer**
   `src/sanity/lib/client.ts:9` → `useCdn: true`. Reads hit `cdn.sanity.io` edge cache (stale up to CDN TTL) even on dynamic routes/dev. The code comment itself warns: "Set to false if statically generating pages, using ISR or tag-based revalidation".
3. **No invalidation path at all**
   `grep revalidate|revalidateTag|revalidatePath|tags:` in `src/` → 0 hits (only `force-static` on `/studio`). No webhook route (`src/app/api/` has only `draft-mode`). ~15 fetch call sites, none tagged → nothing can refresh on publish.

## Decisions (approved 2026-09-27: P1 yes, P3 yes, full plan)

| # | Decision | Outcome |
|---|----------|---------|
| P1 | Sanity CDN reads | ✅ `useCdn: false` (origin reads) |
| P2 | Invalidation breadth | ✅ fetch tags `["sanity", ...entity tags]` + route `revalidateTag("sanity","max")` **and** `revalidatePath("/", "layout")` |
| P3 | Webhook-miss fallback | ✅ — implemented as **data-level** `unstable_cache({ revalidate: 300 })` + route ISR `revalidate = 300` on the only SSG CMS page (`[slug]`); review发现 route-level exports are inert on dynamic routes (next-intl reads headers) → removed from 6 dynamic pages |

## Phases

| # | Phase | File | Status |
|---|-------|------|--------|
| 1 | Fetch layer: cache tags + `useCdn:false` + DRY migration of raw `client.fetch` sites | `phase-01-fetch-layer-and-cache-tags.md` | **done** |
| 2 | `POST /api/revalidate` webhook route (HMAC via `next-sanity/webhook`) | `phase-02-webhook-revalidate-route.md` | **done** |
| 3 | Setup docs + env template (`SANITY_REVALIDATE_SECRET`, Studio webhook steps) | `phase-03-webhook-setup-and-docs.md` | **done** |
| 4 | Tests (route security/freshness + full regression) + code review + changelog | `phase-04-tests-review-docs.md` | **done** |

## Test results (2026-09-27)

- `npm test` → **11/11** (new `fetch-published-cache.test.mts` 6/6)
- `npm run test:browser` → **7/7** (new `revalidate-webhook.mjs` 10/10 checks: 405/401×4/200 valid-HMAC/page 200 after revalidate)
- `npx tsc --noEmit` 0 · `npx eslint . --max-warnings=0` 0 · `npx next build` exit 0 (`[slug]` ● SSG, `/api/revalidate` ƒ)
- **Freshness proof (real publish)**: user published at 09:36Z (tiers 2–4@150k / 5–8@100k, `maxCapacity=10`, occupancy 2026-09-29 booked 7) → UI now shows new data live (was frozen). 3 tests hardcoded old fixture → rewrote to **CMS-derived** expectations (`tests/helpers/cms-expectations.mjs`) asserting "UI == published source of truth".
- Review: `plans/reports/code-review-cache-invalidation-20260927.md` — REQUEST_CHANGES (0 Critical, 3 Major) → **all 3 fixed**: `revalidate: 300` on cache · missed raw fetch `explore/itineraries/[slug]` migrated · inert `revalidate=300` exports removed from dynamic pages. Re-run all gates green.

## Key constraints

- **No Sanity write token, Studio not logged in** → we ship code + instructions; **user creates the webhook** in Sanity Manage (phase 3).
- Webhook secret env var: `SANITY_REVALIDATE_SECRET` (added to `.env.example` only; user sets real value — `.env.local` is off-limits).
- Keep fail-open behavior: failed fetch still → `null` (no page crash), P4 unchanged.
- Rule: await approval before touching code.

## Unresolved questions

1. Production deploy platform unknown — webhook URL needs the public origin (`https://<domain>/api/revalidate`); localhost webhook only testable via curl.
2. **User chưa tạo webhook** ở Sanity Manage (chưa có Studio/Manage access trong session) → tới trước lúc tạo, site vẫn chỉ nhờ fallback 300 s; cần làm theo `docs/cms-cache-revalidation.md`.
3. `SANITY_REVALIDATE_SECRET` đang set cho dev server qua shell (giá trị test ở `/tmp/vn-revalidate-secret.txt`) — user cần tự đặt secret thật trong `.env.local` + webhook (không commit).
