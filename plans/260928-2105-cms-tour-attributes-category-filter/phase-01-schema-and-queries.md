# Phase 01 — Studio Schema + Category Queries

**Status**: Complete · **Priority**: High · **Depends on**: — (self-contained; P2/P3 consume)

## Context Links
- Target: `src/sanity/schemaTypes/destination.ts` (70 LOC) — append 3 fields after `region` (`:21-33`, before `description` `:34`); `preview` `:67-69` unchanged (title = `name` string).
- House enum pattern = `type:"string"` + `options.list:[{title,value}]` (precedent `region` `:26-31`); boolean = `initialValue:false` (precedent `featured` `:60-65`); optional = omit `validation`; required = `validation:(rule)=>rule.required()` (`:12,19,32`). **No `Reference` type anywhere in schemaTypes** → enum only. `tour-pricing.ts:1-22` shows description/preview conventions (preview title MUST be string).
- No registration changes: `schemaTypes/index.ts:7-8` already lists `destination`; `structure.ts:4-7` = `S.documentTypeListItems()` (auto).
- Queries: `src/sanity/queries/destinations.ts` (`DESTINATIONS_QUERY` `:4-15`, `DESTINATION_BY_SLUG_QUERY` `:17-28`, `DESTINATION_SLUGS_QUERY` `:30-32`, `DESTINATIONS_BY_SLUGS_QUERY` `:34-42`) + `queries/homepage.ts:13-22` (`FEATURED_DESTINATIONS_QUERY`).
- Call-site safety: `explore/destinations/page.tsx:32-40` and `search/page.tsx:142-144` and `explore/map/page.tsx:26-28` pass `{region}` ONLY → adding `$category` to `DESTINATIONS_QUERY` would throw at fetch. Detail `[slug]/page.tsx:26-29` passes `{slug}` only.
- Fetch discipline: `lib/fetch-published.ts:30-45` — `fetchPublished(query, params, {tags})`, `sanityTags()` `:20-22` prepends global `sanity`; cache key = query+params `:15-17`; raw `client.fetch` = documented defect.
- Studio: root `/studio` (`src/app/studio/[[...tool]]/page.tsx`, `dynamic="force-static"`), config `sanity.config.ts` (imports asserting `env.ts:10-18`). CLI present: `node_modules/.bin/sanity` (`schemas validate` confirmed in `--help`, local schema check, no dataset write).
- Gotchas: required `category` ⇒ legacy docs fail publish until filled (user-accepted); `internationalized-array` deliberately unused (0 imports); new fields never break existing projections (extra GROQ fields are additive).

## Overview
- **Priority**: High · **Status**: Complete · **Effort**: ~30 min
- AC1: `destination` gains `difficultyLevel` (optional enum), `isSpecialTour` (boolean), `category` (required enum domestic/international).
- Query layer: NEW `DESTINATIONS_BY_CATEGORY_QUERY` (legacy-tolerant filter) + extend projections of `DESTINATIONS_QUERY`, `DESTINATION_BY_SLUG_QUERY`, `FEATURED_DESTINATIONS_QUERY` with `difficultyLevel`, `isSpecialTour` so cards/detail/homepage can render badges. Zero new params on existing queries.

## Key Insights
- Filtering belongs in GROQ with a single `$category` param using ternary: `$category == "international" ? category == "international" : (!defined(category) || category == "domestic")` — one query, two strict/tolerant branches, matches decision 2 exactly; GROQ supports ternary + `defined()` + `!`.
- Projecting `category` into card payloads is YAGNI: page context already implies it, tests compute expectations from the live dataset directly (P3). → project only `difficultyLevel` + `isSpecialTour` (**deviation vs proposal**, flagged).
- Extending projections of existing queries needs no call-site edits: GROQ projections are additive; params unchanged ⇒ `sanityCacheKey` unchanged shape, but query string changes ⇒ new cache entries (auto, 300s TTL) — stale-entry risk nil.
- `initialValue:"domestic"` only seeds NEW docs; legacy docs stay `undefined` until user backfills → domestic tab shows them (tolerant branch), international strictly only filled docs.

## Requirements
- **AC1**: fields on `destination`, in order after `region`:
  1. `difficultyLevel` — `type:"string"`, `options.list`: Easy/easy, Medium/medium, Hard/hard, Extreme/extreme, `description:"Leave empty if none."`, NO `validation` (optional).
  2. `isSpecialTour` — `type:"boolean"`, `initialValue:false`, `description` short hint.
  3. `category` — `type:"string"`, `options.list`: `{title:"Trong nước (Domestic)",value:"domestic"}`, `{title:"Nước ngoài (International)",value:"international"}`, `initialValue:"domestic"`, `validation:(rule)=>rule.required()`.
- **P2**: NEW `DESTINATIONS_BY_CATEGORY_QUERY` with `$category` filter (strict/tolerant per above) + `| order(name asc)` + projection `_id,name,slug,region,description,lat,lng,difficultyLevel,isSpecialTour,image { ${imageFragment} }`.
- Extend projections of the 3 existing queries with `difficultyLevel`, `isSpecialTour` (2 lines each; keep all existing fields byte-identical).
- **Do NOT**: add params to existing queries; register new type; touch `structure.ts`/`index.ts`; use Reference/internationalized-array.

## Related Code Files
- **Modify**: `src/sanity/schemaTypes/destination.ts` (70 → ~100 LOC) · `src/sanity/queries/destinations.ts` (42 → ~62) · `src/sanity/queries/homepage.ts` (22 → ~24)
- **Create**: none
- **Delete**: none
- **Read-only**: `schemaTypes/index.ts` · `structure.ts` · `fragments/image.ts` (line 1 fragment) · `lib/fetch-published.ts` · `sanity.config.ts` · 3 call sites above

## Implementation Steps
1. `destination.ts`: after `region` block (`:33`), insert the 3 `defineField` blocks from AC1 (order: `difficultyLevel`, `isSpecialTour`, `category`). Keep house style: no comments, `title` in PascalCase, descriptions plain-English.
2. `queries/destinations.ts`: add `export const DESTINATIONS_BY_CATEGORY_QUERY = defineQuery(...)` with filter `$category == "international" ? category == "international" : (!defined(category) || category == "domestic")`, `| order(name asc)`, full projection (2 new fields + `image { ${imageFragment} }`).
3. Same file: add `difficultyLevel,` + `isSpecialTour,` lines to projections of `DESTINATIONS_QUERY` (after `region,` `:9`) and `DESTINATION_BY_SLUG_QUERY` (after `region,` `:21`). Do not touch `:30-42`.
4. `homepage.ts`: add the same 2 lines to `FEATURED_DESTINATIONS_QUERY` projection (after `region,` `:18`).
5. Schema validate (local, no write): `node_modules/.bin/sanity schemas validate` from repo root. **Fallback if env assert fires** (`Missing environment variable…`): `bash -c 'set -a; source .env.local; set +a; node_modules/.bin/sanity schemas validate'` → expect 0 errors/warnings.
6. Compile check per `.claude/rules/primary-workflow.md`: `npm run lint` (exit 0) → `npm test` (14/14 unchanged — no test reads these files yet).
7. Sanity smoke (dev `:3000`): `/vi/explore/destinations` + `/vi/explore/destinations/hcm` still 200 with identical layout (no badge data in CMS yet ⇒ zero visual delta), `/vi` homepage 200.
8. Optional Studio eyeball at `/studio` (schema form shows 3 new fields; no publish — no Studio write token in session).

## Todo List
- [ ] Add `difficultyLevel` / `isSpecialTour` / `category` fields to `destination.ts` (AC1 exact values/validation)
- [ ] Add `DESTINATIONS_BY_CATEGORY_QUERY` (strict/tolerant filter + `order(name asc)` + full projection)
- [ ] Extend `DESTINATIONS_QUERY` + `DESTINATION_BY_SLUG_QUERY` projections (+2 fields, params untouched)
- [ ] Extend `FEATURED_DESTINATIONS_QUERY` projection (+2 fields)
- [ ] `node_modules/.bin/sanity schemas validate` → 0 errors (env fallback if needed)
- [ ] `npm run lint` → 0 · `npm test` → 14/14
- [ ] Dev smoke: destinations listing + detail + homepage 200, no visual delta

## Success Criteria
- Schema validates locally; 3 fields present with exact enum values `easy|medium|hard|extreme`, `domestic|international`, boolean `initialValue:false`, `category` required.
- `grep -c '$category'` in `destinations.ts` = only inside NEW query; existing queries contain NO `$category`.
- All 3 extended queries contain `difficultyLevel` + `isSpecialTour`; all other projection lines byte-identical (`git diff` shows only added lines).
- lint 0, unit 14/14, destination surfaces 200 unchanged.

## Risk Assessment
- **Studio publish block on legacy docs** (required `category`) — accepted by user; mitigated by `initialValue:"domestic"` for new docs + user backfill plan.
- **`sanity schemas validate` env assert** — fallback sources `.env.local` (documented step 5); command is local-only (no Content Lake write).
- **Cache churn**: query-string change ⇒ fresh `unstable_cache` entries; self-heals in ≤300s, webhook unaffected (`revalidateTag("sanity")` tags unchanged).
- **Projection growth** on homepage/listing adds 2 scalars/doc — negligible payload.

## Security Considerations
- Published-only + stega-off via `fetchPublished` (no drafts/token exposure); schema additions hold no secrets; no new env vars; CLI validation reads config only (no dataset mutation, no write token used).

## Next Steps
- P2 consumes projections: `phase-02-frontend-integration.md` (tab nav, grids, badges). Keep `DESTINATIONS_BY_CATEGORY_QUERY` params to `{category}` only.
