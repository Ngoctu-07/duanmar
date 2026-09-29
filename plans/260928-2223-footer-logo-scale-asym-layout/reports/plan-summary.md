# Plan Summary — Footer Logo 2x + Asymmetrical Center-Right Layout

**Date**: 2026-09-28 · **Plan**: `plans/260928-2223-footer-logo-scale-asym-layout/` · **Status**: Complete (100%)

## Scope
`[UI/UX] Footer Refactor — Logo Scaling & Asymmetrical Proportional Layout` — 6 line edits in `footer.tsx` (logo 44→88, 6-track md grid, 4× `md:col-start`) + NEW browser test `q-footer-asym-layout.mjs` (20 checks) + changelog. **0 edits to existing tests/runners/header/brand-logo/i18n.**

## Phases
| # | Phase | Deliverable | Status |
|---|-------|-------------|--------|
| 1 | `phase-01-footer-layout-and-logo.md` | AC1 `footer.tsx:32` `size={44}`→`{88}` (all breakpoints, footer call-site only). AC2+AC3 `:30` → `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` + `md:col-start-1/3/4/5` (`:31/:39/:55/:79`) → brand↔nav1 = gap+0-track+gap = **48px (2X)**, nav gaps **24px (X)** native `column-gap`, cluster center-right (measured @1280: Δcenter +156, right margin 312). Mobile `<md` untouched. Gates: lint, build, `m-footer-brand` 24/24, `o-footer-refinement` 19/19. | **Complete 100%** |
| 2 | `phase-02-tests-verification-changelog.md` | NEW `tests/browser/q-footer-asym-layout.mjs` **20 checks + 3 screenshots** (logo 88±2 @1280/375 · gaps 48±2/24±2/24±2 + ratio [1.9,2.1] @1280 · center-right Δcenter ≥50 + right margin ≥60 @1280/768 · structure/wordmark/tagline guards · overflow/col-span-2 @375 · 0 pageerror) · full pipeline · changelog EOF `### Changed` · status flips · code-review delegation. | **Complete 100%** |

## Binding decisions (do not re-ask)
- **User's choice: X = 24px (`gap-6`), 2X = 48px (`gap-12`)** — strict 1:2 via pure grid `column-gap` + empty `0` track → `md:gap-x-6` unchanged → **zero edits to `o-footer-refinement.mjs` / `m-footer-brand.mjs`** (O5a measures nav pairs only, ≤25px, stays green).
- Center-right via asymmetric slack `1fr` : `0.5fr` (2:1); rejected: wrapper div (breaks F1/O1a), brand `pr-*` padding (not native), flex `justify-between` (flush-right), equal slack (dead-center).
- Logo change confined to `footer.tsx:32`; `brand-logo.tsx` default + `header.tsx:28` (H5 ≤40px) untouchable; wordmark/tagline sizes contract-pinned (O2a/O7c/O8a) — no changes.
- No wrapper divs, no reordering, literal `grid` + `mt-8` classes kept, all new classes `md:`-prefixed.

## Risks
- **Auto-placement on 6 tracks** → explicit col-starts on all 4 children; both cascade orders of `col-span`/`col-start` resolve brand to track 1; Q7/O1a verify.
- **Center-right thresholds** — computed @1280 (grid 1248, cluster 313): Δcenter ≈+156 vs guard 50, right margin ≈312 vs guard 60; @768 Δ≈+71, margin ≈141 → large headroom; cluster position shifts with EN/VI content width.
- **@768 brand track** fr share ≈234 vs wordmark min-content ≈215 → fits; O6a-style viewport-bump guard reused for scrollbar boundary.
- **Logo 88 fit** — 88 < 215 wordmark floor → no track growth; Q10/Q16 + O4b verify no spill (mobile brand row 343px @375).
- **Suite 15→16 files** → expect **15/16**, sole fail `revalidate-webhook.mjs` (pre-existing env, never edit).

## Verification gates
`npm run lint` (0) → `npm test` (**15/15**) → stop dev :3000 (`netstat` + `taskkill //PID <n> //F`) → `npm run build` (exit 0, routes unchanged) → restart dev detached → `npm run test:browser` (**15/16**, only `revalidate-webhook`) → eyeball: o-footer 19/19 (O5a 24≤25), m-footer 24/24, l-navbar/g-reviews green, screenshots `q-footer-01..03`.

## Docs impact
minor — `docs/project-changelog.md` EOF `### Changed` (VN bullets, `Verified:`, `Docs impact: minor`) + plan/phase status flips. No `docs/*` architecture/roadmap impact (presentational-only change).

## Actual results (post-implementation)
- **Logo**: 88.0×88.0 measured @1280 (Q1a) and @375 (Q1b), fits brand column everywhere (Q10 wmRight 231.2 ≤ colRight 591.1; Q16 mobile).
- **Gaps @1280**: brand→nav1 = 48.0, nav gaps 24.0/24.0, ratio1 = ratio2 = 2.00 (exactly on spec); @768 brand 48.0 + nav 24.0/24.0, 0 overflow.
- **Center-right**: Δcenter = +156 (guard ≥50), right margin = 312 @1280 / 141 @768 (guard ≥60) — right of estimate, no flush-right.
- **Gates**: lint 0 · unit **15/15** · build 0 (dev stopped/restarted) · browser **15/16** files (new `q-footer-asym-layout` **20/20** in-suite; `m-footer-brand` 24/24, `o-footer-refinement` 19/19 zero edits; sole fail `revalidate-webhook.mjs` = pre-existing env).
- **Evidence**: `tests/.output/q-footer-01-1280.png`, `q-footer-02-768.png`, `q-footer-03-375.png` — eyeball PASS (asymmetry + right margin visible, no overflow @375).
- **Deviations**: test = 20 checks (plan est. 18; split Q8a/Q8b + Q12/Q13 counted separately) — names/tolerances as specified; one Q16 guard bug caught pre-run (width→right).

## Open Questions
1. `mb-3` under 88px logo — **kept `mb-3`**; screenshots look balanced (no cramped spacing observed).
2. Trailing slack `0.5fr` **kept as spec'd**; Δcenter +156 / margin 312 leave headroom if visual review wants adjustment later.
3. `./README.md` mandated by AGENTS.md does not exist in repo — context taken from `CLAUDE.md`/`AGENTS.md`/`docs/`/`.claude/rules/`.
