# Phase 04 — Tests + Full Pipeline + Changelog

## Context Links
- Plan: `plan.md` P4 · Research: `research/research-summary.md` §5 (test traps table), §4 (dialog precedent), §1 (1 review/booking/tour)
- Files: NEW `tests/browser/k-review-actions.mjs`; VERIFY `tests/unit/{edit-window,reviews}.test.ts` (written in P1); MODIFY `docs/project-changelog.md`, `plan.md`
- Runners: `tests/run-unit.mjs` (sorted `tests/unit/*.test.{ts,mts}` via `npx tsx`, local `check()`, no framework) · `tests/run-browser.mjs` (requires `npm run dev` on :3000, runs sorted `tests/browser/*.mjs`, prints `N/M files passed`)

## Overview
- Priority: high · Status: pending · Progress: 0% · Est: 0.5 day · Depends on: P1–P3
- New browser suite `k-review-actions.mjs` (K1–K6) proving ownership, menu, time-gate, delete→recalc and the else-fix; full pipeline; changelog entry; plan statuses → Complete.

## Key Insights
- Alphabetical order puts `k-review-actions.mjs` after `g-reviews.mjs` (30 checks, sacred) and before `revalidate-webhook.mjs` (known env failure: missing `SANITY_REVALIDATE_SECRET` — tolerated, do NOT "fix"). Suite count 9 → **10**; expected runner line `9/10 files passed` + `failed: revalidate-webhook.mjs`.
- Harness to copy from `g-reviews.mjs`: browser lib import `:8-14`, `dismissPromo` `:3`, `check()` `:30-35`, `seedProbe`/`cleanup` `:37-100`, storage clear at start `:133-139`, `page.on("pageerror")` `:128`, screenshots → `tests/.output`, exit-on-FAIL tail `:294-300`. Own fixtures: `PROBE_REF = "VN-K-REVIEW"` + orphan `VN-K-OTHER`.
- **1 review per booking per tour** (upsert key `${bookingReference}:${tourSlug}`) → cannot seed two OWNED reviews for one tour; K1's non-owner card = an **orphan** review (`bookingReference: "VN-K-OTHER"`, absent from bookings). Badge recalc asserted with a SINGLE owned review: `4.0` → delete → badge GONE (per binding spec, no averaging pair needed).
- Dialog: register `page.once("dialog", d => d.accept())` BEFORE clicking (precedent `f-ui.mjs:212`); capture `d.message()` inside the handler and assert it equals `vi.json destinations.reviews.deleteConfirm`.
- Expected strings read from `src/messages/vi.json` via `node:fs` (parity test guarantees EN twin) — no hardcoded VI copy beyond what `g-reviews.mjs` already hardcodes.
- Re-seeding an old review = `page.evaluate` write to `vn-reviews:v1` with `createdAt = new Date(Date.now() - 4*3600*1000).toISOString()` + `page.reload()` (never fake the clock).
- Unit coverage already lands with P1 (14 files): `edit-window.test.ts` (boundaries + fail-closed fetch) and `reviews.test.ts` +2 (createdAt preservation, `isMyReview`). P4 only re-runs and patches gaps if review finds one.

## Requirements
**Functional**
1. NEW `tests/browser/k-review-actions.mjs` (~180 ln, MUST be <200) — `TOUR_URL = "http://localhost:3000/vi/explore/destinations/hcm"`, `SECTION = "#customer-reviews"`, `CARD = '[data-testid="review-card"]'`, `TRIGGER/MENU/EDIT/DELETE = [data-testid="review-actions-*"]`, `FORM = '#customer-reviews [data-testid="write-review-form"]'`, `BADGE = '[data-testid="tour-rating-badge"]'`; booking fixture = `g-reviews.mjs:46-62` shape with `reference: "VN-K-REVIEW"`, `fullName: "K Owner"`, `slug: "hcm"`; review fixture = all 9 `isReview` fields (`reference: "VN-K-REVIEW:hcm"`, `tourSlug: "hcm"`, `authorName: "K Owner"`, `authorEmail: "k@example.com"`, `rating: 4`, `comment: "Owned review"`, `images: []`, `createdAt: <fresh ISO>`, `bookingReference: "VN-K-REVIEW"`):
   - **K1 ownership**: clear both keys → seed booking + owned review + orphan review (`VN-K-OTHER:hcm`, `authorName: "K Orphan"`, `bookingReference: "VN-K-OTHER"`) → reload + `dismissPromo` → checks: 2 cards exist; `document.querySelectorAll(`${CARD} [data-testid="review-actions-trigger"]`).length === 1`; the card whose text includes "K Orphan" has 0 triggers; orphan card still VISIBLE (reviews render for everyone — only the menu is owner-gated).
   - **K2 menu open**: click trigger → `await page.waitForResponse(r => r.url().includes("/api/server-time") && r.ok())` → checks: `[data-testid="review-actions-menu"]` present with exactly 2 `[role="menuitem"]`; labels = `vi.json` `reviews.menuEdit` / `reviews.menuDelete`; `EDIT.disabled === false`; trigger `aria-expanded === "true"`; `aria-haspopup === "menu"`; **no `aria-disabled`/`aria-pressed` inside the menu** (`menu.querySelectorAll('[aria-disabled],[aria-pressed]').length === 0`); screenshot `-02-menu.png`.
   - **K3 time gate**: re-seed OWNED review only (drop orphan) with `createdAt = now−4h` → reload → open menu (wait server-time response) → checks: `EDIT.disabled === true` · `getComputedStyle(editBtn).opacity === "0.5"` · `boundingBox() !== null` (still visible) · click attempt: `window.scrollY` unchanged AND form not focused AND no new `pageerror` · FORM path: `FORM` has `aria-disabled="true"` + text contains `vi.json reviews.editWindowClosed` (binding 5, both paths); screenshot `-03-expired.png`.
   - **K4 delete + rating recalc**: re-seed owned review FRESH (`createdAt` now−1m, rating 4) → reload → `BADGE` text starts `4.0` (only review) → open menu → install `page.once("dialog")` capturing message + accept → click DELETE → checks: dialog message === `vi.json reviews.deleteConfirm` · cards === 0 · `BADGE` absent · section text contains `vi.json reviews.empty` · storage payload gone (`JSON.parse(localStorage["vn-reviews:v1"]).every(r => r.reference !== "VN-K-REVIEW:hcm")`); screenshot `-04-deleted.png`.
   - **K5 form cleared (else-fix)**: same post-delete state → checks: `FORM` has NO `aria-disabled` (booking still present) · textarea `value === ""` · all 5 star buttons `aria-pressed === "false"` · text does NOT contain `editWindowClosed` (gate reset when `existing` null).
   - **K6 hygiene + cleanup**: zero collected `pageerror` · cleanup removes probe booking + all probe reviews (shape = `g-reviews.mjs:69-100` with own refs) → reload shows empty state + no kebab; summary `ok/FAIL` lines + `all N checks passed` + `process.exit(1)` on any failure (copy `:294-300`).
2. Unit: `npm test` must show `14/14 files passed` (P1 artifacts); add a case ONLY if review finds a gap (e.g. orphan `isMyReview`) — no weakening of existing assertions.
3. Changelog: append ONE bullet under `## 2026-09-28` → `### Added` block (file ends at `:309`), house style (dense VN, `·`, plan tag, `Verified:` line, `Docs impact:` line). Draft:
   ```
   - **[Feature] Review management: owner-only kebab menu + 3h time-gated edit + delete→rating recalc** (plan `260928-1508-review-management`)
     - Menu: `review-actions-menu.tsx` bespoke (`role="menu"` + `<button role="menuitem" disabled>` — Base UI `Menu.Item` không emit native `disabled`, research §4) hiện CHỈ khi review thuộc booking trên thiết bị (`isMyReview`, app không có auth) · icon `EllipsisVertical` stroke-only (không phá assertion `svg.fill-current===4` của g-reviews) · trigger `aria-haspopup/aria-expanded` · Delete → `window.confirm` → `deleteReview` → badge/list/count tự tính lại (derived, 0 thay đổi event)
     - Gate 3h: `GET /api/server-time` (`runtime=nodejs` + `force-dynamic`) + `src/lib/edit-window.ts` (`isEditWindowExpired`, boundary `>=`, fail-closed khi fetch lỗi) khóa CẢ menu Edit (native `disabled` + `opacity-50`) CẢ form prefill (`use-edit-window-gate`, hint `editWindowClosed`) · `saveReview` giữ `createdAt` gốc khi upsert (không thì gate tự kéo dài) · fix bug form thiếu `else`-clear sau khi xóa → prefill cũ có thể tái tạo review
     - i18n `destinations.reviews.{menuLabel,menuEdit,menuDelete,deleteConfirm,editWindowClosed}` ×2 locale · review mồ côi sau "Xóa tất cả chuyến đi" → ẩn menu (không xóa được từ UI) — chấp nhận, đã ghi nhận
     - Tests: unit `edit-window.test.ts` (2h59/3h00/3h01 + invalid ISO + fetch fail-closed) + `reviews.test.ts` +2 (giữ createdAt, isMyReview) · browser `k-review-actions.mjs` K1–K6 (ownership/menu/disabled+opacity/delete→badge gone/form cleared/no pageerror)
     - Verified: <fill exact counts>
     - Docs impact: minor (changelog này + plan statuses Complete)
   ```
4. Full pipeline in order: `npm run lint` → `npm test` → `npm run build` → confirm `npm run dev` on :3000 → `npm run test:browser` → manual DOM sweep of the 3 ACs → update `plan.md` (Status Complete, 4 phases Complete/100%, Completion Notes = deviations).

**Non-functional**: test file <200 LOC · no skips, no cheats, no mocks of app code, no assertion edits to existing tests · product-code edits allowed ONLY for defects surfaced here (report first → minimal fix → rerun → note deviation) · never "fix" `revalidate-webhook` by weakening it.

## Related Code Files
**Tạo**: `tests/browser/k-review-actions.mjs`
**Sửa**: `docs/project-changelog.md` (append-only under `## 2026-09-28`), `plan.md` (statuses + Completion Notes), `tests/unit/reviews.test.ts`/`edit-window.test.ts` (gap fixes only)
**Không sửa**: `g-reviews.mjs` + all other browser tests, `tests/run-*.mjs`, `tests/helpers/promo.mjs`, `package.json`, `revalidate-webhook.mjs`, `src/**` (unless a P1–P3 defect surfaces → fix in its owning file, note deviation)

## Implementation Steps
1. `npm test` → confirm `14/14` including `edit-window.test.ts` + extended `reviews.test.ts`.
2. Write `k-review-actions.mjs` (K1–K6 above; i18n strings via `readFileSync("./src/messages/vi.json")`).
3. Ensure `npm run dev` (:3000) → `npm run test:browser` → record exact counts; `g-reviews.mjs` must print `all 30 checks passed`.
4. Run full pipeline in order; record exact outputs for the changelog `Verified:` line.
5. Append changelog bullet (draft above, real counts, `Docs impact: minor`).
6. Update `plan.md`: header Status → Complete, 4 phase rows → `Complete | 100%`, add Completion Notes (the 3 deviations + follow-ups).

## Todo List
- [ ] `tests/browser/k-review-actions.mjs` K1–K6 (<200 LOC, own PROBE_REF)
- [ ] `npm test` → `14/14 files passed` (unit from P1 green)
- [ ] `npm run lint` → 0 · `npm run build` → 0
- [ ] `npm run test:browser` → `9/10` (only pre-existing `revalidate-webhook.mjs` fails)
- [ ] `g-reviews.mjs` still `all 30 checks passed` (0 assertion edits)
- [ ] Changelog append (draft → real counts + `Docs impact: minor`)
- [ ] `plan.md` → Complete/100% + Completion Notes

## Success Criteria
- `npm run lint` → exit 0.
- `npm test` → **`14/14 files passed`**, `0 failed` (files: booking-logic, contact-validation, **edit-window**, fetch-published-cache, h2-capacity-validation, h6-render-capacity, i18n-parity, payment-logic, payment-note, pricing, pricing-range, reviews, tour-capacity, travel-date).
- `npm run build` → exit 0.
- `npm run test:browser` → **`9/10 files passed`** + `failed: revalidate-webhook.mjs`; `k-review-actions.mjs` prints `all N checks passed` (N ≥ 24); `g-reviews.mjs` prints `all 30 checks passed`; `j-about-contact.mjs` still ok.
- `grep -c "check(" tests/browser/k-review-actions.mjs` → N recorded above · `wc -l tests/browser/k-review-actions.mjs` → <200.
- Changelog: `grep -n "review-management" docs/project-changelog.md` → ≥1 hit positioned AFTER line 261 (`## 2026-09-28`), containing `Verified:` and `Docs impact: minor`.
- `grep -n "Status" plan.md | head -1` → `Status**: Complete`; `grep -c "| Complete | 100% |" plan.md` → **4**.
- Evidence: `ls tests/.output/k-review-actions-*.png` → 4 files (owner/menu/expired/deleted).
- Diff hygiene: `git status --porcelain` → only the allow-list (`plan.md` + 6 new + 8 modified); `grep -rE "#[0-9a-fA-F]{3}|red-"` over the new src files → 0; no `*-enhanced` files; `git diff` contains no edits to `tests/browser/g-reviews.mjs`.

## Risk Assessment
- **R1 g-reviews breaks** → trap checklist (fill-current 4 / img 1 / WRAP :179,199,286 / aria-pressed B6 / i18n parity / 9-field `isReview`) re-verified by running the FULL suite; if a trap trips, fix OUR code — never the assertion.
- **R2 shared localStorage across suites** → k clears `vn-reviews:v1` + `vn-my-trips:v1` at start (like `g-reviews.mjs:133-139`) and cleans its own refs at the end (K6) so `revalidate-webhook` (runs last) is unaffected.
- **R3 dialog race** → `page.once("dialog")` registered before the click; message captured in the handler (no second dialog expected — fail loudly if it fires twice).
- **R4 server-time response race in K2/K3** → always `waitForResponse` before asserting `disabled`.
- **R5 opacity assertion** → `opacity-50` computes to `0.5`; if a browser rounds differently, relax to `parseFloat(opacity) <= 0.6` (record in Completion Notes).
- **R6 promo overlay intercepts clicks** → `dismissPromo(page)` after every goto/reload (harness rule).
- **R7 dev server down** → `run-browser.mjs` exits early with a clear message; start `npm run dev` first.
- **R8 pre-existing `revalidate-webhook` failure** → tolerated, explicitly listed as expected in the `Verified:` line (matches changelog precedent `8/9`).

## Security Considerations
- Tests seed only local fixtures (fake names/emails, no real PII, no secrets/env values) and delete them in K6 · dialog accept path destroys only test data · screenshots contain no credentials · changelog/plan contain no tokens · no new endpoints or deps introduced by testing · the known `SANITY_REVALIDATE_SECRET` gap stays untouched (never printed, never committed).

## Next Steps
- Session complete only when the pipeline is green; deviations recorded in `plan.md` Completion Notes (reference-plan style). Follow-ups to note: orphaned reviews are viewable but not deletable from the UI · client-only 3h gate (no server enforcement) · optional future: server-authoritative reviews.

## Decisions already made
File name `k-review-actions.mjs` (auto-discovered, sorted after `g-reviews`) · `PROBE_REF = "VN-K-REVIEW"` + orphan `VN-K-OTHER` for the non-owner card · badge recalc asserted with a SINGLE owned review (4.0 → gone; no second same-tour review possible) · i18n strings read from `vi.json` · `page.once("dialog")` accept + message assert · unit tests ship in P1, P4 re-runs only · `revalidate-webhook` env failure tolerated, not "fixed".
