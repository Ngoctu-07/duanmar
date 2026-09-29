# Phase 03 — Tests, Combined Gates, Docs

**Status**: Complete (100%) · **Depends on**: Phase 2 · **Priority**: High

## New `tests/browser/u-team-gallery.mjs` (data-driven, live GROQ `homepage.teamGallery`)
- fetch count + alts of `teamGallery` (no fabrication).
- count ≥ 3: on `/vi` assert `[data-testid="team-gallery"]` exists; DOM order inside about-us-section: gallery AFTER promo video/CTA; structure: container direct children = 2 (left cell, right col), right col has 2 cells; computed `max-height ≤ 400px`; `className` includes `gap-4`, `rounded`, `object-cover`, `object-center` on imgs; imgs have `src`.
- count < 3: gallery absent (graceful branch).
- zero pageerrors; screenshots `u-team-gallery-desktop.png` + `-mobile.png` (only when visible).

## Combined gates (closes plans 260929-1758 prune, 260929-1805 country, this)
1. Targeted: `u`, `j-about-contact`, `n-lightbox-contact`, `t-country-locale` (country leftover), `l-navbar`, `p-tours`.
2. `npm run lint` → 0 · `npm test` → 18/18 · stop dev → `npm run build` → 0 → `npx sanity schemas validate` → 0 → restart dev → `npm run test:browser` → **19/20** (sole fail `revalidate-webhook`).

## Docs
- Changelog bullets (VN): gallery + pending prune/country bullets under `## 2026-09-29`.
- Reports: gallery (+ close prune/country reports/statuses).
- Outstanding: Studio upload of 3 team images; `SANITY_WRITE_TOKEN` for `migrate:countries --apply` + 2 backfills; country assignment per destination.
