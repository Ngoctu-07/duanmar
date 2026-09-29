# Phase 01 — Schema Field, Query Projection, Page Wiring

**Status**: Complete (100%) · **Priority**: High

## Steps
1. `src/sanity/schemaTypes/homepage.ts` — after `aboutUsVideoPoster`:
   ```ts
   defineField({
     name: "teamGallery",
     title: "Team Gallery",
     type: "array",
     description: "Exactly 3 team/culture photos: Image 1 = tall left (full height), Image 2 = top right, Image 3 = bottom right.",
     of: [{ type: "image", options: { hotspot: true } }],
     validation: (rule) => rule.required().length(3),
   }),
   ```
2. `src/sanity/queries/homepage.ts` — in `HOMEPAGE_QUERY`: `teamGallery[]{ ${imageFragment} },`.
3. `src/app/[locale]/page.tsx` — `gallery={homepageData?.teamGallery ?? []}` into `<AboutUsSection>`; component prop added in phase 02.

## Verify
- `npx sanity schemas validate` → 0; Studio Homepage shows Team Gallery (3-slot requirement).
- Unit: extend `homepage-about-video-query.test.mts` — projects `teamGallery[]{` + `asset->{`.
