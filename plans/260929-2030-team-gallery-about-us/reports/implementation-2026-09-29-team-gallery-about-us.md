# Implementation Report — CMS-Driven Asymmetrical Team Gallery Below "About Us"

**Date**: 2026-09-29 · **Plan**: `plans/260929-2030-team-gallery-about-us/` · **Status**: Complete (100%)

## Approved decisions
- Placement = **inside** the existing `about-us-section` band, below the 50/50 grid (below intro text + Contact CTA + promo video).
- Grid per written spec (reference screenshot not found in repo): 2-col, left = Image 1 full height, right = nested 2-row (Image 2 top / Image 3 bottom), `gap-4`, subtle radius, strict `h-[400px] max-h-[50vh]`, `object-cover object-center`.

## Changes
- `src/sanity/schemaTypes/homepage.ts`: **`teamGallery`** array of image (hotspot), `validation: rule.required().length(3)` — exactly 3, description documents cell order.
- `src/sanity/queries/homepage.ts`: `teamGallery[]{ ${imageFragment} }` in `HOMEPAGE_QUERY` (tag `sanity:homepage` revalidation already covered).
- `src/app/[locale]/page.tsx`: `gallery={homepageData?.teamGallery ?? []}` prop.
- **New** `src/components/homepage/team-gallery.tsx` (server, 46 lines): renders `null` unless ≥3 slots (graceful, no fake placeholders; cells guard missing `asset.url` with `bg-muted/20`); markup = `mt-10 grid h-[400px] max-h-[50vh] grid-cols-2 gap-4`, left `relative overflow-hidden rounded-lg` + `Image fill`, right `grid grid-rows-2 gap-4` ×2 cells, all imgs `object-cover object-center` + responsive `sizes`.
- `src/components/homepage/about-us-section.tsx`: `gallery` prop (default `[]`), `<TeamGallery>` after the grid inside `.container`.
- Unit `homepage-about-video-query.test.mts`: +2 checks (`teamGallery[]{` projection w/ image fragment + `alt`; schema image array + `length(3)`).

## Verification
- **New** `tests/browser/u-team-gallery.mjs` (live GROQ `homepage.teamGallery`, no fabricated content): content branch = 0/3 → gallery absent + zero pageerrors → **4/4**; structure branch auto-activates when 3 images uploaded (2 direct children, right col = 2 cells, rounded cells, `gap-4`/`grid-cols-2`/`h-[400px]`+`max-h-[50vh]` classes, computed height ≤400px, imgs object-cover/center, DOM-order after promo video, screenshots).
- Regressions: `j-about-contact` **34/34**, `n-lightbox-contact` **27/27**.
- Full gates (combined run closing plans 1758/1805/2030): lint 0 · unit **18/18** · build 0 (dev stopped/restarted) · schema **0 errors** · suite **19/20** — sole fail = pre-existing `revalidate-webhook` (missing `SANITY_REVALIDATE_SECRET`).

## Outstanding (user)
- Upload exactly 3 team/culture images to `homepage.teamGallery` in Studio (no write token for scripted upload) → `u`-test flips to structure/visible branch on next run.

## Docs impact
minor — changelog bullet + plan statuses + this report.
