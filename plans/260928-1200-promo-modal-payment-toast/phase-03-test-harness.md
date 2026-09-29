# Phase 03 — Test Harness: `dismissPromo` (SETUP LINES ONLY)

## Context Links
- Repo rule: ZERO assertion edits — setup/dismiss lines only
- Precedent: `tests/helpers/cms-expectations.mjs` imported as `../helpers/cms-expectations.mjs` (`c-payment.mjs:3`); helper dir `tests/helpers/` exists
- Hot spots: `g-header.mjs:42-44` (`button[data-slot="sheet-trigger"]` click + `page.$('[role="dialog"]')` FIRST match), `f-ui.mjs:55-56` (`localStorage.clear()` + reload), `c-payment.mjs:113/:121`, `d8-a11y.mjs:67/:72` first-match `p[aria-live="polite"]`
- Promo mounts on every FULL page load (goto/reload); SPA Link navs keep layout → no modal

## Overview
- Priority: P0 (test suite green is a hard gate) · Status: Complete
- New `tests/helpers/promo.mjs` exporting `dismissPromo(page)`; called after EVERY `page.goto`/`page.reload` (19 sites, 6 files) as setup only.

## Key Insights
- 19 full-load sites verified by grep: `c-booking.mjs` 5 (L36,49,171,176,183), `c-payment.mjs` 1 (L46), `d8-a11y.mjs` 1 (L30), `f-ui.mjs` 7 (L50,54,56-reload,62,172,194,198), `g-header.mjs` 3 (L29,56,63), `h4-p4-e2e.mjs` 2 (L47,221-reload) — line numbers shift as lines are inserted; anchor by URL/content, re-grep after wiring.
- Distinguishing promo from header sheet: promo popup carries `data-slot="promo-modal"` (phase-01) — helper waits for THAT selector and for its `detached` state, so `g-header.mjs:44` first-match `[role="dialog"]` resolves to the sheet only.
- Helper must be idempotent + tolerant: promo might already be gone / not yet mounted (hydration race) → `waitForSelector` with timeout inside try/catch; never throws (a helper throw would surface as test exception).
- `localStorage.clear()` at `f-ui.mjs:55` cannot resurrect or break promo (no storage key by design).
- `revalidate-webhook.mjs`: 0 gotos → no wiring needed (still counted in 7/7 run).

## Requirements
- R1 `tests/helpers/promo.mjs` — `dismissPromo(page)`:
  ```js
  export async function dismissPromo(page) {
    try {
      await page.waitForSelector('[data-slot="promo-modal"]', { timeout: 5000 });
    } catch {
      return; // promo not mounted (SPA nav or hydration race resolved)
    }
    await page.click('[data-slot="promo-modal-close"]').catch(async () => {
      await page.keyboard.press("Escape").catch(() => {});
    });
    try {
      await page.waitForSelector('[data-slot="promo-modal"]', { state: "detached", timeout: 5000 });
    } catch {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForSelector('[data-slot="promo-modal"]', { state: "detached", timeout: 5000 }).catch(() => {});
    }
  }
  ```
  (Close via the visible X — AC1 path; Escape fallback; detach wait guarantees no lingering `[role="dialog"]`.)
- R2 Add `import { dismissPromo } from "../helpers/promo.mjs";` + `await dismissPromo(page);` as the line IMMEDIATELY AFTER each of the 19 goto/reload calls (setup only).
- R3 Special sites:
  - `g-header.mjs`: dismiss after all 3 gotos — MUST complete before `:42` sheet-trigger click and `:44` first-match dialog query.
  - `f-ui.mjs`: dismiss after goto `:50`, goto+clear+reload `:54-56` (post-reload), and every later goto (`:62,:172,:194,:198`).
  - `h4-p4-e2e.mjs`: after `:47` goto and `:221` reload.
- R4 No assertion/`check(...)` lines modified; no selectors inside `check()` changed; no `pageerror` listener changes.

## Related Code Files
- Create: `tests/helpers/promo.mjs`
- Modify (setup lines only): `tests/browser/{c-booking,c-payment,d8-a11y,f-ui,g-header,h4-p4-e2e}.mjs`
- Read-only dependency: `src/components/layout/promo-modal.tsx` / `dialog.tsx` selectors (phase-01)
- Delete: none

## Implementation Steps
1. Create `tests/helpers/promo.mjs` per R1.
2. Wire 6 files per R2/R3 — mechanical insert after each goto/reload (19 total).
3. Grep gates:
   - `grep -rn "dismissPromo" tests/` → 1 import ×6 files + 19 call sites = 25 hits.
   - Assertion-free proof: `grep -c "check(" tests/browser/*.mjs` BEFORE vs AFTER wiring → identical counts (record counts before starting).
4. `npm run lint` (tests are linted by `eslint .`).

## Todo List
- [ ] Baseline `check(` counts recorded
- [ ] `tests/helpers/promo.mjs` created (never throws, detach wait)
- [ ] 19 call sites + 6 imports wired (setup only)
- [ ] Grep gates pass (25 hits, `check(` counts identical)
- [ ] `npm run lint` clean

## Success Criteria
- With promo mounted in dev, running any of the 6 files never leaves promo open before its first click/assert; `g-header` sheet check passes with correct dialog first-match.
- Zero assertion lines diffed (verified by `check(` count + manual diff of inserted lines).

## Risk Assessment
- Extra ~500ms per goto (dismiss wait) → acceptable; timeouts already 60s.
- Promoted selector rename in phase-01 → helper breaks; mitigation: selector locked in R1, grep `promo-modal` across plan+src after impl.
- Hydration race: promo mounts after helper's 5s wait → helper returns without closing; subsequent click would hit backdrop → browser run reveals; fallback: increase wait or switch helper primary to `waitForSelector` state `attached` with `waitUntil:"networkidle2"` already done by goto (low probability).

## Security Considerations
- Test-only file; no secrets, no production code touched; helpers contain no credentials.

## Next Steps
- Phase 04 runs the full suite (`7/7`) proving harness correctness; toast evidence captured there.
