# Phase 04 — Docs, changelog, code review

Context: phases 01-03. Priority: P1 · Status: pending approval

## Tasks

1. `docs/project-changelog.md` → new entry under `## 2026-09-27`:
   - root cause (dual ledger: manual `occupancy[]` + device bookings, no write-back; probe evidence
     fresh browser Sep 29 = "3 chỗ trống")
   - fix: Studio drops manual daily rows → single global `maxCapacity`; remaining = max − Σ
     successful bookings; "Hết chỗ" iff remaining ≤ 0 (guest-aware disable kept per P2)
   - limitations: device-only booking ledger (no backend), orphan CMS `occupancy` data ignored
   - test matrix results (phase 3 gate)
2. Update plan statuses → done + `## Test results` section.
3. Dispatch `code-review` (adversarial) on: `tour-capacity.ts`, `tour-pricing.ts`,
   `occupancy-field.ts` deletion, query change, `booking-form.tsx`, tests — report to
   `plans/reports/code-review-inventory-sync-20260927.md`. Address Critical/Major before finishing.
4. Final message: verdict + unresolved questions list.

## Success criteria

Changelog + plan updated; review report exists; all Critical/Major findings fixed or explicitly
deferred with user consent.
