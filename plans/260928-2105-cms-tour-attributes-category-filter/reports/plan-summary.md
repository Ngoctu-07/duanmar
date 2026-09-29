# Plan Summary — CMS Schema Expansion: Dynamic Tour Attributes + Category Filtering

**Date**: 2026-09-28 · **Plan**: `plans/260928-2105-cms-tour-attributes-category-filter/` · **Status**: Complete (100%)

## Scope
`CMS Schema Expansion for Dynamic Tour Attributes & Category Filtering` — extend existing `destination` Studio type (no new doc type): optional `difficultyLevel` enum, boolean `isSpecialTour`, required `category` enum (domestic/international, legacy-tolerant). New category query powers card grids on `/tours/domestic` + `/tours/international` (AC3 strict + decision-2 fallback), SSR pill tab nav, conditional badges (card + detail, display-only — booking untouched). 1 new unit test + 1 data-driven browser test + changelog. No existing-test edits, no new deps, no fabricated CMS data.

## Phases
| # | Phase | Deliverable | Status |
|---|-------|-------------|--------|
| 1 | `phase-01-schema-and-queries.md` | AC1: 3 fields on `destination.ts` (enum/boolean/required enum, house patterns). P2: NEW `DESTINATIONS_BY_CATEGORY_QUERY` (`$category` ternary strict/tolerant, `order(name asc)`) + extend projections of `DESTINATIONS_QUERY` / `DESTINATION_BY_SLUG_QUERY` / `FEATURED_DESTINATIONS_QUERY` with `difficultyLevel`,`isSpecialTour` (NO new params → 3 `{region}`/`{slug}` call sites safe). Verify `sanity schemas validate`. | **Complete 100%** |
| 2 | `phase-02-frontend-integration.md` | NEW `tour-category-section.tsx` (pills `aria-current="page"` + fetch + grid + `tours.empty`) feeding both `/tours/*` pages (h1/subtitle/body/CTA verbatim) · NEW `tour-attribute-badges.tsx` (client, null-gated) in `destination-card.tsx` + detail chip row · +6 i18n keys ×2 files (783→789). | **Complete 100%** |
| 3 | `phase-03-tests-verification-changelog.md` | NEW `tests/unit/tour-category-queries.test.mts` (~15 contract checks) + `tests/browser/p-tours-category.mjs` (~17 checks: exact h1 VI/EN, pills, live-GROQ slug-set equality, no-leak, empty-state, conditional badges, detail SSR `#customer-reviews`, screenshots ×2, 0 pageerrors) · full pipeline · changelog EOF · status flips. | **Complete 100%** |

## Binding decisions (do not re-ask)
- **User #1**: extend `destination` — no new doc type. **User #2**: legacy docs (no `category`) → domestic tab includes them (`!defined(category)`), international strictly `category=="international"`; user backfills in Studio at leisure. **User #3**: `isSpecialTour`/`difficultyLevel` = badge only (card + detail), display-only.
- House patterns: string+`options.list` enum (no Reference, no internationalized-array); required = `rule.required()`; `initialValue` on boolean/category. Preview title stays `name`.
- Existing queries: extend projections ONLY — never add params (call sites `explore/destinations/page.tsx:32-40`, `search/page.tsx:142-144`, `explore/map/page.tsx:26-28` pass `{region}` only).
- All fetches via `fetchPublished` + `sanityTags` (`tags:["sanity:destination:list"]` / `["sanity:pricing:all"]`); raw `client.fetch` forbidden.
- Shared `DestinationCard`: optional fields + null-rendering badge comp ⇒ listing/homepage DOM unchanged when data absent; `CustomerReviews` stays server-rendered on detail.
- 0 edits to existing tests / runners / `revalidate-webhook.mjs`; no fabricated CMS data (browser test queries live dataset itself, pattern `cms-expectations.mjs:12-20,27-42`).

## Deviations from proposed shape (flagged)
1. **Shared badge component** `src/components/explore/tour-attribute-badges.tsx` (client, `useTranslations`, precedent `tour-rating-badge.tsx`) rendered by BOTH card and detail — instead of duplicating chip markup at 2 sites (DRY). Card stays a sync server component (no `async` conversion).
2. **Drop `category` from query projections** (YAGNI): page context implies category; GROQ filter uses the field directly; tests read live dataset. Only `difficultyLevel` + `isSpecialTour` projected.
3. **Grid classes** copied from listing precedent `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` (`explore/destinations/page.tsx:80`) instead of proposed `sm:grid-cols-2` (visual parity).
4. **`priceRange` included** on `/tours` cards (cheap mirror of listing `:36,42,86`) — optional prop, skipped only if it balloons the component.
5. **`aria-current="page"`** (correct for current-page link) vs events precedent value `"true"` (`events/page.tsx:62`); no test constrains the value.
6. **`sanity schemas validate`** may hit `env.ts:10-18` assert at config import → documented fallback: source `.env.local` before running.

## Risks
- Required `category` blocks Studio publish of edited legacy docs (user-accepted) until backfill; international tab = empty state meanwhile (correct).
- Card shared with tested surfaces (homepage/listing) → null-gated badges keep DOM byte-identical absent data; suite is the guard.
- Detail SSR contract `#customer-reviews` (`g-reviews.mjs:154-167`) → chips inserted above `CustomerReviews` only, never reorder/remove.
- Runner counts change 14→15 both suites → expected **15/15 unit** + **14/15 browser** (sole fail `revalidate-webhook`, env pre-existing).
- Cache: query-string changes create fresh `unstable_cache` entries (≤300s TTL, tags unchanged → webhook still validates).
- l-navbar contract: h1/subtitle untouched, new `<nav>` lives in `<main>` (not `header`) → 4-nav-links + distinct-h1 checks safe.

## Verification gates
`npm run lint` (0) → `npm test` (**15/15**) → stop dev → `npm run build` (0; `ƒ /[locale]/tours/domestic` + `ƒ /[locale]/tours/international`) → start dev → `npm run test:browser` (**14/15**) · plus `node_modules/.bin/sanity schemas validate` (0 errors) and parity **789/789**.

## Docs impact
minor — `docs/project-changelog.md` EOF `### Added` (VN bullets, `Verified:`, `Docs impact: minor`) + plan status flips + this summary.

## Open Questions
1. VI badge wording defaults: `Dễ`/`Trung bình`/`Khó`/`Cực khó`, special = `Tour đặc biệt` (EN: Easy/Medium/Hard/Extreme, "Special tour") — confirm or adjust before P2.
2. `priceRange` on `/tours` cards: include (planned, mirrors listing) vs omit (cards render without price) — default = include.
3. `category` intentionally NOT projected (deviation #2) — confirm no downstream need to render/filter client-side.

## Actual results (post-implementation)
- **P1**: `destination.ts` +3 fields (105 LOC) after `region` — `difficultyLevel` enum optional, `isSpecialTour` boolean `initialValue:false`, `category` required enum bilingual titles `initialValue:"domestic"` · `sanity schemas validate` **0 errors / 0 warnings**.
- **P1 deviation (deviation #7)**: GROQ has **no ternary `?:` operator** — original `$category == "intl" ? … : …` failed live with `400 queryParseError` (caught in smoke, not by unit substring checks). Replaced with boolean logic `($category=="international" && category=="international") || ($category!="international" && (!defined(category) || category=="domestic"))` — semantics identical to decision 2; unit checks #3/#4 still pass as substrings. Live proof: domestic → `["hcm","hcmc","nyc"]`, international → `[]`.
- **P1**: projections extended on `DESTINATIONS_QUERY` / `DESTINATION_BY_SLUG_QUERY` / `FEATURED_DESTINATIONS_QUERY` (+`difficultyLevel,isSpecialTour`, no new params) — 3 `{region}` call sites + `{slug}` detail compile & render unchanged (listing/search/map/detail smoke 200).
- **P2**: created `tour-category-section.tsx` (93 LOC) + `tour-attribute-badges.tsx` (44 LOC); patched `destination-card.tsx` (interface +2 optional, badge in region row), detail chip row (before `BookTicketButton`, `CustomerReviews` untouched), both `/tours/*` pages (h1/subtitle/body/CTA verbatim + `<TourCategorySection>`); i18n +6 ×2 → parity **789/789**.
- **P3 gates (actual)**: `npm run lint` **exit 0 (0 warnings)** · `npm test` **15/15 files** (new `tour-category-queries.test.mts` 15/15 assertions) · `npm run build` **exit 0**, route table `ƒ /[locale]/tours/domestic` + `ƒ /[locale]/tours/international` (no `●`/`○`) · `npm run test:browser` **14/15** (15 files; sole fail `revalidate-webhook.mjs` = missing `SANITY_REVALIDATE_SECRET`, pre-existing, untouched) — new `p-tours-category.mjs` **21/21 checks** standalone + in suite; regression: `l-navbar`/`g-reviews`/`m-footer-brand` all green, 0 edits to existing tests.
- **Evidence**: `tests/.output/p-tours-01-domestic.png`, `tests/.output/p-tours-02-international.png` · changelog EOF `### Added` (`docs/project-changelog.md:352-360`, ends `Docs impact: minor`).
- **Backfill note for user**: dataset has 3 docs, all `category` absent (→ domestic tab, as designed) and 0 flagged attributes → badge/empty branches exercised in fallback mode; international tab shows empty-state until Studio backfill.
- **Code review** (adversarial, post-pipeline): DONE_WITH_CONCERNS, **0 blockers / 0 majors** — contracts, params, fetchPublished, security, allow-list, i18n all clean. Test-integrity findings fixed in-session: P1/P2 now assert real `resp.status()` (was unconditional `true`); unit suite +check #16 no-ternary/balanced-paren (would have caught deviation #7 at unit time); P18 added — detail chip row badge presence/absence must match live CMS data; dead-code fallback in `labelsOfTarget` → throws. Accepted-without-change: P10/P12 set-equality is vacuous until `category` backfill (all docs legacy) — **P11 international empty-expectation is the real no-filter guard**; `hcm` slug pinned by `g-reviews` contract (`TOUR_URL`); `"use client"` badge island = spec-approved precedent (`tour-rating-badge`); hardcoded EN `aria-label` = existing precedent (`explore/events`). Re-verified after fixes: lint 0 · unit **15/15** (16 assertions/file) · browser **14/15** (new test 22/22) — unchanged.
- **Final counts**: unit new file 16 assertions; browser new file 22 checks; parity 789/789; runner counts 15 files both suites (runners untouched).
