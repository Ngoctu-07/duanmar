# Phase 1: Search Foundation + /tours Destination Page

**Priority**: P1 · **Status**: pending · **Est**: 2.5h · **Owns**: `src/lib/*`, `src/app/[locale]/tours/page.tsx`, `src/components/tours/tour-search-results.tsx`, `src/components/search/search-client.tsx`, `src/messages/{en,vi}.json`, `tests/unit/{search-normalize,tour-search}.test.mts`

## Context Links
- `src/components/search/search-client.tsx:30-35` — `normalize()` to extract (usages :47, :51, :58)
- `src/components/tours/tour-category-section.tsx:23-58` — fetch/grid/empty pattern to mirror
- `src/app/[locale]/search/page.tsx:131-141` — `searchParams: Promise<…>` + `fetchPublished(DESTINATIONS_QUERY, { region: "" }, …)` precedent
- `src/app/[locale]/tours/layout.tsx:9` — container `container mx-auto px-4 py-16` auto-applies to new page; `src/app/[locale]/tours/loading.tsx` gives Suspense for free
- Naming: `src/lib/` is kebab-case (`booking-email-validation.ts`, `date-window.ts`, `pricing.ts`)

## Overview
Create the search-result consumer route BEFORE the hero submit (Phase 2) so the pushed URL never dead-ends. Today `/tours` → `src/app/[locale]/[...rest]/page.tsx:12` `notFound()` because `src/app/[locale]/tours/` has no `page.tsx`. Extract shared accent-normalization (DRY between site `/search` and tour filtering), add pure helpers + unit tests, add i18n keys to both locales.

## Key Insights
- `fetchPublished` (`src/sanity/lib/fetch-published.ts:30-46`) fail-opens to `null` → always `?? []`; cache key = query+params → ALL search queries share one cached fetch, filtering happens in-memory after (cheap).
- Token-AND matching mirrors `search-client.tsx:49-55` (`tokens.every(token => haystack.includes(token))`) → consistent UX across both search surfaces.
- `Destination` type (`src/components/explore/destination-card.tsx:12-23`): haystack = `name + description + country.vi + country.en + region`, all normalized.
- i18n-parity test (`tests/unit/i18n-parity.test.ts:40-57`) hard-fails if en/vi keys diverge → edit both files in the same task.

## Requirements
- Functional: `/tours` and `/tours?search=…` render (all-tours view vs filtered view) with distinct headings; empty query = all tours; no match → `tours.noSearchResults`; `normalize` behavior byte-identical to current inline version.
- Non-functional: new files <200 lines; no behavior change to `/search` page.

## Architecture
Server-only: `page.tsx` (heading, ~35 lines) → `TourSearchResults` async component (fetch + filter + grid, ~55 lines) → `DestinationCard`. Pure logic isolated in `src/lib/` for unit testing without React/Next runtime.

## Related Code Files
**Create**
- `src/lib/search-normalize.ts` — `export function normalizeSearchText(v: string): string` (NFD → strip `\u0300-\u036f` → đ/Đ→d/D → toLowerCase; logic copied verbatim from `search-client.tsx:30-35`)
- `src/lib/tour-search.ts` — `export function buildToursHref(query: string): string` (trim empty → `"/tours"`; else `` `/tours?search=${encodeURIComponent(trimmed)}` ``) + `export function filterDestinations(destinations: Destination[], query: string): Destination[]` (`import type { Destination }` from `@/components/explore/destination-card`; empty query → return as-is; normalize both sides, token AND)
- `src/app/[locale]/tours/page.tsx` — default async component: `searchParams: Promise<{ search?: string }>`; heading block copies `tours/domestic/page.tsx:15-18` (h1+subtitle, `mb-10 text-center`); `query ? t("search.title") + t("search.summary", { query }) : t("all.title") + t("all.subtitle")`; then `<TourSearchResults query={query} />`; static `metadata` (`title: "Tours | DuanMar"`)
- `src/components/tours/tour-search-results.tsx` — `async function TourSearchResults({ query }: { query: string })`; `Promise.all` mirrors `tour-category-section.tsx:23-35` but with `DESTINATIONS_QUERY` + `{ region: "" }` (destinations.ts:4-19); `const destinations = filterDestinations(raw ?? [], query)`; empty → `<p className="py-12 text-center text-muted-foreground">{query ? toursT("noSearchResults") : toursT("empty")}</p>`; else grid `grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3` + `DestinationCard` with `priceRanges[dest.slug.current]` (same as :47-58). ~60 lines (small grid duplication with tour-category-section accepted — YAGNI, extract shared grid only if a 3rd consumer appears)
- `tests/unit/search-normalize.test.mts`, `tests/unit/tour-search.test.mts` — pattern from `tests/unit/tour-category-queries.test.mts` (node:assert/strict + `check()` + `process.exit(failed === 0 ? 0 : 1)`)

**Modify**
- `src/components/search/search-client.tsx` — delete local `normalize` (:30-35), `import { normalizeSearchText } from "@/lib/search-normalize"`, replace call sites :47/:51/:58 (alias locally: `const normalize = normalizeSearchText` — minimal diff)
- `src/messages/en.json` + `src/messages/vi.json` — inside `tours` (:1076 both) add:

| key | en | vi |
|-----|----|----|
| `tours.all.title` | `All Tours` | `Tất cả tour` |
| `tours.all.subtitle` | `Explore our full range of destinations` | `Khám phá toàn bộ điểm đến của chúng tôi` |
| `tours.search.title` | `Search Results` | `Kết quả tìm kiếm` |
| `tours.search.summary` | `Tours matching “{query}”` | `Tour phù hợp với “{query}”` |
| `tours.noSearchResults` | `No tours match your search.` | `Không có tour phù hợp với tìm kiếm của bạn.` |

**Delete**: none. **Untouched**: `/search` page, header search link (`src/components/layout/header.tsx:70`), `/tours/domestic|international`, `TourCategorySection`.

## Implementation Steps
1. Create `search-normalize.ts` (copy logic verbatim); create `tour-search.ts` with `buildToursHref` + `filterDestinations`.
2. Swap `search-client.tsx` to imported normalize (3 call sites).
3. Add 5 keys × 2 locale files (exact values above).
4. Create `tour-search-results.tsx` (mirror tour-category-section; swap query + add filter + query-aware empty state).
5. Create `tours/page.tsx` (heading + `<TourSearchResults query={query}/>`).
6. Write both unit test files; run `npm test`.
7. Run gates: `npm run lint`, `npx tsc --noEmit`, `npm run build` (build confirms `/tours` resolves ahead of catch-all and metadata compiles).

## Todo List
- [ ] `src/lib/search-normalize.ts` + `src/lib/tour-search.ts`
- [ ] `search-client.tsx` extraction swap
- [ ] en/vi `tours` keys (both files)
- [ ] `tour-search-results.tsx` + `tours/page.tsx`
- [ ] `tests/unit/search-normalize.test.mts` + `tests/unit/tour-search.test.mts`
- [ ] Gates green

## Success Criteria
- `/en/tours` 200 with all destinations; `/en/tours?search=ha%20long` shows only match; `?search=zzzz` shows `noSearchResults`; `/vi/tours` VI labels; `npm test` passes (incl. parity); `npm run build` passes; `npx tsc --noEmit` clean.

## Risk Assessment
| Risk | Likelihood×Impact | Mitigation |
|------|-------------------|------------|
| `search-client` swap changes `/search` results | L×M | Logic copied verbatim; manual `/en/search?q=…` check (no prior unit coverage exists) |
| Static gen of `/tours` with searchParams conflicts at build | L×M | Same pattern as existing `/search` page (dynamic); build gate catches it |
| Heading layout drift vs domestic page | L×L | Copy class strings from `tours/domestic/page.tsx:15-18` |

## Security Considerations
- Query is data-only: rendered through React text nodes (auto-escaped), never `dangerouslySetInnerHTML`; no GROQ string interpolation (filter is in-memory, params object only — no injection surface).

## Next Steps
- Phase 2 (`phase-02-hero-search-submit.md`) depends on `buildToursHref` + `/tours` route existing.
- Unresolved: see plan.md "unresolved questions" (nav link to `/tours`? search fields scope? `/explore/destinations` consolidation?).
