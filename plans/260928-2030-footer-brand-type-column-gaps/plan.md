# Footer Brand Type + Column Gaps Refinement — Plan

**Date**: 2026-09-28 · **Type**: UI/UX · **Status**: Complete · **Progress**: 100%

## Executive Summary
AC1: footer "DuanMar" wordmark enlarged **200–300%** (16 → 36px mobile / 48px md+) via **footer call-site className only** — elegantly styled (`leading-none tracking-tight font-bold`), keeps logo + tagline lockup, no column break. AC2: 3 nav lists collapse from 4×`1fr` (32px gaps, ~928px spread @xl) into a **compact right-hugging cluster** (`auto` tracks + 24px gaps, measured **313px = 25%** of grid) on desktop AND tablet; mobile grid unchanged. Touch: 2 class strings in `footer.tsx` + new browser test `o-footer-refinement.mjs` (~19 checks) + changelog. 0 edits to shared components/existing tests.

## Context Links
- **Reports**: `reports/plan-summary.md` · phases: `phase-01-footer-style.md`, `phase-02-tests-verification-changelog.md`
- **Code**: `src/components/layout/footer.tsx:30` (grid) · `:31-37` (brand block, h3 `:33`, wordmark span `:34`, tagline `:36`) · `:39-53` tours · `:55-77` contact · `:79-93` info · `:96` bottom bar `mt-8`
- **Shared (read-only)**: `src/components/layout/brand-wordmark.tsx:4-6` (`cn("font-brand", className)`, no size) · `src/components/layout/header.tsx:36` (`text-xl font-bold` = 20px) · `src/app/globals.css` (`@theme inline` `:7`, `--font-brand` `:12`, no `--text-*`, no h1-h6/footer rules)
- **Precedent**: `src/components/homepage/hero-section.tsx:37` (`text-4xl md:text-6xl font-bold tracking-tight`) · `src/components/ui/card.tsx:27` (arbitrary `grid-cols-[1fr_auto]`)
- **Test contracts**: `tests/browser/m-footer-brand.mjs:28-47` (direct children of `footer .grid`), `:103` F1=4 children, `:104-108/:166` F2 title order, `:109-134` F3-F7 index links by child, `:135-139` F8 brand=child0+logo+tagline, `:140-147` F9 `footer .mt-8 a`, `:86+97` H5 overflow ≤0 @1280, `:148` F10 legacy hrefs · `tests/browser/h4-p4-e2e.mjs:262-274` no page overflow @375×812
- **Rules**: `.claude/rules/primary-workflow.md` (compile check after edit) · `.claude/rules/documentation-management.md` (phase structure) · `docs/project-changelog.md:261` (`## 2026-09-28`)

## Binding Decisions (do not re-ask)
1. **AC1 class** — `footer.tsx:34` → `<BrandWordmark className="text-4xl md:text-5xl font-bold tracking-tight leading-none" />`: 36px (225%) mobile, 48px (300%) md+; h3 wrapper stays `<h3 className="mb-4">`; text stays exactly `DuanMar`. Rationale: 48px wordmark ≈190px wide — fits mobile `col-span-2` (343px @375) and md+ brand track made ≥190px by AC2's `1fr`.
2. **AC2 class** — `footer.tsx:30` → `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1fr_auto_auto_auto] md:gap-x-6`: nav-to-nav gap **32→24px**, nav tracks **max-content** (cluster ~928→313px (measured) @xl ≈ 60% shrink), brand `1fr` absorbs slack → nav group hugs right. Vertical gap unchanged (32px); base `gap-x-6` = `md:gap-x-6` (same value, explicit); literal class `grid` kept; mobile `grid-cols-2` unchanged (brand `col-span-2 md:col-span-1` still valid).
3. **No wrapper divs / no reordering** of the 4 grid children; keep `grid` + `mt-8` literal classes → `m-footer-brand.mjs` F1-F10 stay green (must still pass 24/24).
4. **0 edits**: `brand-wordmark.tsx`, `globals.css`, `header.tsx`, `m-footer-brand.mjs`, any existing test, `tests/browser/revalidate-webhook.mjs` (known env failure — never touch).
5. Screenshots → `tests/.output/` evidence only (gitignored); no pixel-diff tooling; no test asserts grid-template/gap/font-size/letter-spacing/line-height today (verified 0 hits) → style changes are test-safe.

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Depends on | Verification |
|---|-------|--------|----------|-----------|-----------|--------------|
| 1 | Footer AC1 wordmark size + AC2 grid tracks/gaps (2 class strings) | Complete | 100% | [phase-01](phase-01-footer-style.md) | — | lint, build, DOM `footer .grid` |
| 2 | Browser test `o-footer-refinement.mjs` + pipeline + changelog + status flip | Complete | 100% | [phase-02](phase-02-tests-verification-changelog.md) | P1 | build, `test:browser` 13/14, changelog |

## File Allow-List (exact)
- **Modify (3)**: `src/components/layout/footer.tsx` (`:30`, `:34` only) · `docs/project-changelog.md` (append `### Changed` under `## 2026-09-28` `:261`) · `plan.md` + phase files (Status → Complete, P2)
- **Create (2)**: `tests/browser/o-footer-refinement.mjs` · this plan dir (`plans/260928-2030-footer-brand-type-column-gaps/` + `reports/`)
- **Delete: 0.** NO edit: `brand-wordmark.tsx`, `globals.css`, `header.tsx`, `m-footer-brand.mjs`, `h4-p4-e2e.mjs`, any existing test.

## Global Verification (every phase)
`npm run lint` → `npm test` (14/14) → **stop dev** → `npm run build` (exit 0) → start dev `:3000` → `npm run test:browser` (**14 files → expect 13/14**; only pre-existing `revalidate-webhook` env failure tolerated).

## Key Risks
- **Horizontal overflow** contracts: `m-footer-brand.mjs:86+97` @1280×900, `h4-p4-e2e.mjs:262-274` @375×812 — new wordmark must pass explicit O4/O6/O7 checks at 375/768/1280.
- **AC1↔AC2 coupling**: 48px wordmark relies on AC2 giving brand track ≥190px at md; if AC2 reverts, AC1 can overflow → ship both in same phase.
- **`1fr` min-content floor**: wordmark is one unbreakable word → brand track floor ≈190px at md (tablet grid ≈736px: 190 + 48 gaps + 3 nav min-content ≈ 350 → fits).
- **Auto-track locale width**: EN/VI max-content differ; `auto` tracks shrink toward min-content when tight (grid overflows only below min-content) — O5/O6 assert gaps + no overflow on both locales' layout at 768/1280.
- **md breakpoint boundary @768**: classic scrollbar can drop `clientWidth < 768px` → `md:` not applied at viewport 768; test guards by bumping to 800×1024 if `matchMedia("(min-width:768px)")` fails (documented in O6).

## Unresolved Questions
None — scope approved, binding decisions above fixed.
