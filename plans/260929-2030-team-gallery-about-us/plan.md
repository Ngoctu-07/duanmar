# CMS-Driven Asymmetrical Team Gallery Below "About Us"

**Date**: 2026-09-29 · **Type**: Feature (CMS + frontend grid) · **Status**: Complete · **Progress**: 100%

## Requirements
1. `homepage` singleton ("About Us" fields owner) gains `teamGallery` — array of **exactly 3** images (company culture/team).
2. Frontend: gallery strictly below homepage About Us content (intro text + Contact CTA + promo video) — **inside** `about-us-section` container (approved placement).
3. Asymmetrical CSS grid (ref: Screenshot 2026-09-29 182805.jpg — not in repo; layout from written spec): 2 cols; left = Image 1 full height; right = nested 2-row grid (Image 2 top, Image 3 bottom); `gap-4`; subtle radius; **strict `h-[400px] max-h-[50vh]`** on container; `object-cover object-center` — compact, supplementary, never overpowering.

## Findings
- Block: `src/components/homepage/about-us-section.tsx` (server) rendered `src/app/[locale]/page.tsx:41`.
- Singleton: `src/sanity/schemaTypes/homepage.ts` (owns `aboutUsVideo*` from plan 260929-1500); `HOMEPAGE_QUERY` tag `sanity:homepage` (revalidation covered).
- Image pattern: `imageFragment` + `next/image fill` in `relative` cell (destination-card precedent).
- Blast radius: `j-about-contact.mjs` J2 (scoped, structural — unaffected), `n-lightbox-contact.mjs` (CTA — untouched), `homepage-about-video-query.test.mts` (extend).

## Design
- **Schema**: `teamGallery` array `of: image (hotspot)`, `validation: rule.required().length(3)`, description documents cell order.
- **Query**: `teamGallery[]{ ${imageFragment} },` in `HOMEPAGE_QUERY`.
- **Component**: new `src/components/homepage/team-gallery.tsx` (server): null unless ≥3 images (content pending — `SANITY_WRITE_TOKEN` absent, manual Studio upload); grid markup per spec; `alt` from CMS, `""` fallback.
- **Wiring**: `page.tsx` → `gallery` prop → `AboutUsSection` → `<TeamGallery>` after 50/50 grid.

## Phases
1. [phase-01](phase-01-schema-query-wiring.md) — field + projection + page wiring.
2. [phase-02](phase-02-team-gallery-component.md) — `team-gallery.tsx` grid + integration.
3. [phase-03](phase-03-tests-gates-docs.md) — new `u-team-gallery.mjs`, unit extension, full gates (combined run finishing plans 260929-1758/1805), screenshots, docs.

## Gates (combined run — closes prune + country + gallery)
lint 0 · `npm test` **18/18** · build 0 · schema validate 0 · `test:browser` **19/20** (sole fail `revalidate-webhook` env).

## Files
**Create**: `team-gallery.tsx` · `tests/browser/u-team-gallery.mjs` · plan/report.
**Modify**: `homepage.ts` (schema) · `queries/homepage.ts` · `page.tsx` · `about-us-section.tsx` · `homepage-about-video-query.test.mts`.

## Risks / Success
- No content yet → gallery hidden (graceful), `u`-test asserts absence branch; upload in Studio flips it visible.
- Success: field validation enforces 3; with 3 images: grid structure + max-height + placement proven by `u`-test; all gates green.
