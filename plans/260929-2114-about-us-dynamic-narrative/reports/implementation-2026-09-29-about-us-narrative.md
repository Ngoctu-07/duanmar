# Implementation Report — About Us Dynamic Narrative (Portable Text EN/VI)

**Date**: 2026-09-29 · **Plan**: `plans/260929-2114-about-us-dynamic-narrative/` · **Status**: Complete (100%)

## Approved decisions
- Two separate PT fields (`narrativeStory_en` / `narrativeStory_vi`), render chain: requested locale → other locale → **render nothing** when both empty.
- Placeholder `aboutSection.body` i18n strings removed (hardcoded copy was the old stand-in).
- Shared PT renderer `src/components/sanity/portable-text.tsx` (`PT_COMPONENTS` + `pickLocaleBlocks`) introduced here; later reused by `ArticleRichText` (plan 2151).

## Changes
- `src/sanity/schemaTypes/homepage.ts`: +fieldset Narrative with 2 PT fields.
- `src/sanity/queries/homepage.ts`: +2 projections.
- `src/i18n/messages/{en,vi}.json`: removed `aboutSection.body*` placeholders (parity kept).
- NEW `src/components/homepage/about-narrative.tsx` (server): locale chain + `render nothing` on empty; bound in `about-us-section.tsx` below intro, above CTA.

## Verification
- Targeted: `v-about-narrative.mjs` **8/8** (empty-CMS branch renders nothing, no crash).
- Gates (combined cycle): lint 0 · unit 21/21 · build 0 · schema 0 errors · suite 25/26 (sole fail = pre-existing `revalidate-webhook` env).

## Concerns
none — all AC green.

## Docs impact
minor — changelog bullet + plan statuses + this report.
