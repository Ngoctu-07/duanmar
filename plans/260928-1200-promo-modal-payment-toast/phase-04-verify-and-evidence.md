# Phase 04 — Verify, Evidence, Changelog, Statuses

## Context Links
- Commands: `npm run lint` · `npm test` (11/11) · `npm run build` · `npm run test:browser` (7/7)
- Dev on :3000 must STOP before `next build` and RESTART with `SANITY_REVALIDATE_SECRET` from `/c/Users/Lenovo/AppData/Local/Temp/opencode/revalidate-secret.txt` (never write `.env.local`)
- Changelog: `docs/project-changelog.md` (272 LOC) — existing `## 2026-09-28` section at L261, `### Changed` block ends at EOF (L272) — append only, never edit history lines
- Dirty tree (uncommitted prior work) → gates are grep/count based, NO commits of any kind

## Overview
- Priority: P1 · Status: Complete
- Image gate → lint/unit → build → browser suite → grep gates → evidence screenshots → changelog → plan statuses Complete.

## Key Insights
- Toast evidence needs a screenshot inside the 5000ms window: capture ~3.5s after selecting a method (toast spans ~t0+3s → t0+8s); use viewport screenshot (toast is `fixed`; `fullPage` renders fixed elements oddly).
- Promo evidence needs a fresh full load BEFORE dismissing: goto `/vi` → wait `[data-slot="promo-modal"]` → shot → dismiss.
- Grep gates are the only trustworthy diff signal on a dirty tree (baseline `check(` counts recorded in phase-03 step 3).

## Requirements / Verification Steps (in order)

1. **Image gate (HARD — before build)**
   - `test -f public/images/promo-modal.png && echo OK || echo MISSING` → if MISSING: **BLOCKED**, ask user to drop the file; do NOT generate art; do NOT proceed to build.
2. **Static quality**
   - `npm run lint` → exit 0
   - `npm test` → 11/11 (incl. i18n parity en/vi)
   - `node -e "const e=require('./src/messages/en.json'),v=require('./src/messages/vi.json');console.log(Object.keys(e.promo),Object.keys(v.promo),e.booking.toastSuccess&&v.booking.toastSuccess)"` → promo key sets identical + toast keys present
   - LOC gate: `wc -l src/components/ui/dialog.tsx src/components/layout/promo-modal.tsx src/components/booking/payment-success-toast.tsx src/components/booking/booking-payment-section.tsx` → all < 200
3. **Build (dev must be stopped)**
   - `netstat -ano | grep :3000` → PID; `cmd /c "taskkill /PID <pid> /F"`
   - `npm run build` → exit 0 (also proves image present in output: `ls .next/static/media/promo-modal-*` or `.next/server/app` — optional confirm)
4. **Restart dev + browser suite**
   - `export SANITY_REVALIDATE_SECRET=$(cat /c/Users/Lenovo/AppData/Local/Temp/opencode/revalidate-secret.txt) && npm run dev &` → wait `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/vi` = 200
   - `npm run test:browser` → **7/7** (all files incl. `revalidate-webhook.mjs`); on failure fix root cause — NEVER edit assertions
5. **Grep gates (dirty-tree diff proof)**
   - `grep -rn "dismissPromo" tests/` → exactly 25 hits (6 imports + 19 calls)
   - `grep -c "check(" tests/browser/*.mjs` → identical to phase-03 baseline counts
   - `grep -rn "aria-live" tests/` → count unchanged from pre-change baseline (record at impl start)
   - `grep -rn "aria-live" src/components/booking/` → still exactly 1 hit (existing `:158`)
   - `grep -rn "promo-modal" src/` → selectors match `tests/helpers/promo.mjs`
   - No new deps: `git diff package.json | head` → no added dependency lines (only possible pre-existing dirty noise)
6. **Evidence** → save to `plans/260928-1200-promo-modal-payment-toast/evidence/`:
   - `promo-modal.png`: viewport shot of `/vi` with modal open (before dismiss)
   - `promo-modal-closed.png`: same page after X close (proves dismissal)
   - `toast-visible.png`: checkout `?tour=hcm` → click `input[value="momo"]` → wait QR → `sleep(3500)` → viewport screenshot (toast on screen)
   - Capture method: standalone script `evidence/capture-evidence.mjs` inside plan dir reusing `.claude/skills/chrome-devtools/scripts/lib/browser.js` (same import pattern as `tests/browser/g-header.mjs`); dev must be running.
7. **Docs**
   - Append to `docs/project-changelog.md` under existing `## 2026-09-28` (append `### Added` block at EOF; do NOT touch existing lines):
     - `**[Feature] Entry promotional modal + payment success toast** (plan 260928-1200)` — bullets: dialog primitive + promo modal (every full load, X/Escape, image gated `public/images/promo-modal.png`, z-[60]); bespoke toast (dark/red, bottom-right, 5000ms, role=status no aria-live) from `status==="success"` effect; i18n `promo.*` + `booking.toastSuccess` EN/VI; harness `tests/helpers/promo.mjs` setup-only at 19 goto/reload sites; Verified: lint · 11/11 · build · 7/7 · evidence paths · docs impact: minor
   - Set all phase statuses in `plan.md` + phase files to `Complete` (already staged as Complete during writing — confirm).
8. **Final regression sweep**: `npm run lint && npm test` once more after changelog edit (docs don't affect code, cheap confirmation).

## Todo List
- [ ] Image gate OK (else BLOCKED)
- [ ] lint + unit 11/11 + LOC + i18n key probe
- [ ] dev stopped → `npm run build` exit 0
- [ ] dev restarted w/ secret → `npm run test:browser` 7/7
- [ ] All grep gates pass (25 dismissPromo, check( counts, aria-live counts, no new deps)
- [ ] Evidence: promo-modal.png, promo-modal-closed.png, toast-visible.png
- [ ] Changelog appended under `## 2026-09-28` (append-only)
- [ ] Plan statuses Complete; `reports/plan-summary.md` finalized

## Success Criteria
- 4 commands green (lint, 11/11, build, 7/7) + all grep gates + 3 evidence screenshots + changelog appended.

## Risk Assessment
- Dev PID kill on win32 → confirm port free (`netstat -ano | grep :3000` empty) before build.
- Browser flake from toast/promo timing → helper detach-wait + pointer-events-none cover known cases; if a file fails, diagnose screenshot + console — fix code/harness setup lines only.
- Evidence toast miss (window overrun) → retry capture; capture script waits on QR selector first, then fixed 3500ms.

## Security Considerations
- Secret only read into env var of dev process, never committed/echoed into files; no `.env.local` writes; public image has no embedded sensitive data (user-provided marketing asset).

## Next Steps
- Lead review of `reports/plan-summary.md`; open questions listed there must be resolved before/during impl.
