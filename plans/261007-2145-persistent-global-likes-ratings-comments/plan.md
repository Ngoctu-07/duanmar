# Persistent Global Likes, Ratings & Comments — Plan

**Date**: 2026-10-07 · **Type**: Refactor (device-local → global SQLite) · **Status**: Complete (2026-10-12)
**Work context**: `D:\tour` · **Reports**: `plans/reports/` · **Plans**: `plans/`

## Context Links
- Rules: `.claude/rules/development-rules.md` (YAGNI/KISS/DRY, files <200 LOC, kebab-case, no "enhanced" copies)
- Predecessor plans: `260929-2254-unify-story-routing-social-feed-hearts` (likes), `260928-0010-star-rating-and-customer-reviews`, `260928-1508-review-management`
- Existing store: `data/article-likes.db` (gitignored, table `likes(slug,count)` already on disk)
- Docs to update: `docs/project-changelog.md`, `docs/vietnam-tourism-website-framework.md`, `docs/ai-assistant.md` (only if IP helper moves)

## Goal
1. **Global persistent likes**: atomic server toggle (like/unlike) on SQLite, anonymous `vn_visitor` HttpOnly cookie voter table → `isLiked` per visitor, one shared count for all visitors, GET counts endpoint, optimistic UI reconciles with server, rate limited.
2. **Public persistent comments + star ratings**: all writes go to SQLite (same file/pattern as likes); public reads via RSC + API; booking gate kept as client input validation; 3h edit window enforced; localStorage `vn-reviews:v1` migrated into SQLite.
3. **Server-side true average**: SQL `AVG(rating)+COUNT` via shared `getRatingAggregates(slugs)` (mirrors `getArticleLikeCounts`), wired into RSC so every session renders the same number (e.g. (3+4+5)/3 = 4.0).

## Phases
| # | File | Scope | Status |
|---|------|-------|--------|
| 1 | [phase-01-foundation-sqlite-store-visitor-identity.md](phase-01-foundation-sqlite-store-visitor-identity.md) | Shared SQLite store + idempotent DDL, `vn_visitor` cookie lib, IP helper extraction | Done |
| 2 | [phase-02-global-persistent-likes.md](phase-02-global-persistent-likes.md) | `like_votes` table, atomic toggle, like routes, RSC hydration, HeartButton toggle UI | Done |
| 3 | [phase-03-reviews-ratings-server-store.md](phase-03-reviews-ratings-server-store.md) | `reviews` table, validation, GET/POST/DELETE review routes, batch aggregates | Done (delete = owner-only any age, lead decision) |
| 4 | [phase-04-client-rsc-wiring-and-migration.md](phase-04-client-rsc-wiring-and-migration.md) | Reviews components → API, badge/pages get server aggregates, localStorage migration | Done |
| 5 | [phase-05-tests.md](phase-05-tests.md) | Unit tests (new+updated) and browser test updates/new global-aggregate test | Done |
| 6 | [phase-06-docs-and-verification.md](phase-06-docs-and-verification.md) | Changelog/docs, lint/tsc/build/unit/browser verification | Done |

## Key Decisions
- **One DB file, one connection**: `src/lib/db/sqlite-store.ts` owns path resolution (`VN_INTERACTIONS_DB_PATH` ?? `ARTICLE_LIKES_DB_PATH` ?? `data/article-likes.db`), cached `DatabaseSync`, `PRAGMA busy_timeout=5000`, idempotent `CREATE TABLE IF NOT EXISTS`, degrade-to-null on read-only FS (keeps existing 503/empty-map pattern).
- **Identity**: cookie `vn_visitor` = UUID v4, `HttpOnly`, `SameSite=Lax`, `Secure` in prod, `path=/`, `maxAge=1y`. Issued **only from route handlers** via `NextResponse.json(...).cookies.set(...)`; read in RSC with `cookies()`. `src/middleware.ts` untouched (next-intl matcher excludes `/api`, chaining risk documented in phase-01).
- **Freshness**: SQLite reads in RSC are uncached; pages stay dynamic (verified: `.next/prerender-manifest.json` has 4 routes — blog/destination already dynamic). No SWR/React Query — plain `fetch` + existing `vn-reviews:changed` event.
- **Ownership**: UI ownership stays device bookings (`isMyReview`); server stores `visitor` and enforces it on edit/delete. Booking gate stays client input validation (bookings are not server-verifiable).
- **Rate limit**: reuse `checkRateLimit` with distinct key prefixes; IP resolution extracted to `src/lib/request-ip.ts` (DRY with assistant route).

## Order / Dependencies
01 → 02 → 03 → 04 → 05 → 06. Phases 02/03 are independent of each other after 01; 04 needs 02+03; 05 runs against 02-04; 06 last.

## Next Steps
Start `phase-01-foundation-sqlite-store-visitor-identity.md`.
