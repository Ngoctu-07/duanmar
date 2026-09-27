# Code Review — Cache Invalidation (2026-09-27)

Scope: plan `plans/260927-1645-stale-pricing-cache-invalidation/` diff set (fetch layer, webhook route, ISR exports, docs, tests). Adversarial + quality pass. Verified against installed next@16.3.6 / next-sanity@11.6.13 sources. Ran `npx tsx tests/unit/fetch-published-cache.test.mts` → 6/6 ok.

## Verdict: REQUEST_CHANGES

Primary path (webhook → `revalidateTag` + `revalidatePath`) is sound and belt-and-braces actually works (see Security notes). Two Major gaps: (1) the advertised "≤5 min ISR safety net" does not exist for CMS **data**, (2) one raw `client.fetch` call site survived migration, violating phase-01's own success criterion.

## Critical

None. No signature-bypass, no secret leak, no fail-open hole in the webhook gate.

## Major

1. **`src/sanity/lib/fetch-published.ts:39-41` — data cache has no time expiry; the ISR "fallback ≤5 min" is illusory.**
   `unstable_cache(read, key, { tags })` with no `revalidate` option → Next stores entry with `CACHE_ONE_YEAR_SECONDS` (`next/dist/server/web/spec-extension/unstable-cache.js` → `cacheNewResult`: `revalidate: typeof revalidate !== 'number' ? CACHE_ONE_YEAR_SECONDS : revalidate`; `validateRevalidate(undefined)` → `undefined`). Route-level `export const revalidate = 300` does **not** propagate to `unstable_cache` (unlike raw `fetch`, which inherits route revalidate via patch-fetch). So a 300 s ISR render re-reads the same ≤1-year-old cache entry → identical stale HTML.
   Why it matters: plan P3 / `docs/cms-cache-revalidation.md:14` / changelog promise "ISR fallback ≤5 phút nếu webhook lỗi"; if the webhook is missing/misconfigured/fails (and plan says user must create it manually — no write token), pricing stays stale **until redeploy** — the exact bug class being fixed. Affects webhook-only pages too (dynamic ƒ routes: search, destinations list, checkout — those have no ISR at all).
   Fix: add `revalidate: 300` (or desired bound) to `unstable_cache` options in `fetchPublished` so data entries self-expire; keep tags for instant purge. Then docs claim becomes true.

2. **`src/app/[locale]/explore/itineraries/[slug]/page.tsx:50-56` — missed raw CMS call site (untagged, not migrated).**
   `client.fetch(TOUR_PRICING_BY_SLUG_QUERY, ...)` bypasses `fetchPublished`. Phase-01 FR3 + success criterion (`grep client.fetch src | grep -v sanity/lib` → only fetch-published internals) FAIL — their grep missed it because the call is split across lines (`.fetch(` on line 51). Impact: untagged (`revalidateTag("sanity")` alone can't see it; only the `_N_T_/layout` soft tag from `revalidatePath` would, and the raw fetch likely isn't cached at all — default `no-store` on a ƒ route — so it happens to be always-fresh; but it's out-of-spec, defeats DRY, and silently rots if the page ever gains caching/`revalidate`). Fix: migrate to `fetchPublished(TOUR_PRICING_BY_SLUG_QUERY, { slug }, { tags: [`sanity:pricing:${slug}`] })`.

3. **`revalidate = 300` exports are likely inert on every CMS page (dynamic routes) — and harmless, but the comments/docs claim otherwise.**
   No `setRequestLocale` anywhere in `src/`; next-intl 4.14.7 `getTranslations`/`getLocale`/`getMessages` resolve locale via `headers()` (`node_modules/next-intl/dist/esm/production/server/react-server/RequestLocale.js`) → every CMS page opts into dynamic rendering → build shows `ƒ` (matches prompt's build output). On ƒ routes there is no FRC/ISR entry, so `export const revalidate = 300` does nothing (no error, no build failure — answer to "harmful?": harmless but inert; only side effect is inheriting `revalidate=300` for raw `fetch`). The repeated comment "ISR safety net: regenerate at most every 5 min" (`homepage:16`, `destinations/[slug]:16`, `map:16`, `itineraries:14`, `blog:6`, `news:6`, `news/[...slug]:7`) is misleading.
   Fix: fix finding #1 (that's the real bound), then either drop these exports + comments or keep with a comment stating they only apply if the route is (re)prerendered static. Note contradiction: plan/changelog claim `● SSG` for `[slug]` — re-verify with a fresh `next build` route table.

## Minor / Nits

- `src/app/api/revalidate/route.ts:9-15` — whitespace-only secret (`"  "` is truthy) reaches `parseBody`, which `secret.trim()`s → "" → all requests 401 forever with docs pointing at "secret mismatch". Validate `secret.trim()` at top and 503 if empty.
- `route.ts:43-45` — GET 405 lacks `Allow: POST` header (Next's auto-405 for unexported methods includes it; own handler doesn't).
- `route.ts:22-25` — malformed JSON (valid signature) → 401. Documented in runbook ("sai chữ ký / body hỏng") so consistent, but semantically 400; keep as-is or fix docs+code together.
- `route.ts:11-14` — 503 body `"Sanity revalidation is not configured"` discloses config state to unauthenticated callers. Low risk; fine, but plan FR2 asked for "generic" — consider genericizing.
- `fetch-published.ts:41` — `.catch(() => null)` swallows silently (no log). A GROQ typo or invariant error becomes "empty data" with zero trace. Add `console.error` before returning null (P4 behavior preserved either way).
- `fetch-published.ts:15-17` — `JSON.stringify(params)` is insertion-ordered → `{a,b}` vs `{b,a}` yield distinct entries (duplicate work, not collisions — test documents this). Next composes key via `keyParts.join(',')` (its own `@TODO` for collision-freedom); safe today because params JSON is always trailing well-formed JSON.
- `explore/destinations/page.tsx`, `search/page.tsx` lack `revalidate` while plan phase-01 listed them "if SSG-tagged" — moot given #3, but plan/changelog "6 trang" vs grep (7 files with export) — reconcile counts.
- `plans/260927-.../plan.md` still says "Status: awaiting user approval / pending approval" while code shipped + changelog entry exists. Update plan status.
- `phase-02-webhook-revalidate-route.md:52` claims "constant-time in next-sanity" — **false**: `assertValidSignature` compares recomputed header with string `!==` (non-constant-time). Doc fix.
- Sanity webhook config: `parseBody` holds the response ≥3 s (eventual-consistency wait) — runbook doesn't mention setting webhook **timeout** in Sanity Manage to comfortably exceed that (otherwise Sanity flags failed retries on every publish). Add to docs.

## Security notes

- **Gate is sound**: secret required (503 fail-closed if unset); `parseBody` returns early when signature header missing (body never read, no 3 s delay → no amplification for junk POSTs); signature verified over the **raw body bytes** that are subsequently `JSON.parse`d (no JSON-mismatch smuggling); `isValidSignature !== true` handles `null` and `false`; whitespace secret fails closed (401); errors return generic JSON; no body/secret logging (FR5 ✓). Middleware matcher `["/", "/(en|vi)/:path*"]` doesn't intercept `/api/*` (no locale redirect risk).
- **Replay (upstream next-sanity)**: signature includes `t=` but there's no freshness window check → a captured valid body+header can be replayed indefinitely, each replay costing a 3 s hold + full-site cache purge. Low likelihood (needs captured payload), impact = purge-DoS churn. Mitigation: reject `t` older than e.g. 5 min before calling `parseBody`.
- **Non-constant-time compare** (upstream, `!==` on base64 strings): practical network exploitation infeasible; note only (corrects phase-02 doc).
- **Unbounded body**: `req.text()` buffers whole body whenever *any* signature header is present; no size cap in route handlers. Rely on proxy limits or cap via `content-length` pre-check.
- **`revalidatePath("/", "layout")` purges `/studio` too** (force-static shell re-renders) — harmless, just be aware.
- **Tag injection via URL slug** (`sanity:destination:${slug}`): user-controlled slugs become tags; Next `validateTags` warns+drops over-length tags (no throw). Pollution only, no invalidation capability for attackers.

## Test integrity notes

- **Mirror vs source**: `cms-expectations.mjs:55-72 resolveTier` matches `pricing.ts:81-105 resolveTierForGuests` exactly (guards, sort, tie-break on strict `<`, distance fn incl. undefined maxGuests — mirror is defensively wider). **But** it operates on RAW doc tiers while UI runs `mapPricingTiers` first (`pricing.ts:43-71`), which **drops malformed tiers** (price ≤0/non-finite, min/max invalid, **groupTotal required**) and maps currency. Mirror also uses VND only (OK: all pricing assertions hit `/vi` URLs). If a tier fails Studio validation via API write, UI hides/reselects a tier while mirror expects a total → false test failure. Consider porting the `usable` filter into the helper.
- **`remainingOn` (`cms-expectations.mjs:83-88`) vs `mapTourCapacity` (`tour-capacity.ts:26-51`)**: mirror lacks the `≤ 999 MAX_TOUR_CAPACITY` and integer guards (UI treats >999 as "no capacity"; mirror would expect blocking → false failure), takes `find` **first** occupancy row while UI **sums** duplicate date rows, and lacks floor/negative filtering. Edge-data only, but it's a divergence.
- **Device-bookings assumption** (`h4-p4-e2e.mjs:52-55`): valid — `getBrowser` gets no `userDataDir` → fresh temp profile per file, so `mergeDeviceBookings` (booking-form.tsx:62/72) adds nothing and CMS remaining == UI remaining. Fragile: if a future profile/persistence option is added, h4 breaks; comment documents the contract — keep it. Within-file ordering is safe (h4 asserts capacity before any booking could exist; c-booking/c-payment never assert capacity after their submit).
- **`revalidate-webhook.mjs:80-86` "timing-safe sanity" check is vacuous**: it compares two independently signed strings (different `Date.now()` timestamps) with `timingSafeEqual` — always passes, tests nothing. Remove or drop the claim.
- **Unit test gap vs plan**: phase-04 required "failing query → null (fail-open preserved)" and "live query returns data" rows; `fetch-published-cache.test.mts` only exercises `sanityTags`/`sanityCacheKey` helpers — never calls `fetchPublished` (removing `.catch` or `tags:` would still go green). Plan allowed key-builder fallback for the collision row, but fail-open is untested. Either inject the client or document the deliberate skip.
- **Mechanism ≠ freshness**: webhook test proves HTTP contract only; content can't change without Studio login, and dev-server caching semantics differ from `next start` (ISR/SSG absent in dev). Runbook freshness proof should explicitly say "verify against `next build && next start`, not `npm run dev`".
- Helper reads `.env.local` + hard-requires `api.sanity.io` (offline → cryptic exception, no skip) and `expectedBreakdown(doc, n)` throws on null doc (`bd(100000).rate`) — pre-flight doc check would give a clear message.

## Docs accuracy (`docs/cms-cache-revalidation.md`)

- Status codes 405/503/401/500/200 match `route.ts` exactly ✓. HMAC format + filter `!(_id in path("drafts.**"))` + content-type ✓. `revalidateTag("sanity","max")` matches code ✓ (and `"max"` is the blessed Next-16 second arg — single-arg form would log deprecation).
- **Inaccurate**: line 14 "ISR fallback ≤5 phút" — false until Major #1 is fixed (no data revalidate option; routes likely ƒ anyway).
- Missing: webhook timeout vs 3 s wait; multi-instance caveat (below); production-build verification step; whitespace-secret pitfall.

## Unresolved questions

1. **Fresh `next build` route table** — plan/changelog claim `● SSG` for `[slug]`/homepage, but next-intl `headers()` access should mark them `ƒ` (prompt says "many routes ƒ"). Which routes actually prerender? Determines whether any `revalidate = 300` export engages at all. (Doesn't change Major #1 fix.)
2. **Deploy topology** — `tagsManifest` is a process-local `Map` (`tags-manifest.external.js:27`) and `FileSystemCache.revalidateTag` writes only that Map. On multi-replica self-hosted (pm2 cluster/containers), the webhook only purges the instance that received it; other instances keep stale HTML **and** (per Major #1) stale data indefinitely. Single `next start` is fine; Vercel handles tags centrally. Plan already flags platform unknown (Q1) — must resolve before relying on this in prod; fixes: single replica, shared cache handler, or platform-native tag propagation.
3. Sanity Manage webhook **timeout** value — must be > ~4-5 s to absorb `parseBody`'s 3 s consistency wait, else Sanity reports failures (revalidation itself still succeeded).
4. Keep or remove the `revalidate = 300` exports once `fetchPublished` gains its own `revalidate`? (Recommend: keep data-level expiry, delete misleading comments.)
