# Phase 1 — Schema Expansion (galleryImages) + Queries + Types + Unit Tests

**Context**: plan [plan.md](plan.md) · Research: inline in plan.md (§Key Research Findings)
**Priority**: High · **Status**: Complete (100%) · **Depends on**: —

## Overview
Replace `image` field on `destination` with `galleryImages[]` (min 3), project it in all queries (keeping legacy `image` as fallback), update shared types, add optional backfill script, lock with unit tests.

## Requirements
- AC1: Studio `destination` exposes `galleryImages` — `type: "array"`, `of: [{type:"image", options:{hotspot:true}}]`, `validation: rule => rule.min(3).required()`; old `image` field **removed from schema** (brief: replace); preview `media` repointed to gallery; schema validate 0 errors.
- AC2: every destination query projects `galleryImages[] { ${imageFragment} }` **and keeps** legacy `image { ${imageFragment} }` (fallback until backfilled).
- AC3: `Destination` type + consumers know `galleryImages`; cover = `galleryImages[0] ?? image`.
- AC4: backfill script (dry-run default, `--apply` needs write token) copies `image` → `galleryImages[0]` for docs with empty gallery.

## Related Code Files
- Modify: `src/sanity/schemaTypes/destination.ts` (70-75 field swap; 100 preview media)
- Modify: `src/sanity/queries/destinations.ts` (14, 28, 42), `src/sanity/queries/homepage.ts` (24)
- Modify: `src/components/explore/destination-card.tsx` (type 10-18 + cover pick 33-42)
- Create: `scripts/backfill-destination-gallery.mjs` (pattern: `scripts/backfill-tour-filter-fields.mjs`), npm script `migrate:destination-gallery`
- Create: `tests/unit/destination-gallery-query.test.mts`
- Modify: `tests/unit/tour-category-queries.test.mts` (87-96: add `galleryImages[] {` assertion, keep `image {` legacy assertion)
- Delete: none (legacy GROQ `image` projection intentionally kept)

## Implementation Steps
1. `destination.ts`: replace field block with `galleryImages` array (hotspot on member, `rule.min(3).required()` per `tour-pricing.ts:38-45` precedent); preview `media: "galleryImages"` (manual Studio check in P3).
2. Add `galleryImages[] { ${imageFragment} }` line next to each of the 4 `image { … }` projections (keep `image {` — unit `:94` + fallback both intact).
3. `destination-card.tsx`: type `galleryImages?: { asset?: { url: string }; alt?: string }[]`; export small helper `pickCoverImage(dest)` (`galleryImages[0] ?? image`) used by card; detail page gets `pickGalleryImages(dest)` in P2.
4. Backfill script: GROQ `*[_type=="destination" && (!galleryImages || count(galleryImages)==0) && defined(image)]`, patch `set: {galleryImages: [image]}`, dry-run default; dry-run must report 3 pending (blocked apply = write token, non-blocking).
5. Unit tests: new file asserting (a) all 4 queries contain `galleryImages[] {` + `image {`, (b) fragment includes `metadata`, (c) schema source has `min(3)`/`galleryImages`, (d) no `$param` added; extend existing file assertion for gallery.

## Todo List
- [ ] schema field swap + preview media
- [ ] 4 query projections
- [ ] type + cover helper
- [ ] backfill script + npm script (dry-run verified)
- [ ] unit tests (new + extend)

## Success Criteria
`npm run lint` 0 · `npm test` 18/18 · `npx sanity schemas validate` 0 errors · dry-run lists 3 pending.

## Risk Assessment
Removing `image` from schema → Studio hides field but raw data survives in docs (GROQ fallback still reads it) until backfill/edit. Published docs unaffected at runtime.

## Security Considerations
Backfill only reads env keys; patch requires `SANITY_WRITE_TOKEN` (never committed). No secrets in repo.

## Next Steps
→ Phase 2 (carousel + sizing).
