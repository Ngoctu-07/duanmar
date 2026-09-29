# Phase 02 — Tests, Gates, Layout Verification, Docs

**Status**: Complete · **Depends on**: Phase 1 · **Priority**: High

## Unit — `tests/unit/homepage-about-video-query.test.mts`
- Replace positive checks (lines 82-93: query `teamGallery[]{` projection, schema `name: "teamGallery"`, `rule.required().length(3)`) with **negative purge asserts**:
  - `HOMEPAGE_QUERY` does NOT contain `teamGallery`,
  - schema source does NOT contain `teamGallery`,
  - (keep all narrative + placeholder-removal checks → file stays 18/18 total suite).

## Browser
- **Delete** `tests/browser/u-team-gallery.mjs` (+ stale screenshots `u-team-gallery-*.png` in `tests/.output/`).
- **New** `tests/browser/w-about-gallery-removed.mjs` (letter `w` is free; runner auto-discovers):
  - `[data-testid="team-gallery"]` absent on `/vi` + `/en`;
  - About band integrity: exactly one `[data-testid="about-us-section"]`, h2 present, contact CTA link present, promo video present, `narrative` presence matches live CMS (reuse `v` data-driven chain), **zero** `mt-10` grid container inside section (assert no element with `team-gallery` role/alt text either);
  - layout: section's `pb` equals `py-16` (computed paddingBottom 64px) — no orphaned bottom gap;
  - dual-viewport screenshots `w-about-clean-desktop.png` (1280×900) + `w-about-clean-mobile.png` (375×812) around the section;
  - zero pageerrors.

## Gates (ordered)
1. Targeted: `w`, `j-about-contact`, `n-lightbox`, `v-about-narrative`, `l-navbar`.
2. `npm run lint` 0 → `npm test` 18/18 → stop dev → `npm run build` 0 → `npx sanity schemas validate` 0 → restart dev → `npm run test:browser` **20/21** (21 files post-swap; sole fail = `revalidate-webhook` env).
3. `node scripts/purge-team-gallery.mjs` dry-run output recorded (apply blocked: no `SANITY_WRITE_TOKEN`).

## Docs
- `docs/project-changelog.md` `## 2026-09-29`: bullet under Changed (teamGallery purge) + owed **Completed** bullet for the narrative CMS feature (`260929-2114`, its statuses not yet flipped).
- Flip statuses: this plan's plan.md + 2 phases → Complete; `plans/260929-2114-about-us-dynamic-narrative/{plan.md,phase-01..03}` → Complete 100%.
- Report `plans/260929-2135-purge-team-gallery/reports/implementation-2026-09-29-purge-team-gallery.md`.
- Outstanding: `migrate:purge-team-gallery --apply` (write token), narrative Studio content fill.
