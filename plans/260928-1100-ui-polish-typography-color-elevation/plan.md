# UI Polish — Typography, Color Muting & Component Elevation — Plan

**Date**: 2026-09-28
**Type**: Feature Implementation (brand copy + palette tone + elevation + type weight)
**Status**: Planning
**Work Context**: `D:\tour` — `src/` READ-ONLY while planning; this dir is the only write target until approval.

## Executive Summary
4 accepted criteria, all token-driven: (1) brand `DuanMAR` → `DuanMar` (35 hits in `src/`), (2) primary red muted to `oklch(0.444 0.177 25.331)`, (3) soft layered elevation on cards/controls + ~+4px spatial volume, (4) body weight 400 → 450. Est. touch ≈ 40 files, **0 new `src/` files**, 1 changelog append.

## Context Links
- Summary: [reports/plan-summary.md](reports/plan-summary.md)
- Rules: `.claude/rules/{primary-workflow,development-rules,documentation-management}.md`
- Prior art: `plans/260927-2100-global-theme-redesign-brand-migration/` (created the 35 `DuanMAR` hits), `plans/260927-2345-force-apply-theme-brand-updates/evidence/` (screenshot pattern)
- Changelog: `docs/project-changelog.md` — append under existing `## 2026-09-28`

## Phases (order mandatory 1 → 2 → 3 → 4 → 5)

| # | Phase | File | Status | Progress |
|---|-------|------|--------|----------|
| 1 | Brand rename `DuanMAR` → `DuanMar` | [phase-01-brand-rename.md](phase-01-brand-rename.md) | Pending | 0% |
| 2 | Primary red tone-down (light + dark) | [phase-02-color-tone-down.md](phase-02-color-tone-down.md) | Pending | 0% |
| 3 | Elevation + spatial volume | [phase-03-elevation-and-volume.md](phase-03-elevation-and-volume.md) | Pending | 0% |
| 4 | Body font weight 400 → 450 | [phase-04-typography-weight.md](phase-04-typography-weight.md) | Pending | 0% |
| 5 | Verify, evidence, changelog | [phase-05-verify-and-evidence.md](phase-05-verify-and-evidence.md) | Pending | 0% |

Phases 1/2/4 are independent text/token edits; phase 3 shares `globals.css` with 2 → run after it; phase 5 gates everything.

## Binding Decisions (user-approved — MUST NOT change)
1. **Red light**: `oklch(0.444 0.177 25.331)` (resolves ≈ **#9F0618**, not exactly #991B1B) on `--primary:59`, `--ring:71`, `--chart-1:72`, `--sidebar-primary:80`, `--sidebar-ring:85` (all currently `oklch(0.5 0.19 25)`).
2. **Elevation**: `--shadow-soft` resting on `Card` + the 43 `rounded-xl border` page-card sites; hover lift = `shadow-md`; controls get subtle resting shadow; re-point 3 `hover:shadow-lg/md` sites; REMOVE `ring-1 ring-foreground/10` from `card.tsx:14`; **no header shadow**.
3. **Weight**: `--font-weight-body: 450` in `@theme inline` + `font-body` on `body` in `@layer base`; weight scale (`font-medium/semibold/bold`, 169 lines) untouched.
4. **Rename**: all 35 `src/` hits + ONE new changelog entry; historical changelog (4 lines) and `plans/` (36 hits) stay; never touch git remote or `vietnam-tourism*` identifiers.

## Planner Decisions (resolved here — rationale in phase files)
- **Dark primary `oklch(0.62 0.17 25)` (≈#DA534F)** — the researcher-suggested `0.55` FAILS WCAG (3.39:1 on dark card / 3.76:1 on dark bg); dark `--primary-foreground` is near-black, so buttons need primary ≥4.5:1. Contrast table: phase-02.
- **Page-card elevation = ONE `@layer components` rule** (`.rounded-xl.border`) instead of 43 bulk edits / 32 files — DRY/KISS, guaranteed 43/43 coverage, opt-out via `shadow-none`; explicit-bulk fallback documented in phase-03.
- **Control heights → `h-9` family** (button default/icon, input, select trigger; `lg`/`icon-lg` → `h-10`) — booking form already pairs `h-8` inputs with an `h-9` submit and 8 page CTAs are already `h-9`.
- **Card padding floor** `p-4` → `p-5` (5 of 6 sites; fixed-width ticker keeps `p-4`) + `--card-spacing` 4 → 5.
- **Unchanged**: `--destructive` (both modes), `--chart-2` (tint still valid), overlay shadows (`sheet.tsx:56`, `select.tsx:85`), ghost/link buttons, dead `navigation-menu.tsx`, `.dark` shadow override (deferred — dark mode is dormant: no toggle in `src/`).

## Verification (phase-05)
`npm run lint` · `npm test` (11/11, EN/VI parity) · `npm run build` (not while dev holds `.next`) · dev on :3000 + `npm run test:browser` (7/7) · grep gates (rename, tokens) · contrast table · evidence screenshots → `evidence/{home-vi,home-en,checkout}.png`.

**Baseline caveat**: working tree has NO clean baseline (single `init` commit, 51 pre-dirty paths from plans `260927-2100/2345`, `260928-0010`, incl. `tests/browser/{f-ui,h4-p4-e2e}.mjs`). `git diff` cannot isolate this feature → all gates are **grep/count based**; nothing gets committed (explicit request required).

## Scope Guardrails
- **In**: `src/app/globals.css`; 35 rename spots in `src/`; `src/components/ui/{card,button,input,textarea,select}.tsx`; 5 padding sites; 3 hover sites; `docs/project-changelog.md` (append only).
- **Out**: `tests/` (0 rename hits; no size/padding/shadow assertions — verified), `docs/` history, `plans/` history, `package.json`, git remote, `public/`, header shadow, dark-mode shadow override.
