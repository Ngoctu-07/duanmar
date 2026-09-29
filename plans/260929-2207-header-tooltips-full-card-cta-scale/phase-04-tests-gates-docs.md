# Phase 04 — Tests, Gates, Docs

**Status**: Complete · **Depends on**: Phase 3 · **Priority**: High

## New `tests/browser/a-ux-microinteractions.mjs` (letter `a` free; runner auto-discovers)
1. **Tooltips** (`/vi` + `/en`, desktop): hover Search icon → sibling tooltip span visible with live i18n text (`common.search` from messages JSON); hover suitcase → `myTrips.navLabel`; both spans `aria-hidden="true"`; icons keep `aria-label`; `group-focus-within` path via `page.focus` on link → tooltip opacity 1. Screenshots.
2. **Full-card**: on `/vi` homepage featured grid — locate a `[data-slot="card"]`, click its IMAGE area (offset outside CTA), wait navigation → URL matches `/vi/explore/destinations/<slug>`; computed `cursor-pointer`; exactly 1 destination anchor per card (link-count parity); works again on `/vi/tours/domestic`.
3. **CTA scale**: computed style of hero `exploreNow` button (padding-top ≥ 16px, font-size ≥ 18px) and about Contact button (same thresholds); screenshot hero + about band at 1280 and 375.
4. Zero pageerrors.

## Regressions (targeted first)
`f-ui` (My Trips entry), `g-header`, `p-tours-category` (P10/P11/P14/P19), `j-about-contact`, `n-lightbox`, `l-navbar`, `t-country-locale`, `d8-a11y`.

## Gates (combined with in-flight `260929-2151` if Q1 = finish-first)
lint 0 → unit 18/18+ → stop dev → build 0 → schema validate 0 → restart dev → full `npm run test:browser` (sole fail = `revalidate-webhook` env) → screenshots archived.

## Docs
- `docs/project-changelog.md` `## 2026-09-29`: bullets for this feature **plus** still-owed: narrative CMS (2114), teamGallery purge (2135), homepage pruning + article schema + newspaper blog (2151) — all closed in this pass.
- Reports: this plan's `reports/` + owed `260929-2135` report.
- Status flips → Complete: 2114 (plan+3), 2135 (plan+2), 2151 (plan+4 — after its P3), 2207 (plan+4).
- Outstanding: `SANITY_WRITE_TOKEN` (purge-team-gallery `--apply`, seed-articles `--apply`), Studio content (articles + narrative), `SANITY_REVALIDATE_SECRET`.
