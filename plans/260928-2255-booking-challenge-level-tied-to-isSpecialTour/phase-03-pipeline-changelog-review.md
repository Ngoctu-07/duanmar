# Phase 03 — Pipeline, changelog, status flips, code review

**Status**: Complete · **Priority**: High · **Depends on**: Phase 01 + Phase 02

## Context Links
- Changelog: `docs/project-changelog.md` (360 LOC) — `## 2026-09-28` header `:261`, latest entry `:352-360` (`### Added`, ends `Docs impact: minor`); house sections in use: `### Added` / `### Changed` / `### Fixed` / `### Removed`.
- Plans: `plans/260928-2255-booking-challenge-level-tied-to-isSpecialTour/` (`plan.md` + 3 phases + `reports/plan-summary.md`).
- Pipeline commands: `node_modules/.bin/sanity schemas validate` · `npm run lint` · `npm test` (15 files) · `npm run build` · `npm run test:browser` (15 files) · dev restart `(npm run dev > /c/Users/Lenovo/AppData/Local/Temp/next-dev.log 2>&1 &)`.
- Runner contracts (never edit): `tests/run-unit.mjs`, `tests/run-browser.mjs`; known-tolerated failure `tests/browser/revalidate-webhook.mjs` (missing `SANITY_REVALIDATE_SECRET`, pre-existing).
- Review agent: `.claude/agents/code-reviewer.md` (mandated by `CLAUDE.md` + `.claude/rules/primary-workflow.md` step 3).

## Overview
- **Priority**: High · **Status**: Complete · **Effort**: ~30 min
- Run the mandated repo pipeline end-to-end, append the changelog entry (VN bullets, test-edit precedent note, `Verified:` + `Docs impact: minor`), flip plan statuses to Complete, fill `reports/plan-summary.md` actual results, delegate the code review.

## Key Insights
- Expected counts are FIXED: unit **15/15 files**, browser **15 files → 14/15** (sole fail `revalidate-webhook`). Any other red = stop and fix (never edit runners/webhook to go green).
- Build must keep checkout/tours routes dynamic (`ƒ`) — they are SSR/fetch routes; a `●`/`○` there would mean accidental static optimization.
- Changelog house style = one section header (`### Changed`) with sub-bullets per concern + trailing `Verified:` and `Docs impact: minor` (match `:344-350` shape).
- Eyeball step is cheap and catches what counts miss: `c-booking` (3 vs 4 sections), `o-footer` (untouched baseline), `p-tours` (badges/empty branch).

## Requirements
- **Functional**: 0 lint errors, 0 schema errors, 15/15 unit files, 14/15 browser files (only tolerated fail), build exit 0 with `ƒ` routes; changelog records the spec-changed test edits explicitly.
- **Non-functional**: no source/test edits outside the allow-list during fixes; no commits unless explicitly requested; docs updated (`changelog` + plan statuses + summary).

## Architecture
```
sanity schemas validate ─▶ npm run lint ─▶ npm test (15/15) ─▶ stop dev :3000 ─▶ npm run build (0, ƒ routes)
        ─▶ restart dev ─▶ npm run test:browser (14/15) ─▶ eyeball c-booking / o-footer / p-tours
        ─▶ changelog EOF `### Changed` ─▶ phase statuses Complete ─▶ reports/plan-summary.md actuals ─▶ code-reviewer
```

## Related Code Files
- **Modify**: `docs/project-changelog.md` · `plans/260928-2255-booking-challenge-level-tied-to-isSpecialTour/plan.md` (status/progress) · `phase-01…` / `phase-02…` (status lines) · `reports/plan-summary.md`
- **Create**: none · **Delete**: none

## Implementation Steps
1. `node_modules/.bin/sanity schemas validate` → **0 errors / 0 warnings** (fallback: `bash -c 'set -a; source .env.local; set +a; node_modules/.bin/sanity schemas validate'`).
2. `npm run lint` → exit 0.
3. `npm test` → **15/15 files** (expect `tour-category-queries` 14/14 assertions, `booking-logic` with the 2 new checks).
4. Stop dev on `:3000` → `npm run build` → exit 0; route table keeps `ƒ /[locale]/booking/checkout`, `ƒ /[locale]/tours/domestic|international`, detail/listing dynamic.
5. Restart dev: `(npm run dev > /c/Users/Lenovo/AppData/Local/Temp/next-dev.log 2>&1 &)`; wait for `:3000`.
6. `npm run test:browser` → **14/15 files**; only `revalidate-webhook.mjs` may fail (env pre-existing, never edit).
7. Eyeball: `c-booking.mjs` output shows `B7 sections = SPECIAL ? 4 : 3` ok + `B7 #booking-difficulty present iff SPECIAL` ok; `o-footer-refinement` 19/19; `p-tours-category` 22/22; screenshots `tests/.output/booking-b9-summary.png`, `p-tours-01/02`.
8. **Changelog**: append at EOF under `## 2026-09-28` a `### Changed` entry (VN bullets), shape mirroring `:344-350`:
   - `**[Booking/CMS] Gắn "Cấp độ thử thách" (Section 4) vào toggle isSpecialTour + gỡ bỏ difficultyLevel khỏi schema destination** (plan \`260928-2255-booking-challenge-level-tied-to-isSpecialTour\`)`
   - AC2: `checkout/page.tsx` truyền `isSpecialTour===true` → `BookingForm` → render `BookingDifficultySection` CHỈ khi special (tour thường = đúng Section 1-3 + submit) · `validateBooking(values, capacity?, isSpecialTour?)` — rule `difficultyRequired` chạy only khi flag true.
   - AC3: `booking-summary.tsx` omit key `difficulty` cho tour thường (`...(flag && {difficulty})`) · `TripBooking.difficulty?` optional + `isTripBooking` bỏ yêu cầu key (chống mất dữ liệu My Trips) · `ticket-rows.ts` chỉ render dòng difficulty khi value ≠ `""` (share checkout + my-trips detail) · `my-trips-detail` `?? ""`.
   - AC1: hard-remove `difficultyLevel` (schema `:34-47` · 4 GROQ projections · badge chip `tour-attribute-badges` — component + special chip giữ · `Destination` interface + 2 pass-through · i18n `destinations.difficulty.*` 4 keys ×2 file, parity 789→785, `destinations.special` giữ) · giữ `isSpecialTour` + cập nhật `description`.
   - Tests: **sửa test có sẵn theo spec, có ghi nhận (precedent F7/B6/j-about-contact)** — `c-booking.mjs` data-driven `SPECIAL` (fetch live `isSpecialTour` hcm; 8 chỗ `SPECIAL ? A : B` + 2 check mới `#booking-difficulty` present/absent) · `p-tours-category.mjs` bỏ `LEVELS`/difficulty branches (giữ tên P14/P18) · `tour-category-queries.test.mts` 16→14 · `booking-logic.test.ts` tách check difficulty theo 2 nhánh flag + 2 check mới (`buildTicketRows` row, `listBookings` guard) · `f-ui`/`c-payment`/`d8-a11y` `page.$` guard (fill-boilerplate, 0 assertion đổi).
   - `Verified:` + actual results (lint / unit / build / browser / sanity validate / parity 785).
   - `Docs impact: minor`.
9. Flip statuses: `plan.md` Status → Complete, Progress → 100%; phase-01/02/03 `Status` → Complete; fill `reports/plan-summary.md` **Actual results (post-implementation)** with the real numbers/evidence.
10. **Delegate to `code-reviewer`** (final step) with work context `D:\tour`, reports `D:\tour\plans\reports\`, plans `D:\tour\plans\`; read the report, address blockers/majors, record DONE / DONE_WITH_CONCERNS in the summary.

## Todo List
- [ ] `sanity schemas validate` → 0 errors
- [ ] `npm run lint` → 0
- [ ] `npm test` → 15/15
- [ ] stop dev → `npm run build` → 0 (`ƒ` routes intact)
- [ ] restart dev → `npm run test:browser` → 14/15 (only `revalidate-webhook`)
- [ ] eyeball `c-booking` / `o-footer` / `p-tours` green + screenshots
- [ ] changelog EOF `### Changed` with precedent note, `Verified:`, `Docs impact: minor`
- [ ] flip plan + phase statuses → Complete, fill `reports/plan-summary.md` actuals
- [ ] code-reviewer delegation + findings resolved

## Success Criteria
- Pipeline gates all green at their expected values (0/0/15/0/14).
- Changelog entry exists at EOF, mentions every spec-changed test file, ends with `Verified:` and `Docs impact: minor`.
- Plan/phase statuses = Complete / 100%; `reports/plan-summary.md` has real (non-placeholder) actual results.
- Code-review report saved under `plans/reports/` with no open blockers.

## Risk Assessment
- **A previously green test breaks** (e.g. `g-reviews`/`h4-p4` fixtures) → root-cause first; the likely culprit is the storage guard or ticket-row change; fix in allow-list files only.
- **Build/dev port conflicts** → stop `:3000` before build (Next requires it), restart with the logged command.
- **Changelog drift** → write it from the actual pipeline output, not from this plan's expectations.

## Security Considerations
- No secrets/keys/dotfiles committed; `.env*` untouched; the only new data path is a read-only published-content GROQ call in a test. Changelog/plan contain no credentials.

## Next Steps
- Follow-ups (out of scope, record only): flipping a real doc to `isSpecialTour:true` in Studio activates the special branch in `c-booking`; optional later cleanup of orphaned `destinations.difficulty` values already stored in existing localStorage records (they still render via the legacy path).
