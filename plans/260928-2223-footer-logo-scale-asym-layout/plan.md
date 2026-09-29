# Footer Logo Scaling + Asymmetrical Center-Right Layout — Plan

**Date**: 2026-09-28 · **Type**: UI/UX · **Status**: Complete · **Progress**: 100%

## Executive Summary
AC1: footer left-column logo **44 → 88px (exact 2x, all breakpoints)** — footer call-site only (`footer.tsx:32`). AC2: 3 nav columns sit **center-right** (not flush-right, not dead-center) via 6-track desktop grid `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` (empty `0` + `0.5fr` tracks carry the asymmetry). AC3: strict 1:2 gap ratio, desktop-native: X=24px nav↔nav, 2X=48px brand↔nav1 = `column-gap` 24 + zero-width track + `column-gap` 24 — **no magic margins/paddings**. Touch: 5 small edits in `footer.tsx` + NEW browser test `q-footer-asym-layout.mjs` (20 checks) + changelog. **0 edits to any existing test** — `o-footer-refinement.mjs` (O5a ≤25px) and `m-footer-brand.mjs` (24 checks) stay green as-is.

## Context Links
- **Reports**: `reports/plan-summary.md` · phases: `phase-01-footer-layout-and-logo.md`, `phase-02-tests-verification-changelog.md`
- **Code**: `src/components/layout/footer.tsx:28` root · `:29` container · `:30` grid · `:31-37` brand (`:32` `<BrandLogo size={44} className="mb-3">`, `:34` wordmark `text-4xl md:text-5xl`, `:36` tagline) · `:39/:55/:79` nav cols (bare `<div>`) · `:96` bottom bar `mt-8` (contract literal)
- **Read-only**: `src/components/layout/brand-logo.tsx:6,15-22` (`size` prop → width/height, default 36) · `src/components/layout/header.tsx:28` (`size={36}` — H5 asserts ≤40px, **NEVER touch**) · `src/components/layout/brand-wordmark.tsx:4-6`
- **Test contracts**: `tests/browser/o-footer-refinement.mjs:31-64` (measure harness — boilerplate for new test), `:77` O1a=4 children, `:78` O1b titles, `:84` O2a 48px@1280, `:100` O4b wordmark fits, `:106-107` **O5a nav gaps (pairs 1-2, 2-3 ONLY) ≤25px** (brand pair deliberately unmeasured), `:108-113` O5b cluster ≤55%, `:127-131` O6a @768, `:132-136` O6b brand.right ≤ nav1.left, `:142-152` O7a/b/c @375, `:156` O8a logo+tagline, `:164` O10 · `tests/browser/m-footer-brand.mjs:103` F1=4, `:104-108` F2 order, `:135-139` F8 logo+tagline, `:97` H5 header ≤40px, `:179` F11
- **Runner**: `tests/run-browser.mjs:23-25` globs `tests/browser/*.mjs` sorted (15 files → 16 with `q-`) · `package.json:9-11` scripts
- **Rules**: `.claude/rules/documentation-management.md` (phase structure) · `.claude/rules/development-rules.md` (KISS/YAGNI/DRY, <200 LOC) · `docs/project-changelog.md` (EOF append after `:360`, `## 2026-09-28` `:261`)

## Binding Decisions (do not re-ask)
1. **X = 24px (gap-6), 2X = 48px (gap-12)** — user's explicit choice. Strict 1:2 via pure grid `column-gap` + empty `0` track → keeps `md:gap-x-6` (24px) as-is → **zero edits to `o-footer-refinement.mjs` / `m-footer-brand.mjs`** (allowed-but-avoided path).
2. **Grid template**: `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` + explicit `md:col-start-1/3/4/5`; children count/order/DOM unchanged (no wrapper divs → F1/O1a/O1b/F3-F8/R1 green). `0.5fr` empty trailing track pulls cluster off right edge (center-right); `1fr` brand absorbs the larger slack share.
3. **Logo**: `footer.tsx:32` `size={44}` → `size={88}` ONLY — never `brand-logo.tsx` default, never `header.tsx:28` (H5 ≤40px). No existing test asserts footer logo px (O8a/F8 = presence only).
4. **Wordmark/tagline**: NO size/class changes — contracts pin 48px±0.5 @1280 (O2a), 36px±0.5 @375 (O7c), presence (O8a/F8). "Graceful alignment" = visual smoke via screenshots.
5. **Rejected alternatives**: wrapper div around navs (breaks F1/O1a 4-children contract) · brand `pr-12` padding (padding = not native per user constraint) · `flex justify-between` (flush-right — violates AC2) · equal `1fr_0.5fr_..._1fr` slack (dead-centers cluster, violates "not dead-center").
6. **Mobile `<md`**: base `grid-cols-2 gap-x-6` + brand `col-span-2` untouched (O7b); all new classes `md:`-prefixed.

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Depends on | Verification |
|---|-------|--------|----------|-----------|-----------|--------------|
| 1 | Footer: 6-track grid + col-starts + logo 88 (5 edits) | Complete | 100% | [phase-01](phase-01-footer-layout-and-logo.md) | — | lint, build, `m-footer-brand` 24/24, DOM geometry |
| 2 | NEW `q-footer-asym-layout.mjs` + pipeline + changelog + status flips + review | Complete | 100% | [phase-02](phase-02-tests-verification-changelog.md) | P1 | build, `test:browser` 15/16, changelog |

## File Allow-List (exact)
- **Modify (2)**: `src/components/layout/footer.tsx` (`:30`, `:31`, `:32`, `:39`, `:55`, `:79` — 6 lines) · `docs/project-changelog.md` (EOF append `### Changed`) · + plan/phase/status files in this dir
- **Create (2)**: `tests/browser/q-footer-asym-layout.mjs` (20 checks) · this plan dir (`plans/260928-2223-footer-logo-scale-asym-layout/` + `reports/`)
- **Delete: 0.** **ZERO edits** to: any existing test/runner (`o-footer-refinement.mjs`, `m-footer-brand.mjs`, `run-browser.mjs`, `revalidate-webhook.mjs`), `header.tsx`, `brand-logo.tsx`, `brand-wordmark.tsx`, `globals.css`, i18n files.

## Global Verification (every phase)
`npm run lint` (exit 0) → `npm test` (**15/15**) → stop dev :3000 (`netstat -ano | grep LISTENING | grep :3000` → `taskkill //PID <n> //F`) → `npm run build` (exit 0; footer on every page, routes unchanged, tours stay `ƒ`) → restart dev detached `(npm run dev > /c/Users/Lenovo/AppData/Local/Temp/next-dev.log 2>&1 &)` → `npm run test:browser` (**16 files → expect 15/16**; sole fail `revalidate-webhook.mjs` = pre-existing env, NEVER edit) → eyeball: `o-footer-refinement` all ok (esp. O5a 24≤25), `m-footer-brand` 24/24, `l-navbar`/`g-reviews` green.

## Key Risks
- **Auto-placement** (6 tracks, explicit col-starts): all 4 children resolve to row 1 (navs definite cols 3/4/5; brand auto-falls to col 1 even if `col-span` shorthand overrides `col-start`) — verified by Q7 + O1a.
- **`0` track fixed-width + fr slack split**: brand↔nav1 = 48px is width-independent; cluster position shifts with locale content (EN/VI) — Q5/Q6 thresholds carry ≥50px headroom (est. Δcenter +156, right margin ≈312 @1280).
- **Container fit @768**: brand track fr share ≈234px vs wordmark min-content ≈215px → fits; guard mirrors O6a viewport bump to 800.
- **Suite count 15→16**: expected **15/16** — only pre-existing `revalidate-webhook` env failure tolerated.

## Unresolved Questions
1. `mb-3` under 88px logo: **default = keep `mb-3`** (unasserted either way; bump to `mb-4` only if screenshots show cramped lockup — note in changelog if changed).
2. Exact center-right slack: `0.5fr` trailing track is tunable (0.4fr→more right-hugging, 0.75fr→closer to center) — fixed at `0.5fr` unless visual review objects.
3. AGENTS.md mandates reading `./README.md` — **file does not exist** in repo root; used `CLAUDE.md`/`AGENTS.md` + `docs/` + `.claude/rules/` for context instead.
