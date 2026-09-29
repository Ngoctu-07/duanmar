# Implementation Report — Purge `teamGallery` (Revert Plan 2030)

**Date**: 2026-09-29 · **Plan**: `plans/260929-2135-purge-team-gallery/` · **Status**: Complete (100%)

## Approved decisions
- Full removal (schema + query + component + tests), not feature-flag disable.
- `teamGallery` CMS data left in dataset (fields dropped from schema = inert); script offered for the residual homepage doc payload.

## Changes
- `src/sanity/schemaTypes/homepage.ts`: removed `teamGallery` field (length-3 rule gone).
- `src/sanity/queries/homepage.ts`: removed `teamGallery[]{…}` projection.
- `src/app/[locale]/page.tsx`: removed prop pass.
- `src/components/homepage/about-us-section.tsx`: removed import/render + doc-comment.
- **Deleted** `src/components/homepage/team-gallery.tsx` (grep `teamGallery` under src → 0).
- Tests: deleted `u-team-gallery.mjs`; NEW `w-about-gallery-removed.mjs` **25/25** (dual-viewport: about section single child, no 2-col grid, py-16 = 64px, no pageerror); unit query checks flipped to negative purge asserts.
- NEW `scripts/purge-team-gallery.mjs` (`npm run migrate:purge-team-gallery`): dry-run reports 3 image slots pending on homepage doc; `--apply` requires `SANITY_WRITE_TOKEN`.

## Verification
- Targeted: `w-about-gallery-removed` **25/25**; regressions `j`, `n`, `v`, `l` green.
- Gates (combined cycle): lint 0 · unit 21/21 · build 0 · schema 0 errors · suite 25/26 (sole fail = pre-existing `revalidate-webhook` env).

## Concerns
none — purge complete, Studio doc retains orphaned `teamGallery` value until script `--apply` or manual cleanup (cosmetic only).

## Docs impact
minor — changelog bullet + plan statuses + this report.
