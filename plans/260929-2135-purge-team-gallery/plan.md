# Remediation Plan — Permanently Purge teamGallery from Studio CMS + Homepage

**Date**: 2026-09-29 · **Type**: Bug-fix/deprecation (reversal of `260929-2030-team-gallery`) · **Status**: Complete · **Progress**: 100%

## Root cause
`teamGallery` was added to the `homepage` singleton (schema + `HOMEPAGE_QUERY` projection + `TeamGallery` 3-image grid rendered inside `AboutUsSection`) and is now a product regression: must be permanently removed from Studio schema, frontend DOM, and CMS data — with no orphaned whitespace left in the About band.

## Blast radius (verified by grep across src+tests)
| # | Site | Action |
|---|------|--------|
| 1 | `src/sanity/schemaTypes/homepage.ts:53-61` — `teamGallery` defineField (array, `length(3)` validation, labels) | delete field |
| 2 | `src/sanity/queries/homepage.ts:13` — `teamGallery[]{ ${imageFragment} }` | delete line (imageFragment stays — hero/aboutUsVideoPoster use it) |
| 3 | `src/app/[locale]/page.tsx:44` — `gallery={homepageData?.teamGallery ?? []}` | delete prop |
| 4 | `src/components/homepage/about-us-section.tsx:5,14,19,25,51` — import, doc-comment line, prop, type, `<TeamGallery>` render | strip all |
| 5 | `src/components/homepage/team-gallery.tsx` (45 L, incl. `data-testid="team-gallery"`, `mt-10` grid) | delete file |
| 6 | **CMS data**: homepage doc holds **3 uploaded images** (verified live) | purge via new script (see D1) |
| 7 | i18n | **none** — no `teamGallery` keys exist in en/vi |
| 8 | `tests/unit/homepage-about-video-query.test.mts:82-93` — positive asserts (query projection + schema `length(3)`) | replace with **negative** purge asserts |
| 9 | `tests/browser/u-team-gallery.mjs` (21-file suite, currently exercising visible 3/3 branch) | delete (feature gone) |
| 10 | Other tests (`j`,`n`,`v`,`l`,`p`…) | research shows **0 assertions** on team gallery — safe |

## Layout re-balance analysis
- `TeamGallery` is the **last child** of the section container (`about-us-section.tsx:51`); its `mt-10` grid lives inside the deleted file → removal leaves no orphan margins/gaps.
- Remaining band: `py-16` container → 50/50 `gap-8 md:gap-12` grid (`h2` + narrative `mt-4` + CTA `mt-6` | video), `items-center` → flows directly into next section (`ExperienceCategories`).
- Verify empirically: desktop 1280×900 + mobile 375×812 screenshots + DOM checks (no `[data-testid="team-gallery"]`, no `mt-10` gap, section bottom padding == `py-16` only) in new test.

## Decisions (approval via questions)
- **D1 (data purge)**: new `scripts/purge-team-gallery.mjs` — dry-run default, `--apply` gated on `SANITY_WRITE_TOKEN` (same pattern as `seed-countries.mjs`), issues `{ patch: { unset: ["teamGallery"] } }` on the homepage doc + npm script `migrate:purge-team-gallery`. *Alt*: leave orphaned data (invisible once field removed) — violates "remove unused data entries".
- **D2 (regression guard)**: new browser test `w-about-gallery-removed.mjs` asserting DOM absence + section integrity + dual-viewport screenshots; unit asserts flipped negative. *Alt*: unit-only (no DOM guard).

## Phases
1. [phase-01-cleanup](phase-01-cleanup.md) — schema, query, page, component, delete file, purge script.
2. [phase-02-tests-gates-docs](phase-02-tests-gates-docs.md) — unit flips, delete `u`, new `w`, full gates, screenshots, docs.

## Gates (all)
lint 0 · unit 18/18 · build 0 · `sanity schemas validate` 0 · browser suite **20/21** (−u +w; sole fail = `revalidate-webhook` env) · regressions `j`/`n`/`v`/`l` green.

## Success criteria
- Studio Homepage no longer shows Team Gallery (field, labels, validation gone); `grep teamGallery` in src → 0 hits (script/tests excepted).
- About band: title → narrative → CTA | video, no dead whitespace at any viewport; next section follows seamlessly.
- `migrate:purge-team-gallery --apply` ready (blocked only on write token, consistent with other migrations).

## Risks
- Orphaned CMS array remains until script `--apply` (write token missing) — invisible post-schema-removal, documented as blocked.
- `u-team-gallery` screenshots `u-team-gallery-*.png` become stale artifacts (note in report; harmless).
