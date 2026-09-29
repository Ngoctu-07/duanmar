# Phase 03 — Verification, Screenshots, Docs

**Status**: Complete (100%) · **Depends on**: Phase 2 · **Priority**: Medium

## Verification sequence
1. Targeted: `node tests/browser/p-tours-category.mjs` → all checks (now tabs-removed + P21) green; `node tests/browser/l-navbar.mjs` → header 4-link contract green.
2. `npm run lint` → 0 errors.
3. `npm test` → **18/18** (unit untouched: GROQ strict-category tests + i18n parity).
4. `npm run build` → exit 0 (stop dev → build → restart).
5. `npx sanity schemas validate` → 0 errors (no schema change; run for completeness).
6. `npm run test:browser` → **17/18** (sole fail = pre-existing `revalidate-webhook` env).

## Evidence
- `tests/.output/p-tours-01-domestic.png`, `p-tours-02-international.png` (fullPage, overwritten by run — must show NO pill bar).
- Optional visual spot-check of EN routes.

## Docs
- Changelog: Vietnamese bullet under `## 2026-09-29` (root cause = layout-owned pill tabs from Feature 1; removal; test contract repurposing; filtering preserved + P21 click-through proof; gate results).
- Report: `reports/implementation-2026-09-29-remove-tour-category-tabs.md`.
- Flip statuses: `plan.md` + phase-01/02/03 → Complete / 100%.

## Todo
- [ ] Targeted p-tours + l-navbar runs
- [ ] Full gates
- [ ] Screenshots confirm tab-free listing
- [ ] Changelog + report + status flips
