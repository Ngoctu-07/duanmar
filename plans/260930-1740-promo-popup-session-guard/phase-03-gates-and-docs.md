# Phase 03 — Gates + Changelog

**Status**: Pending · **Priority**: P1 · **Plan**: [plan.md](./plan.md) · **Depends**: Phases 01-02

## Overview
Run full gate matrix against stated baselines, classify every browser-suite failure against the known-red list by name, append changelog entry under the existing `## 2026-09-30` section.

## Context Links
- Baselines: lint **0 (0 warn)** · `npm test` **26/26** (26 `tests/unit/*.test.{ts,mts}`, no promo unit) · `npx tsc --noEmit` 0 · `npm run build` 0 · browser suite **30 files**, last full run **18/30**
- Known pre-existing reds (NOT ours): `b-booking-confirmation-email.mjs`, `revalidate-webhook.mjs` (env) + CMS-reseed hcm-hardcoded: `c-booking, c-payment, d8, f-ui, g-reviews, h4, k, n, p-tours, s-tour-hero` (12 named → 18/30 consistent). Draft remediation `plans/260930-1705-ui-downscale-remediation/` **not approved** — do not touch.
- Changelog: `docs/project-changelog.md` (534 lines) — `## 2026-09-30` :509, `### Fixed` :511, `### Added` :519 → insert our entry **after the last `### Fixed` entry, before `### Added` (:519)**; style = Vietnamese prose + English technical terms (see existing entries)
- Build caveat precedent: `docs/project-changelog.md` CSS-404 incident — `npm run build` only with dev server STOPPED, restart `npm run dev` after.

## Related Code Files
**Modify**: `docs/project-changelog.md` — code files untouched in this phase.

## Implementation Steps
1. `npm run lint` → must be **0** (watch for `exhaustive-deps` fallout from phase-01 step 4).
2. `npx tsc --noEmit` → 0.
3. `npm test` → **26/26**.
4. Targeted: dev on :3000 → `node tests/browser/r-entry-popup-cms.mjs` → all checks pass.
5. Full: `npm run test:browser` → report **actual N/30**, classify:
   - (a) `r-entry-popup-cms.mjs` **green** with inverted/new asserts,
   - (b) all **27** `dismissPromo` files: no NEW failure attributable to this fix (presence never asserted there — grep `promo-modal` in `tests/` = only r-entry + helper; suppressed popup → helper early-return),
   - (c) every red ∈ known list **by name**; any other red = NEW → debug before proceeding (do not relabel).
6. Stop dev → `npm run build` → 0 → restart `npm run dev`.
7. Changelog — insert before :519:
   ```markdown
   - **[Fix] Promo popup chỉ mở ở lần load trang đầu / refresh cứng** (plan `260930-1740-promo-popup-session-guard`)
     - `src/components/layout/promo-modal.tsx`: effect bỏ `[locale]` (router-derived) → `[]` deps + `PerformanceNavigationTiming.type` (`navigate`/`reload` chỉ) + `sessionStorage.hasSeenPopup` — không còn re-open khi đổi EN/VI hay khi nav soft; `useLocale` bỏ (chỉ dùng làm dep); `showable` (`enableEntryPopup`/`imageSrc`) chặn ghi flag khi popup bị tắt
     - Hành vi: lần đầu mỗi tab → mở + ghi flag; load document thứ 2 cùng tab → chặn; F5 hard refresh → luôn mở (Option A); `back_forward` → chặn · Chấp nhận: toggle locale không còn re-trigger modal (req override plan `260929-1617`) — modal đang mở có thể đóng khi segment remount
     - Tests: `r-entry-popup-cms.mjs` R15/R16 **đảo assertions** (EN toggle → `count===0` · hard reload → mở lại với EN asset chain D2 giữ nguyên) + NEW R17 (flag) + NEW R18 (2nd doc load blocked) + R2 hygiene fallback · `dismissPromo` helper không đổi
     - Verified: lint 0 · `npm test` 26/26 · `tsc` 0 · `build` 0 · suite browser N/30 (red ⊆ known list) · Docs impact: minor
   ```
   (Fill actual `N/30` after step 5.)

## Success Criteria / Acceptance
- [ ] All gates match baselines (browser: no NEW reds, r-entry-popup green, reds ⊆ named list)
- [ ] Changelog entry present under `## 2026-09-30` → `### Fixed`, correct plan link, actual numbers
- [ ] Dev server back on :3000 after build

## Risk / Rollback
- Pre-existing reds tempt "it was already failing" masking → step 5(c) forces name-level diff vs baseline list.
- Changelog misplacement (`### Added` or wrong date section) → doc-only revert.

## Next Steps
Code review of the 3-file diff; update plan status → `completed`.
