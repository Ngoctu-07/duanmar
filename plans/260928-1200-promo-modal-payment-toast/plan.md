# Plan: [UI/UX] Entry Promotional Modal & Payment Success Toast

**Date:** 2026-09-28 · **Work context:** `D:\tour` · **Reports:** `plans/reports/` · **Status:** complete

## Summary
1. Marketing promo modal mounts on EVERY full page load (all routes incl. checkout): new `ui/dialog.tsx` (base-ui, centered) + `layout/promo-modal.tsx` client child of `[locale]/layout.tsx`, image `public/images/promo-modal.png` (user-provided, gated before build), visible i18n'd X close + Escape.
2. Payment success toast: bespoke `booking/payment-success-toast.tsx` (no new deps), effect watching `status === "success"` in `booking-payment-section.tsx`, dark/red card, bottom-right, auto-dismiss 5000ms, non-blocking.
3. Test harness: `tests/helpers/promo.mjs::dismissPromo(page)` — setup lines ONLY (19 goto/reload sites across 6 files), ZERO assertion edits.

## Status

| Phase | File | Status |
|---|---|---|
| 01 Modal component + i18n | `phase-01-modal-component.md` | Complete |
| 02 Payment success toast + i18n | `phase-02-payment-toast.md` | Complete |
| 03 Test harness (setup-only dismiss) | `phase-03-test-harness.md` | Complete |
| 04 Verify, evidence, changelog | `phase-04-verify-and-evidence.md` | Complete |

## Binding decisions (user-approved — do not change)
- Marketing image: user drops `public/images/promo-modal.png`; plan gates on file existence pre-build; `next/image`; NO AI art generation.
- Modal frequency: EVERY navigation/reload (AC-literal), ALL routes incl. checkout. Mitigation = shared `dismissPromo(page)` setup helper only; assertions untouched (repo rule). Close via visible X or Escape.
- Toast: custom component, no new deps, triggered by effect on `status === "success"` inside `booking-payment-section.tsx`.

## Planner decisions
- `src/components/ui/dialog.tsx` (~100 LOC) mirrors `sheet.tsx`: Portal+Backdrop+Popup centered, controlled `open/onOpenChange`, `z-[60]` (above header z-50 + sheet), sheet-style `data-starting-style:/data-ending-style:` transitions, `closeLabel` prop → i18n sr-only (sheet hardcodes "Close").
- Promo mounted as client child in `src/app/[locale]/layout.tsx` (inside `NextIntlClientProvider`) → mounts at first client render of every full document load. SPA `Link` navigations keep layout → no re-show (AC = navigate-to-site/reload = document loads; documented, acceptable).
- No storage key for promo (AC-literal every load; immune to `localStorage.clear()` at `f-ui.mjs:55`).
- Popup carries `data-slot="promo-modal"` (+ close `data-slot="promo-modal-close"`) → dismiss helper distinguishes promo from header sheet (`g-header.mjs:44` first-match `[role="dialog"]`).
- Toast: container `fixed bottom-4 right-4 z-[80] pointer-events-none` (fully non-blocking at ANY coordinate — c-payment clicks radio at `:128` while toast visible), card `bg-foreground text-background border-l-4 border-primary shadow-soft rounded-xl`, `animate-in slide-in-from-bottom-2 fade-in-0`, `role="status"` but NO `aria-live` attribute (grep: tests only match `p[aria-live="polite"]`, `[role="option"]`, `[role="dialog"]`).
- i18n: new top-level `promo` namespace + `booking.toastSuccess` in BOTH `en.json`/`vi.json` (parity test sorts keys → set equality, position irrelevant).
- Image gate `test -f public/images/promo-modal.png` BEFORE build; missing → BLOCKED → ask user (runtime next/image failure would trip `pageerror` listeners and fail runs).

## Verification (gates = grep/count based — dirty tree, NO commits)
`test -f public/images/promo-modal.png` → `npm run lint` → `npm test` (11/11) → stop dev → `npm run build` → restart dev w/ `SANITY_REVALIDATE_SECRET` → `npm run test:browser` (7/7) → grep gates (dismissPromo 19 calls + 6 imports; aria-live count in tests unchanged; 0 new deps) → evidence in `{plan}/evidence/` → changelog append under existing `## 2026-09-28` (never edit history) → phase statuses Complete.

## Scope guardrails
- KISS/YAGNI/DRY · files <200 LOC · kebab-case · no comments · token styling only (no hex in tsx) · no new dependencies · src READ-ONLY during planning; writes confined to this plan dir.
- NOT in scope: modal frequency config/localStorage suppression, toast interactive actions, dialog used elsewhere, image generation, assertion edits, commits.

## Key risks
1. Base-ui SSR/hydration of open dialog → pageerror; fallback: mounted-gate open (post-hydration mount, still immediate).
2. Missed dismiss site blocks a click → 19-site grep count gate + helper waits for detach.
3. Dev/build port conflict on :3000 → stop dev before build, restart with secret before browser run.
