# CMS Schema Expansion: Dynamic Tour Attributes + Category Filtering — Plan

**Date**: 2026-09-28 · **Type**: Feature (CMS schema + queries + frontend + tests) · **Status**: Complete · **Progress**: 100%

## Executive Summary
Extend existing `destination` Studio type (**no new doc type**) with optional `difficultyLevel` (Easy/Medium/Hard/Extreme), boolean `isSpecialTour`, required `category` enum (`domestic`/`international`, legacy-tolerant). NEW GROQ category query feeds card grids on `/tours/domestic` + `/tours/international` (AC3 strict + decision-2 legacy fallback) with SSR pill tab nav (no tabs primitive). Conditional badges (difficulty / special) on card + detail via one shared client component — display-only, booking untouched. 1 new unit test (query contracts, no network) + 1 new browser test (data-driven via live GROQ, no fabricated CMS data) + changelog.

## Context Links
- **Reports**: `reports/plan-summary.md` · phases: `phase-01-schema-and-queries.md`, `phase-02-frontend-integration.md`, `phase-03-tests-verification-changelog.md`
- **Schema**: `src/sanity/schemaTypes/destination.ts` (70 LOC; `region` field `:21-33`, `featured` `:60-65`, `preview` `:67-69`) · register: `schemaTypes/index.ts:7-8` (4 types, NO change) · `structure.ts:4-7` (`documentTypeListItems()`, NO change) · `env.ts:10-18` asserts env at import
- **Queries**: `src/sanity/queries/destinations.ts:4-15/:17-28/:30-32/:34-42` · `queries/homepage.ts:13-22` (`FEATURED_DESTINATIONS_QUERY`) · all fetches via `fetchPublished` (`lib/fetch-published.ts:30-45`, fail-open `:44`, revalidate 300 `:43`, tags `sanityTags()` `:20-22`)
- **Call sites (constrain query params)**: `explore/destinations/page.tsx:32-40` `{region}` · `search/page.tsx:142-144` `{region:""}` · `explore/map/page.tsx:26-28` `{region:""}` · detail `[slug]/page.tsx:26-29` `{slug}` · homepage featured (homepage.ts:13)
- **Card**: `src/components/explore/destination-card.tsx` (64 LOC: interface `:9-16`, props `:18-22`, image gate `:31-41`, rating `:49`, link `:55-60`; `Card` root = `data-slot="card"`, ui/card.tsx:11) — shared: listing `explore/destinations/page.tsx:82`, homepage `homepage/featured-destinations.tsx:29`
- **Tours pages**: `src/app/[locale]/tours/domestic/page.tsx` (30 LOC, h1 `:16`) · `international/page.tsx` (23 LOC, h1 `:15`) · i18n ns `tours` (`messages/{en,vi}.json:1126`) · tab precedent `explore/events/page.tsx:51-73` (aria-current `:62`)
- **Test contracts**: `tests/browser/l-navbar.mjs:37-39` (4 nav links), `:56` (sheet), `:71-73` (200 + distinct h1 + exact tours h1) · `m-footer-brand.mjs:109-115` (footer tours) · `c-booking.mjs:176-180` (`?tour=ha-noi` → 404) · `g-reviews.mjs:154-167` (SSR `#customer-reviews`) · `unit/i18n-parity.test.ts:48-58` (783/783 today) · `unit/fetch-published-cache.test.mts:24-61` · harness copy `m-footer-brand.mjs:1-26,49-57,188-194` · CMS live-query pattern `tests/helpers/cms-expectations.mjs:12-20,27-42`
- **Rules**: `.claude/rules/development-rules.md` (KISS/YAGNI/DRY, <200 LOC, kebab-case) · `.claude/rules/documentation-management.md` (phase structure) · `docs/project-changelog.md:261` (`## 2026-09-28`, 350 LOC)

## Binding Decisions (do not re-ask)
1. **AC1 schema on `destination`** — add to existing type; NO new doc type; NO `Reference` (repo has zero — house enum = `type:"string"` + `options.list:[{title,value}]`, precedent `region` `:21-33`); NO `internationalized-array` (0 imports in src).
2. **Legacy `category`** (decision 2): domestic tab = `category == "domestic" || !defined(category)`; international = strictly `category == "international"`; user backfills in Studio at leisure. Required field ⇒ legacy docs fail Studio publish until filled — accepted.
3. **`isSpecialTour` = badge only** (card + detail) when `=== true`; `difficultyLevel` badge only when set. Display-only — booking form/checkout untouched.
4. Existing queries: EXTEND projections only, **never add params** (3 call sites pass `{region}`/`{slug}` only → a new required `$category` breaks them). Category filtering = NEW `DESTINATIONS_BY_CATEGORY_QUERY`.
5. Studio: no `structure.ts`/`index.ts` change; preview title stays `name` (string).
6. Shared card safety: new fields optional + conditional render → existing call sites compile & render byte-identical DOM when fields absent. NO edits to any existing test; NEVER touch `revalidate-webhook.mjs`.
7. h1/subtitle/body/CTA of both `/tours/*` pages unchanged (keys `tours.domestic.*`/`tours.international.*`); never `notFound()`, never identical h1.
8. Detail page keeps `CustomerReviews` server-rendered in tree (g-reviews contract); no fabricated CMS data anywhere (browser test queries live dataset itself).
9. New keys added to BOTH `en.json`+`vi.json` (parity 783 → 789); tab labels reuse `common.{domesticTours,internationalTours}` (0 new keys).
10. All fetches through `fetchPublished` (+`sanityTags`) with `tags:["sanity:destination:list"]` — never raw `client.fetch`.

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Depends on | Verification |
|---|-------|--------|----------|-----------|-----------|--------------|
| 1 | Studio schema 3 fields + new category query + extend 3 projections | Complete | 100% | [phase-01](phase-01-schema-and-queries.md) | — | `sanity schemas validate`, lint, unit |
| 2 | `/tours/*` tab nav + card grids + conditional badges (card/detail) + i18n | Complete | 100% | [phase-02](phase-02-frontend-integration.md) | P1 | lint, build `ƒ` routes, visual |
| 3 | New unit + browser tests, full pipeline, changelog, status flip | Complete | 100% | [phase-03](phase-03-tests-verification-changelog.md) | P2 | 15/15 unit, 14/15 browser |

## File Allow-List (exact)
- **Modify (10)**: `src/sanity/schemaTypes/destination.ts` · `src/sanity/queries/destinations.ts` · `src/sanity/queries/homepage.ts` · `src/components/explore/destination-card.tsx` · `src/app/[locale]/explore/destinations/[slug]/page.tsx` · `src/app/[locale]/tours/domestic/page.tsx` · `src/app/[locale]/tours/international/page.tsx` · `src/messages/en.json` (+6) · `src/messages/vi.json` (+6) · `docs/project-changelog.md` (EOF `### Added` under `## 2026-09-28` `:261`)
- **Create (6)**: `src/components/tours/tour-category-section.tsx` · `src/components/explore/tour-attribute-badges.tsx` · `tests/unit/tour-category-queries.test.mts` · `tests/browser/p-tours-category.mjs` · plan dir (this + 3 phases + `reports/plan-summary.md`)
- **Delete: 0.** NO edit: `header.tsx`, `footer.tsx`, `structure.ts`, `schemaTypes/index.ts`, `sitemap.ts`, `run-browser.mjs`, `run-unit.mjs`, any existing test, `revalidate-webhook.mjs`, booking/checkout files, `.env*`.

## Global Verification (every phase)
`npm run lint` → `npm test` (**14 files today → 15 with new unit test → expect 15/15**) → **stop dev** → `npm run build` (exit 0; route table must show `ƒ /[locale]/tours/domestic` + `ƒ /[locale]/tours/international` — `●`/`○` there = regression) → start dev `:3000` → `npm run test:browser` (**14 files today → 15 with `p-tours-category.mjs` → expect 14/15**; only pre-existing `revalidate-webhook` env failure tolerated).

## Key Risks
- **Required `category` vs legacy docs**: until backfilled, international tab = empty state (correct per decision 2); Studio publish blocked on edited legacy docs (accepted).
- **Shared `DestinationCard` blast radius** (homepage + listing under test) → optional fields + null-returning badge component; absent data ⇒ unchanged DOM.
- **`g-reviews` SSR contract**: chips added inside `.mt-8 max-w-3xl` above `CustomerReviews` (`[slug]/page.tsx:101`) — never reorder/remove it.
- **Runner counts 14→15** (both): expected 15/15 unit + 14/15 browser; do NOT edit runners.
- **`sanity schemas validate` env**: `sanity.config.ts` imports asserting `env.ts` → run with `.env.local` sourced into env (fallback documented in P1).
- **Badge wording** new i18n keys — EN/VI parity test enforces both files.

## Unresolved Questions
None blocking (scope + 3 user decisions binding). Non-blocking defaults chosen: VI badge labels `Dễ`/`Trung bình`/`Khó`/`Cực khó`/`Tour đặc biệt`; `priceRange` included on `/tours` cards (mirrors listing `page.tsx:36,42,86`) — say if either should differ.
