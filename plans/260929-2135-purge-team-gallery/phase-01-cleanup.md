# Phase 01 — Schema / Query / Component Cleanup + Data-Purge Script

**Status**: Complete · **Priority**: High

## Steps
1. **Schema** `src/sanity/schemaTypes/homepage.ts` — delete the whole `teamGallery` `defineField` block (lines 53-61: name/title/type/description/`of`/`validation`).
2. **Query** `src/sanity/queries/homepage.ts` — delete line 13 `teamGallery[]{ ${imageFragment} },`. Keep `imageFragment` (still used by `heroImage`/`aboutUsVideoPoster`).
3. **Page** `src/app/[locale]/page.tsx` — delete `gallery={homepageData?.teamGallery ?? []}` (line 44).
4. **Section** `src/components/homepage/about-us-section.tsx`:
   - delete `TeamGallery` import (line 5),
   - delete doc-comment sentence "the asymmetrical team gallery renders below the grid inside this band." (line 14),
   - delete `gallery` prop + `TeamGalleryImage` type (lines 19, 25),
   - delete `<TeamGallery images={gallery} />` (line 51).
5. **Delete** `src/components/homepage/team-gallery.tsx`.
6. **Purge script** `scripts/purge-team-gallery.mjs` (clone `seed-countries.mjs` pattern):
   - reads `NEXT_PUBLIC_SANITY_PROJECT_ID/DATASET` + `SANITY_WRITE_TOKEN`,
   - dry-run prints current `teamGallery` asset refs; `--apply` issues
     `[{ patch: { id: <homepageId>, set: [], unset: ["teamGallery"] } }]` — resolve homepage id via `*[_type=="homepage"][0]._id`,
   - exits 0 dry-run / requires token for `--apply`.
7. **package.json** — add `"migrate:purge-team-gallery": "node scripts/purge-team-gallery.mjs"`.

## Verify
- `grep -rn teamGallery src` → 0 hits.
- `npx sanity schemas validate` → 0 errors; Studio Homepage shows narrative + video, **no Team Gallery**.
- Dev server: `/vi` About band DOM has no `[data-testid="team-gallery"]`.
