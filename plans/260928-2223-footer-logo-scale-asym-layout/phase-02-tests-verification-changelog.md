# Phase 02 — New Test `q-footer-asym-layout.mjs` + Verification + Changelog

**Status**: Complete · **Priority**: High · **Depends on**: P1 (footer edits landed + smoke green)

## Context Links
- Boilerplate source: `tests/browser/o-footer-refinement.mjs:1-64` (imports, `check()` harness, `go()` locale cookie, `measure()` returning `children/titles/gridW/gridRight/childRects/wm/overflow/mdMatch/logo/tagline`) — **copy, then extend** with `gridLeft` (grid rect left) + `logoRect` (footer logo `getBoundingClientRect()`, query `img[src*="logo-duanmar"]` inside `footer .grid`).
- Contracts to respect (0 edits): `o-footer-refinement.mjs:77,78,84,100,106-107,108-113,127,132,142-152,156,164` (19 checks) · `m-footer-brand.mjs:103,104,135,97,179` (24 checks) · screenshots pattern `:114,:137,:153`.
- Runner: `tests/run-browser.mjs:23-25` — sorted glob, new file `q-footer-asym-layout.mjs` → **16 files**; `package.json:11` `test:browser`. Only 2 test files reference footer today (`m-footer-brand`, `o-footer-refinement`); no other file constrains footer.
- Data: none from CMS — labels from `src/messages/vi.json` runtime-read (`o-footer-refinement.mjs:7-9` pattern).
- Changelog: `docs/project-changelog.md` (360 LOC, `## 2026-09-28` at `:261`, EOF append) — house style = VN bullets, `Verified:` line, `Docs impact:` line (see `260928-2030` entry tail).

## Overview
- **Priority**: High · **Status**: Complete · **Effort**: ~45 min (1 test file ~190 LOC + pipeline + changelog)
- Deliver: NEW `tests/browser/q-footer-asym-layout.mjs` (**20 checks + 3 screenshots**) proving AC1 (88px logo), AC2 (center-right), AC3 (native 1:2 gaps) at 1280/768/375; full pipeline; changelog entry; status flips; code-review delegation.

## Key Insights
- Reuse `measure()` geometry — child rects already yield every gap/cluster metric; only logo px + grid left are missing (extend, don't rewrite — DRY vs `o-footer`).
- Brand↔nav1 gap (48) must NOT be asserted by `o-footer` O5a (pairs 1-2/2-3 only, ≤25) — that asymmetry is exactly why binding X=24 keeps the old suite green while the new suite owns the 48px brand gap.
- Gap values are width-independent (fixed `0` track) → strict 48±2 / 24±2 tolerances hold @768 too; only cluster *position* thresholds need headroom (est. Δcenter +156 @1280, +71 @768 vs guard 50; right margin ≈312/141 vs guard 60).
- Suite grows 15→16 files → expect **15/16**, sole fail `revalidate-webhook.mjs` (missing `SANITY_REVALIDATE_SECRET`, pre-existing — never edit).

## Requirements
- 20 checks (names final, tolerances binding):
  - **Q1a** logo 88×88 (w AND h, ±2) @1280 · **Q1b** logo 88×88 ±2 @375 (AC1 exact 2x)
  - **Q2** brand→nav1 gap = 48±2 @1280 (`childRects[1].left − childRects[0].right`)
  - **Q3** nav1→nav2 gap = 24±2 @1280 · **Q4** nav2→nav3 gap = 24±2 @1280 (X)
  - **Q5** ratio `brandGap / navGap` ∈ [1.9, 2.1] @1280 (AC3)
  - **Q6** center-right: cluster center − grid center ≥ **50px** @1280 (dead-center guard; grid center = `gridLeft + gridW/2`)
  - **Q7** not flush: `gridRight − childRects[3].right` ≥ **60px** @1280
  - **Q8** structure guard: exactly 4 children + title order `["DuanMar", vi.footer.tours, vi.footer.contact, vi.footer.info]` (local dup of F1/O1b)
  - **Q9** wordmark 48±0.5 @1280 (O2a parity) · **Q10** `wm.right ≤ childRects[0].right + 1` (logo didn't break container)
  - **Q11** logo + tagline present (O8a/F8 parity)
  - **Q12** @768: `mdMatch` + brandGap 48±2 + nav gaps ≤25 + overflow ≤1 (STRICT not relaxed — 0-track makes 48 width-independent; reuse O6a viewport-bump-to-800 guard `o-footer-refinement.mjs:120-125`)
  - **Q13** @768 not-flush: right margin ≥60
  - **Q14** @375: no horizontal overflow (≤1) · **Q15** @375 brand spans grid ±2 (O7b parity) · **Q16** @375 logo fits brand block (`logo.width 88±2 && logo.right ≤ childRects[0].right + 1`)
  - **Q17** brand.right ≤ nav1.left + 1 @1280 (O6b parity @desktop) · **Q18** zero pageerrors
  - Screenshots (artifacts, not checks): `q-footer-01-1280.png`, `q-footer-02-768.png`, `q-footer-03-375.png` → `tests/.output/`
- Zero edits to any existing test/runner; new file only; EN parity not required (layout asserted on `/vi`, same geometry class rules for EN — KISS/YAGNI).
- Changelog EOF `### Changed` entry (VN bullets, `Verified:` + `Docs impact: minor`); flip plan/phase statuses → Complete; fill `reports/plan-summary.md` actual results.

## Architecture (short)
Test flow mirrors `o-footer`: read `vi.json` → open `/vi` @1280 (cookie `NEXT_LOCALE`) → extend-`measure` → Q1-Q11 + Q17-Q18 @1280 → viewport 768 (bump 800 guard) → Q12/Q13 → viewport 375 → Q14-Q16 → screenshot per viewport → print `ok/FAIL` lines, exit 1 on any failure (same harness contract as siblings).

## Related Code Files
- **Create**: `tests/browser/q-footer-asym-layout.mjs`
- **Modify**: `docs/project-changelog.md` (EOF append) · `plan.md` + phase files + `reports/plan-summary.md` (statuses → Complete, actual results)
- **Delete**: none
- **Read-only**: `o-footer-refinement.mjs` (boilerplate) · `m-footer-brand.mjs` · `run-browser.mjs` · `src/components/layout/footer.tsx` (P1 output) · `src/messages/vi.json`

## Implementation Steps
1. Copy `o-footer-refinement.mjs:1-64` boilerplate → `q-footer-asym-layout.mjs`; keep imports/`check`/`go` identical; extend `measure` with `gridLeft` and `logoRect {width, height, right}` (footer img only, NOT header).
2. Implement Q1a-Q18 per Requirements (each `check("Qn ...", cond, detail)` with measured values in detail strings).
3. Screenshots at 3 viewports named `q-footer-01..03` (footer element shot, same pattern as `o-footer:114,137,153`).
4. Dev on :3000 → `node tests/browser/q-footer-asym-layout.mjs` → 18/18 first target; debug via detail strings (never weaken tolerances to pass).
5. **Pipeline (mandated order)**: `npm run lint` (0) → `npm test` (**15/15**) → stop dev :3000 (`netstat -ano | grep LISTENING | grep :3000`, kill `taskkill //PID <n> //F`) → `npm run build` (exit 0; routes unchanged, tours stay `ƒ`) → restart dev detached `(npm run dev > /c/Users/Lenovo/AppData/Local/Temp/next-dev.log 2>&1 &)` → `npm run test:browser` (**16 files → 15/16**, sole fail `revalidate-webhook.mjs`).
6. Eyeball gate: `o-footer-refinement` all 19 ok (esp. **O5a 24≤25**), `m-footer-brand` 24/24, `l-navbar` + `g-reviews` green; review `q-footer-01..03` screenshots for lockup alignment (AC1 "graceful") + center-right look.
7. Changelog: append at EOF of `docs/project-changelog.md`:
   ```
   ### Changed
   - **[UI/UX] Footer: logo 2x (44→88px) + layout bất đối xứng center-right** (plan `260928-2223-footer-logo-scale-asym-layout`)
     - AC1: `footer.tsx:32` `<BrandLogo size={44}>` → `size={88}` (exact 2x mọi breakpoint, call-site footer ONLY — `brand-logo.tsx`/`header.tsx` không đổi → H5 header ≤40px giữ) · wordmark/tagline giữ nguyên (O2a 48px, O7c 36px)
     - AC2: `footer.tsx:30` `md:grid-cols-[1fr_auto_auto_auto]` → `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` + `md:col-start-1/3/4/5` (`:31/:39/:55/:79`) — cụm nav chuyển từ áp sát phải → **center-right** (track `0.5fr` rỗng hút 1/3 slack; ước lượng @1280: center ≈780 vs 624, lề phải ≈312px)
     - AC3: tỉ lệ gap **1:2 native** — X=24px nav↔nav (`md:gap-x-6` giữ nguyên), 2X=48px brand↔nav1 = gap + track `0` + gap (0 margin/padding; `col-start` = placement logic) · 4 children trực tiếp + thứ tự + class `grid`/`mt-8` không đổi
     - Tests: NEW `tests/browser/q-footer-asym-layout.mjs` **20 checks** (logo 88±2 @1280+375 · gap 48±2/24±2/24±2 + ratio [1.9,2.1] · center-right Δ≥50 + lề phải ≥60 @1280/768 · structure 4+titles · wordmark 48±0.5 + không tràn cột · logo/tagline · @768 md+gap strict · @375 overflow+col-span-2+logo fit · 0 pageerror) — **0 sửa test cũ/runner**
     - Verified: lint exit 0 · `npm test` **15/15** · `npm run build` exit 0 (dev dừng khi build) · `npm run test:browser` **15/16** (fail duy nhất `revalidate-webhook` = env pre-existing, không sửa) · evidence `tests/.output/q-footer-01-1280.png`, `q-footer-02-768.png`, `q-footer-03-375.png`
     - Docs impact: minor (changelog này + plan statuses Complete)
   ```
8. Flip `plan.md` (Status/Progress + phase table) + both phase files (`Status: Complete`) → fill `reports/plan-summary.md` "Actual results (post-implementation)" with measured numbers.
9. **Final step**: delegate to `code-reviewer` agent (work context `D:\tour`, reports `D:\tour\plans\reports\`) over the diff `git diff src/components/layout/footer.tsx` + new test file; address findings before done.

## Todo List
- [ ] Create `tests/browser/q-footer-asym-layout.mjs` (boilerplate + extended measure)
- [ ] Implement Q1a-Q18 with tolerances above
- [ ] Screenshots ×3 (`q-footer-01..03`)
- [ ] Local run → 18/18
- [x] `npm run lint` → 0 · `npm test` → 15/15
- [x] Stop dev → `npm run build` → exit 0 → restart dev detached
- [x] `npm run test:browser` → 15/16 (only `revalidate-webhook`)
- [x] Eyeball: o-footer 19/19 (O5a 24≤25), m-footer 24/24, l-navbar, g-reviews, screenshots
- [x] Append changelog `### Changed` block (VN, Verified, Docs impact)
- [x] Flip plan/phase statuses → Complete · fill `reports/plan-summary.md` actual results
- [x] Delegate code-review · resolve findings (DONE_WITH_CONCERNS: P2 screenshot occlusion fixed — header hidden pre-shot; doc counts 18→20 normalized)

## Success Criteria
- New suite 20/20; existing suites untouched and green (`m-footer-brand` 24/24, `o-footer-refinement` 19/19 — **0 edits** to either, proven by `git status` + mtime window: both files predate feature start; contract files untracked in single-commit repo so `git diff tests/` is not a valid proof).
- Gates: lint 0 · unit 15/15 · build 0 · browser **15/16** (sole fail `revalidate-webhook`, pre-existing).
- AC evidence: logo 88±2 both viewports; gaps 48/24/24 with ratio ∈[1.9,2.1]; cluster Δcenter ≥50 & right margin ≥60 @1280+768; no overflow @375/768/1280.
- Changelog entry present with `Verified:` + `Docs impact: minor`; all plan statuses Complete; `reports/plan-summary.md` filled.

## Risk Assessment
- **Tolerance flakiness**: geometry deterministic (server-rendered static layout, no animation) — tolerances ±2px; if a value lands borderline, investigate root cause, do NOT widen silently.
- **Screenshot/eyeball subjectivity**: "graceful" wordmark alignment is visual-only (no contract) — if cramped under 88px logo, apply open Q1 (`mb-3`→`mb-4`) and note it; never touch wordmark sizes (contracts).
- **Runner order/count**: `q-` sorts after `p-`, before `revalidate-` → summary line `15/16`; do not mistake the known env failure for regression.
- **Dev/build conflict**: build requires dev stopped (`:3000` port + `.next` lock) — follow stop/restart steps exactly; verify dev reachable (runner `:14-21` fails fast otherwise).
- **Changelog style drift**: copy draft in Implementation Steps (matches `260928-2030` entry structure) rather than free-writing.

## Security Considerations
None — read-only test + presentational class changes; no secrets, no new endpoints, no `revalidate-webhook.mjs` touch (its env-var failure is tolerated, not "fixed", to avoid masking config issues).

## Next Steps
- Code-review delegation (step 9) → then session complete; follow-ups deferred: optional `mb-3` tweak (Q1), `0.5fr` slack tuning — only if visual review objects.
