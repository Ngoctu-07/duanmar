# Refactor Tour Filtering Logic — Homepage Features & Category Segregation — Plan

**Date**: 2026-09-29 · **Type**: Refactor (schema + GROQ + tab shell + tests) · **Status**: In Progress · **Progress**: 80%

## Executive Summary
Rename CMS boolean `featured` → `isFeatured` (with data migration), make category GROQ strictly `category == $category` (drop legacy tolerance), move pill tabs into a shared `/tours` layout for seamless tab switching, and rewrite tests to lock the strict contract. Homepage keeps strict `== true` on the renamed field.

## Context Links
- Prior plan: `plans/260928-2105-cms-tour-attributes-category-filter/` (Complete — introduced `category`/`isSpecialTour`, tolerant filter)
- Schema: `src/sanity/schemaTypes/destination.ts:42-55` (`category`), `:82-87` (`featured`)
- Queries: `src/sanity/queries/homepage.ts:14` (`featured == true`) · `src/sanity/queries/destinations.ts:32-47` (tolerant domestic)
- Fetch: `src/sanity/lib/fetch-published.ts` (`unstable_cache`, key = query+params, tags, revalidate 300, fail-open → null)
- UI: `src/components/tours/tour-category-section.tsx:14-21,52-73` (TABS + SSR nav) · pages `src/app/[locale]/tours/{domestic,international}/page.tsx`
- Homepage: `src/app/[locale]/page.tsx:22-34` → `homepage/featured-destinations.tsx` (pure presentational)
- Tests: `tests/unit/tour-category-queries.test.mts` (#4 tolerant-domestic lock) · `tests/browser/p-tours-category.mjs:46` (`isDomestic` null-tolerant)
- Rules: `.claude/rules/development-rules.md` (KISS/YAGNI/DRY, <200 LOC) · `docs/project-changelog.md`

## Binding Decisions (do not re-ask — user answered 2026-09-29)
1. **Rename** `featured` → `isFeatured` in schema + GROQ **and ship a migration script** that copies `featured` → `isFeatured` (idempotent, dry-run default).
2. **Strict** `category == $category` for BOTH tabs + **backfill script** (same script) setting `category` on docs missing it (default `domestic`, per-slug override for e.g. `nyc=international`).
3. **Update tests** to the strict contract AND add homepage featured-strictness checks.
4. **Shared layout** `src/app/[locale]/tours/layout.tsx` hosting persistent pill tabs (client, `usePathname`) + `loading.tsx`.

## Key Insights
- GROQ has **no ternary** (prior plan deviation #7) — strict filter collapses to one line: `*[_type == "destination" && category == $category]` (param is always `domestic|international`), removing the whole asymmetric branch logic.
- Only 2 occurrences of `featured` repo-wide (schema + homepage query) → rename blast radius is small.
- Live dataset: 3 destination docs, **all missing `category`**, none featured → until backfill runs, domestic tab = empty-state and homepage featured = empty (tests still pass: browser test derives expected sets from live data).
- Tab persistence requires layout-level component → nav moves ABOVE page h1 (App Router layouts cannot inject between page content). No test asserts nav/h1 order.
- Query-string change creates fresh `unstable_cache` entries; tags unchanged → webhook purge unaffected.

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Verification (actual) |
|---|-------|--------|----------|-----------|------------------------|
| 1 | Schema rename/validation + strict queries + migration script + unit test rewrite | Complete | 100% | [phase-01](phase-01-schema-queries-migration.md) | lint 0 · unit 16/16 · dry-run exit 0 (3 docs) · `sanity schemas validate` 0 errors |
| 2 | Shared `/tours` layout + client tabs + loading + section cleanup | Complete | 100% | [phase-02](phase-02-tours-layout-tabs.md) | lint 0 · unit 16/16 · build exit 0 (`ƒ` both routes) · smoke: 1 nav/page, correct `aria-current`, empty-state pre-backfill |
| 3 | Browser test rewrite (strict + homepage featured) + full pipeline + backfill run + changelog | In Progress | 80% | [phase-03](phase-03-tests-verification-changelog.md) | `p-tours` standalone **27/27** · full browser **16/17** (sole fail = pre-existing `revalidate-webhook` env) · backfill + changelog pending |

## File Allow-List (exact)
- **Modify (10)**: `src/sanity/schemaTypes/destination.ts` · `src/sanity/queries/homepage.ts` · `src/sanity/queries/destinations.ts` · `src/components/tours/tour-category-section.tsx` · `src/app/[locale]/tours/domestic/page.tsx` · `src/app/[locale]/tours/international/page.tsx` · `package.json` (+1 script) · `tests/unit/tour-category-queries.test.mts` · `tests/browser/p-tours-category.mjs` · `docs/project-changelog.md`
- **Create (4)**: `scripts/backfill-tour-filter-fields.mjs` · `src/app/[locale]/tours/layout.tsx` · `src/components/tours/tour-category-tabs.tsx` · `src/app/[locale]/tours/loading.tsx`
- **Delete: 0.** NO edit: `header.tsx`, `footer.tsx`, `structure.ts`, `schemaTypes/index.ts`, `fetch-published.ts`, other queries, other tests, runners, `.env*`, booking files.

## Global Verification (every phase)
`npm run lint` → `npm test` (**15/15 files**) → stop dev → `npm run build` (exit 0; `ƒ /[locale]/tours/domestic` + `ƒ /[locale]/tours/international`) → start dev `:3000` → `npm run test:browser` (**expect 14/15** — sole failure = pre-existing `revalidate-webhook` gated on missing `SANITY_REVALIDATE_SECRET`; all other 14 green including rewritten `p-tours-category.mjs`).

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Deploy before backfill → empty domestic tab + empty homepage featured | Med | Script dry-run first; run `--apply` before/with deploy; tests derive expectations from live data so suite stays green |
| Nav-above-title DOM order change | Med | No test asserts order; flagged as accepted UI change in approval request |
| `loading.tsx` skeleton flakiness in browser tests | Low | `networkidle2` waits for streamed content; drop `loading.tsx` if any check flits |
| Leftover `featured` values in CMS drafts | Low | Script queries `Sanity-Perspective: raw` and patches drafts + published |
| Shared card/homepage DOM regressions | Low | No card component changes in this refactor |

## Unresolved Questions
1. **Write token**: backfill needs `SANITY_WRITE_TOKEN` (Editor role) — is one available, or will you apply the 3 doc edits manually in Studio? (Script is shipped either way; dry-run needs no token.)
2. Confirm accepted UI change: pill tabs render **above** the page h1 (required for persistent layout-level tabs).
