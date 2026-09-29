# Phase 01 — Footer Layout: 6-Track Asym Grid + Logo 2x

**Status**: Complete · **Priority**: High · **Depends on**: — (self-contained; P2 verifies)

## Context Links
- Target file: `src/components/layout/footer.tsx` (128 LOC) — edit ONLY `:30` (grid template), `:31` (brand col-start), `:32` (logo size), `:39`/`:55`/`:79` (nav col-starts).
- Grid today `:30`: `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1fr_auto_auto_auto] md:gap-x-6` — 4 direct children, no wrappers; `1fr` brand swallows slack → nav cluster flush-right (AC2 violation).
- Brand block `:31-37`: `<div className="col-span-2 md:col-span-1">` → `<BrandLogo size={44} className="mb-3" />` `:32` → `<h3 className="mb-4">` `:33` → `<BrandWordmark className="text-4xl md:text-5xl ...">` `:34` → tagline `:36`.
- Shared logo: `src/components/layout/brand-logo.tsx:6` (`size = 36` default), `:15-22` (`width={size} height={size}`, `cn("shrink-0 rounded-full", className)`) — **DO NOT EDIT**; header shares it (`header.tsx:28` `size={36}`, H5 ≤40px contract `m-footer-brand.mjs:97`).
- Test contracts constraining markup: `m-footer-brand.mjs:103` exactly 4 children, `:104-108` title order, `:135-139` brand=child0 logo+tagline · `o-footer-refinement.mjs:77-82` 4 children + titles, `:106-107` O5a nav gaps (pairs 1-2, 2-3 ONLY) ≤25px, `:132-136` O6b brand.right ≤ nav1.left+1, `:143-147` O7b brand spans grid @375.
- Tailwind v4.3.3: arbitrary `grid-cols-[...]` (underscore = space) precedent `src/components/ui/card.tsx:27`; `col-start-1..5` core utilities (≤13 ✓).

## Overview
- **Priority**: High · **Status**: Complete · **Effort**: ~20 min (6 line edits, all className/attr)
- AC1: footer logo exact 2x — 44 → **88px** at every breakpoint (call-site prop only).
- AC2: desktop nav cluster **center-right** — trailing empty `0.5fr` track + leading `1fr` give asymmetric slack split (2:1), cluster neither flush nor dead-center.
- AC3: strict 1:2 gap ratio desktop — X=24px nav↔nav, 2X=48px brand↔nav1, produced **natively** by `column-gap` 24 + fixed `0` track + `column-gap` 24 (plus `col-start` placement) — zero margins/paddings.

## Key Insights
- 6-track template, 4 children: **empty tracks are the layout mechanism** — track2 = `0` (fixed) makes brand→nav1 = gap+0+gap = 48 = 2X while nav↔nav gaps stay 24 = X; all from one `md:gap-x-6`.
- `1fr` : `0.5fr` slack split = 2:1 → brand track absorbs 2/3 of free space, trailing track 1/3 → cluster pushed off right edge but with ~312px right margin @1280 (not flush) and center ≈780 vs grid center 624 (not dead-center).
- `md:gap-x-6` (24px) already exists at `:30` — **no gap class change needed**; only the `md:grid-cols-[...]` value changes → keeps O5a/O6a (≤25px) green by construction.
- Explicit `md:col-start-*` defeats auto-placement ambiguity (6 tracks): navs pinned to tracks 3/4/5, brand to track 1; children count/order/DOM untouched → F1/F2/O1a/O1b/F3-F8/R1 unaffected.
- Logo 88px < wordmark min-content (~215px @48px) → brand track floor unchanged; mobile brand spans full grid (343px @375) → 88 fits (O7b intact).
- Gap math is **width-independent** (fixed 0-track) → identical 48/24/24 at 1280, 768, and any wider viewport; only cluster *position* scales with grid width.

## Requirements
- **AC1**: `footer.tsx:32` `size={44}` → `size={88}`; keep `className="mb-3"` (default — unresolved Q1, bump only on visual review); `brand-logo.tsx` + `header.tsx` untouched.
- **AC2**: `footer.tsx:30` → `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1fr_0_auto_auto_auto_0.5fr] md:gap-x-6`.
- **AC3**: `md:col-start-1` on brand `:31`; `md:col-start-3` / `md:col-start-4` / `md:col-start-5` on nav divs `:39`/`:55`/`:79`.
- Invariants: exactly 4 direct children of `footer .grid`, order brand→tours→contact→info, literal `grid` + `mt-8` classes kept, no wrapper divs, no reordering, no wordmark/tagline/bottom-bar/i18n changes.
- Non-goals (YAGNI): no `globals.css`, no header, no `brand-logo.tsx` default, no mobile template change, no flex rewrite, no `justify-*` tricks.

## Architecture (short)
Desktop: `footer .grid` = 6 tracks `[1fr | 0 | auto | auto | auto | 0.5fr]`, gap-x 24. Brand → track1; navs → tracks 3/4/5 (explicit col-start); tracks 2 & 6 empty. brand.right → nav1.left = 24+0+24 = **48px (2X)**; nav gaps = **24px (X)**; free space splits 2:1 between track1 and track6 → cluster sits center-right. Mobile `<md`: unchanged 2-col grid, brand `col-span-2` row1, navs flow rows 2-3 (all new classes `md:`-prefixed).

## Related Code Files
- **Modify**: `src/components/layout/footer.tsx` (`:30`, `:31`, `:32`, `:39`, `:55`, `:79`)
- **Create**: none in this phase
- **Delete**: none
- **Read-only**: `brand-logo.tsx` · `brand-wordmark.tsx` · `header.tsx` · `tests/browser/m-footer-brand.mjs` · `tests/browser/o-footer-refinement.mjs`

## Implementation Steps
1. `:30` — replace only the md template: `md:grid-cols-[1fr_auto_auto_auto]` → `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` (keep `grid grid-cols-2 gap-x-6 gap-y-8` and `md:gap-x-6` byte-identical).
2. `:31` — brand div: `className="col-span-2 md:col-span-1"` → `className="col-span-2 md:col-span-1 md:col-start-1"`.
3. `:32` — `<BrandLogo size={44} ...>` → `<BrandLogo size={88} ...>` (keep `className="mb-3"`).
4. `:39` — nav1 `<div>` → `<div className="md:col-start-3">`.
5. `:55` — nav2 `<div>` → `<div className="md:col-start-4">`.
6. `:79` — nav3 `<div>` → `<div className="md:col-start-5">`.
7. Visual sanity at :3000 `/vi`: 1280 — logo clearly doubled and aligned with 48px wordmark, cluster right-of-center with visible right margin, 48px brand↔nav gap vs 24px nav gaps; 768 same pattern; 375 — logo 88 on full-width brand row, no overflow.
8. Compile check (`.claude/rules/primary-workflow.md`): `npm run lint` (exit 0) → stop dev → `npm run build` (exit 0) → restart dev.
9. Contract smoke: `node tests/browser/m-footer-brand.mjs` → 24/24 + `node tests/browser/o-footer-refinement.mjs` → 19/19 (proves zero regression before P2 adds checks).

## Todo List
- [ ] Edit `footer.tsx:30` md grid template (6 tracks)
- [ ] Edit `footer.tsx:31` brand `md:col-start-1`
- [ ] Edit `footer.tsx:32` logo `size={88}`
- [ ] Edit `footer.tsx:39/:55/:79` nav `md:col-start-3/4/5`
- [ ] Visual check 1280 / 768 / 375 on `/vi`
- [ ] `npm run lint` → exit 0
- [ ] `npm run build` → exit 0 (dev stopped during build, restart after)
- [ ] `node tests/browser/m-footer-brand.mjs` → 24/24 · `node tests/browser/o-footer-refinement.mjs` → 19/19
- [ ] Hand off to P2 (new test + pipeline + changelog)

## Success Criteria
- Structure preserved: `footer .grid` = exactly 4 children, title order `["DuanMar", tours, contact, info]`, bottom bar `mt-8` intact (F1/F2/O1a/O1b green).
- Ratio math native: measured brand→nav1 = **48±2px**, nav gaps = **24±2px** each, ratio ∈ [1.9, 2.1] @1280 (pure `column-gap` + 0-track; no margin/padding added).
- Computed targets @1280 (grid ≈1248px, cluster 313px measured): brand track ≈575px → cluster.left ≈**623**, cluster.right ≈**936**, cluster center ≈**780** (grid center 624 → Δ+156 ≥ 50) → right margin ≈**312px** (≥60). @768 (grid ≈736): cluster.left ≈282, Δcenter ≈+71, right margin ≈141. @375: layout unchanged, logo 88±2 fits brand row, zero overflow.
- Logo = 88×88±2 at 1280 AND 375; wordmark still 48±0.5 @1280 / 36±0.5 @375; header logo ≤40 (H5).
- Existing suites: `m-footer-brand` 24/24 · `o-footer-refinement` 19/19 · lint + build exit 0 · diff confined to 6 lines of `footer.tsx`.

## Risk Assessment
- **Auto-placement on 6 tracks**: mitigated by explicit `md:col-start-*` on all 4 children; even if `col-span` shorthand overrides brand's `col-start`, auto-placement resolves brand to col 1 (only free cell in row 1) — Q7/O1a verify.
- **Mobile regression**: all new classes `md:`-prefixed; base `grid-cols-2` + `col-span-2` untouched → O7b/Q15 verify brand spans grid ±2.
- **fr share vs min-content @768**: brand track ≈234px vs wordmark ≈215px floor → fits; if EN cluster widens, track6 shrinks toward 0 before any overflow (auto tracks shrink to min-content; min sum ≈535 < 736).
- **Logo 88 container fit**: 88 < 215 wordmark floor → no track growth; Q10 (wm.right ≤ brand.right) + O4b verify no spill.
- **Cascade order `col-span` vs `col-start`**: both orders resolve to track 1 (see auto-placement) — non-blocking, covered by Q7.

## Security Considerations
None — pure className/prop change on presentational markup. No hrefs, i18n keys, semantics, data fetching, or storage touched; no new network surface.

## Next Steps
- P2: `tests/browser/q-footer-asym-layout.mjs` (20 checks) + full pipeline + `docs/project-changelog.md` EOF + status flips → `reports/plan-summary.md`.
