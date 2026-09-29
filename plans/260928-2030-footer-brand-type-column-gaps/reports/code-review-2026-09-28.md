# Code Review — Footer Brand Type + Column Gaps Refinement

**Date**: 2026-09-28 · **Reviewer**: code-reviewer · **Plan**: `plans/260928-2030-footer-brand-type-column-gaps/`
**Verdict**: **APPROVE_WITH_NITS** (0 blocker / 0 major / 3 nit)

## Scope isolation (no clean baseline caveat)

Repo has a single `init` commit → `git diff` shows ALL prior uncommitted work. Isolation method:

| Target | Evidence of THIS-feature delta |
|---|---|
| `src/components/layout/footer.tsx` | Working tree = prior feature (`260928-1835`, brand block at `:31-37`, `col-span-2 md:col-span-1`, contact/info/tour links) + THIS feature's 2 class strings. Prior plan/review records baseline grid `grid grid-cols-2 md:grid-cols-4 gap-8` (`260928-1835/plan-summary.md:11`, `phase-02:69`) and `<BrandWordmark className="font-semibold" />` (`phase-02:57`) at exactly the line numbers this plan edits (`:30`, `:34`) → 2-line delta confirmed; file 128 LOC, no other structural change attributable to 2030. |
| `tests/browser/*.mjs` | `git diff --stat tests/` = 6 modified files, ALL pre-existing: `dismissPromo` wiring (plan `260928-1200-promo-modal-payment-toast/phase-03:14,45,50` explicitly lists all 6), `c-booking` B6 aria-pressed scope (plan `260928-0010` star rating), `f-ui` F7 `text-destructive→text-primary` (plan `260928-1100`), `h4-p4-e2e` date-grid month-nav (plan `260928-1100/phase-05:9`). **0 diff lines from THIS feature** — none mention footer/grid/wordmark. |
| `tests/browser/m-footer-brand.mjs` | Untracked (created by plan `260928-1835`); contracts F1-F10/H1-H5 intact (read + live run). |
| `tests/browser/h4-p4-e2e.mjs:262-274` | Last diff hunk `@@ -198,0 +224 @@`; H8 overflow block (new L262-274) is untouched context. |
| `docs/project-changelog.md` | Single hunk `@@ -259,0 +260,91 @@` = all prior features appended at EOF; THIS feature = last 9 lines (341 → 350 = +9, matches phase-02 recorded baseline 341). |
| Untracked | `plans/260928-2030-footer-brand-type-column-gaps/`, `tests/browser/o-footer-refinement.mjs` — both expected. |

## Findings

| # | Severity | file:line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 1 | nit | `tests/browser/o-footer-refinement.mjs:127,130` | O6a/O6b never assert `t.mdMatch === true`. If the `md:` media query were somehow not applied even after the 800px bump, the mobile 2-col layout also yields 24px col gaps and brand-above-nav → both checks would pass vacuously. Guard makes this unreachable in practice (measured `md=true`), but the assertion is free. | Fold `t.mdMatch === true` into O6a's `ok` condition (detail already prints `md=`). |
| 2 | nit | `tests/browser/o-footer-refinement.mjs:86,146` | O2a/O7c accept any size in [32,48] — desktop check passes even if `md:text-5xl` were dropped (36px still ≥32). Per plan spec (threshold fixed in brief), so not a defect; a `fontSize===48 when mdMatch` pin would make AC1's 300% claim enforced rather than tolerated. | Optional: split O2a into `>=32 && (mdMatch ? ===48 : ===36)`. |
| 3 | nit | `plans/.../plan.md:6` + `reports/plan-summary.md:11` | Plan text says cluster `~928→~370px (~30%)`; actual = **313px / 25%** (changelog + plan-summary "Actual results" both correct). Estimate-vs-actual drift inside plan docs only. | Optional: align plan.md estimate to 313px (already disclosed in `plan-summary.md:34`). |

No blocker/major findings.

## Constraints verified

| Contract | Result |
|---|---|
| **AC1** wordmark `text-4xl md:text-5xl font-bold tracking-tight leading-none` @ `footer.tsx:34` | **PASS** — live: fontSize **48px @1280** (300%), **36px @375** (225%), weight 700, letterSpacing −1.2px, line-height 48/48 (=1.0), width 215.2px, header wordmark 20px → footer ≥ header. |
| `brand-wordmark.tsx` / `header.tsx` / `globals.css` UNCHANGED by this feature | **PASS** — `brand-wordmark.tsx` untracked (new in plan 1835); `header.tsx:36` still `text-xl font-bold` (=20px, matches 1835 plan); `git diff globals.css` adds no `text-4xl/5xl`/`--text-*`/footer rules. All their dirty diffs trace to plans 1835/1100/260927-*. |
| **AC2** `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1fr_auto_auto_auto] md:gap-x-6` @ `footer.tsx:30` | **PASS** — live: nav gaps **24.0/24.0** @1280 and @768 (was 32 via `gap-8`), nav cluster **313px = 25%** of 1248px grid (old math: 3×288+2×32 = 928 = 74%), brand `1fr` absorbs slack (brand right 926.7 vs nav left ≈940), mobile `grid-cols-2` + brand `col-span-2` intact (343/343 @375), `gap-y-8` vertical unchanged. |
| `m-footer-brand.mjs` F1 4 children / F2 title order / F3-F7 child-indexed links / F8 brand=child0 logo+tagline / F9 `footer .mt-8 a` / F10 no legacy hrefs / H5 no overflow @1280 | **PASS** — live **24/24** (F1=4, order DuanMar→Tours→Contact→Information, F3/F4/F5/F6/F7 VI+EN, F8 logo+tagline, F9 4 hrefs + rights, F10 no `/explore|/plan-your-trip|/trade`, H5 overflow=0). |
| `h4-p4-e2e.mjs:262-274` no overflow @375 | **PASS** — lines byte-identical (no diff hunk reaches them); new test independently asserts same contract (O7a, `scrollW ≤ vw+1`, overflow=0 @375). |
| 0 lines changed in any existing test BY THIS feature | **PASS** — 6 dirty test files attributed to prior plans (evidence above); none contain footer/grid/wordmark edits; `m-footer-brand.mjs` untouched. |
| New-test quality | **PASS** — 19 `check()` = 19 reported; thresholds non-vacuous vs old layout (16px<32, ls 0 not <0, 32px gaps >25, 74% >55%, wordmark ≈60px <150); selectors `footer .grid`/`h3 span.font-brand`/`header span.font-brand:not([aria-hidden])` correct; locale copy read from `src/messages/vi.json` runtime (only `/vi/*` hrefs literal, path contract); no sleeps (networkidle2 + `dismissPromo`); screenshots evidence-only into gitignored `tests/.output/` (3 files present); 0 refs to `revalidate-webhook.mjs`; eslint clean → no unused vars. |
| Changelog last entry accuracy | **PASS** — 36/48px ✓, gaps 32→24 ✓, cluster 928→**313**px @1280, 74%→25% ✓ (measured 313/1248), 19 checks ✓, `m-footer-brand` 24/24 ✓, width 215px ✓ (215.2), 14 files → 13/14 claim consistent (14 `tests/browser/*.mjs`, only `revalidate-webhook` = known env fail; full suite not re-run this review). |
| Repo rules | **PASS** — `footer.tsx` 128 LOC (<200); new test 175 LOC; **0 new deps** for this feature (`react-hook-form` in `package.json` = plan 1428, documented); no `*-enhanced` files; kebab-case `o-footer-refinement.mjs`; no secrets/env writes; plan dir status = Complete/100% (plan.md + both phases). |

## Live verification (dev :3000)

| Command | Result |
|---|---|
| `npm run lint` | **exit 0** (0 errors) |
| `npx tsc --noEmit` | **exit 0** |
| `node tests/browser/o-footer-refinement.mjs` | **19/19 passed**, exit 0 (48px/36px, ls −1.2, lh 48, w 215.2, gaps 24.0/24.0 @1280+@768 `md=true`, cluster 313/1248=25%, overflow 0 @1280/768/375, brand 343/343, 0 pageerror) |
| `node tests/browser/m-footer-brand.mjs` | **24/24 passed**, exit 0 |

Not re-run (outside mandated list): `npm test`, `npm run build`, full `npm run test:browser` (13/14 claim) — plan-reported, consistent with file inventory.

## Unresolved questions
None.

**Status:** DONE_WITH_CONCERNS
**Summary:** APPROVE_WITH_NITS — all binding contracts, AC1/AC2 claims and changelog numbers verified live (lint 0, tsc 0, 19/19, 24/24); only 3 nits (missing `mdMatch` assertion in O6, tolerance-range AC1 pin, plan-vs-actual cluster estimate), no blocker/major.

## Post-review fixes (applied)
- **Nit 1** — `o-footer-refinement.mjs` O6a now also asserts `mdMatch === true` (guards against silently testing the mobile layout at 768).
- **Nit 2** — size asserts tightened to exact breakpoints: O2a `47.5–48.5px` @1280 (a dropped `md:text-5xl` now fails), O7c `35.5–36.5px` @375.
- **Nit 3** — plan docs aligned to measured cluster `313px` (was estimate `~370px`).

### Re-verification after fixes
`eslint .` 0 · `o-footer-refinement.mjs` **19/19** · `m-footer-brand.mjs` **24/24** · suite at time of review 13/14 (only `revalidate-webhook` env).

**Final verdict:** APPROVE
