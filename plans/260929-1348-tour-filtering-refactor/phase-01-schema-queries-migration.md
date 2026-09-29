# Phase 1 — Schema Rename, Strict Queries, Migration Script, Unit Tests

**Plan**: [plan.md](plan.md) · **Priority**: High · **Status**: Complete (100%) · **Depends on**: —

## Context Links
- `src/sanity/schemaTypes/destination.ts:42-55,82-87`
- `src/sanity/queries/homepage.ts:13-23` · `src/sanity/queries/destinations.ts:32-47`
- `src/sanity/lib/fetch-published.ts` (cache key = query+params → query change auto-invalidates)
- `tests/unit/tour-category-queries.test.mts:32-43,69-73` · precedent raw API read `tests/browser/p-tours-category.mjs:31-43`
- `sanity.cli.ts` (projectId/dataset from `NEXT_PUBLIC_*`) · `.env.local` has read token only

## Overview
AC1 (isFeatured field), AC2 (homepage strict), AC3 (strict domestic) implemented at schema/query layer; migration script ships with them; unit tests rewritten in same phase so the suite stays green after every phase.

## Key Insights
- GROQ lacks ternary → strict filter = single equality `category == $category` (param ∈ {domestic, international}).
- `isFeatured` rename affects exactly 2 code sites; data copy needs the script.
- Sanity `options.list` already restricts UI, but validation `rule.valid(...)` enforces API-level strictness (AC1 "strictly accepting").

## Requirements
- Schema: boolean `isFeatured` (replaces `featured`); `category` validates to exactly `domestic|international`, required, `initialValue:"domestic"`.
- Homepage query: strictly `isFeatured == true`; no fallback path for unfeatured docs.
- Category query: strictly `category == $category` for both tabs; no `!defined(category)` branch.
- Migration script: idempotent, dry-run default, copies `featured → isFeatured`, backfills missing `category`, patches drafts + published.

## Related Code Files
**Modify**: `src/sanity/schemaTypes/destination.ts` · `src/sanity/queries/homepage.ts` · `src/sanity/queries/destinations.ts` · `tests/unit/tour-category-queries.test.mts` · `package.json`
**Create**: `scripts/backfill-tour-filter-fields.mjs`
**Delete**: none

## Implementation Steps
1. `destination.ts`: rename field `name: "featured"` → `name: "isFeatured"`, keep `title: "Featured"`, add `description: "Show this tour in the Homepage 'Featured Destinations' section."`, keep `initialValue: false`. On `category` add `validation: (rule) => rule.required().valid("domestic", "international")`.
2. `homepage.ts`: `*[_type == "destination" && isFeatured == true][0...6]` (projection untouched).
3. `destinations.ts`: replace the two-branch filter in `DESTINATIONS_BY_CATEGORY_QUERY` with `*[_type == "destination" && category == $category] | order(name asc) { … }` — projection byte-identical to today.
4. `package.json` scripts: add `"migrate:tour-filter": "node scripts/backfill-tour-filter-fields.mjs"`.
5. Create `scripts/backfill-tour-filter-fields.mjs` (Node, zero deps, `fetch` only, <200 LOC):
   - Reads `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` (+ `.env.local` fallback via same pattern as `tests/browser/p-tours-category.mjs:19-28`); token from `SANITY_WRITE_TOKEN` env or `--token=` (apply mode only).
   - GET `data/query/{ds}?query=*[_type=="destination"]{_id,"slug":slug.current,category,isFeatured,featured}` with header `Sanity-Perspective: raw` (drafts + published).
   - Plan (per doc): `featured !== isFeatured` → `set {isFeatured: featured === true}` + `unset [featured]`; `category == null` → `set {category: <override ?? --default(default "domestic")>}`.
   - Print a table: id/slug → planned ops; **without `--apply` stop after printing (no token needed)**; with `--apply` require token and POST `data/mutate/{ds}` `{mutations:[{patch:{id,set,unset}}]}` in one batch; print result summary.
   - Flags: `--apply`, `--default=domestic|international`, `--set <slug>=<category>` (repeatable), `--token=<sanity write token>`. Exit 0 on success; non-zero on HTTP error.
   - Warn loudly for docs missing `category` whose slug looks non-Vietnamese is NOT attempted (no heuristics) — instead the plan/README note tells operator to review the list (e.g. `nyc` → `--set nyc=international`).
6. Rewrite unit assertions in `tour-category-queries.test.mts`:
   - #3 → "strict category equality via $category": `includes("category == $category")`.
   - #4 → replace legacy-tolerant check: `!q.includes("!defined(category)")` + `includes("$category")`.
   - #10 → `FEATURED_DESTINATIONS_QUERY` includes `isFeatured == true`, does NOT include `/\bfeatured\b/` (word-boundary, so `isFeatured` never matches).
   - Add: `DESTINATIONS_BY_CATEGORY_QUERY` has no `defined(category)` and still `| order(name asc)`.
7. Run gates: `npm run lint` → `npm test` (15/15) → `node scripts/backfill-tour-filter-fields.mjs` (dry-run must list the 3 docs and their planned ops, exit 0) → `node_modules/.bin/sanity schemas validate` (0 errors; source `.env.local` first).

## Todo List
- [ ] Schema: `isFeatured` rename + category `rule.valid(...)`
- [ ] Queries: homepage `isFeatured == true`; category query strict single-equality
- [ ] `scripts/backfill-tour-filter-fields.mjs` + package.json script
- [ ] Unit test rewrite (strict contract + homepage strictness)
- [ ] Gates: lint, unit 15/15, dry-run, schema validate

## Success Criteria
- Grep for `featured` (word-boundary, excluding `isFeatured`) returns nothing in `src/`.
- `!defined(category)` absent from `src/sanity/queries/*`.
- `npm test` 15/15; `sanity schemas validate` 0 errors; script dry-run exit 0 listing 3 docs.

## Risk Assessment
- Rename orphans existing CMS values → mitigated by script step 5 (run before deploy).
- Schema validation could reject legacy docs with other category values → dry-run/`sanity schemas validate` surfaces this.

## Security Considerations
- Script never logs token; token only in `Authorization` header; `.env*` never committed.

## Next Steps
Phase 2 (shared layout + client tabs).
