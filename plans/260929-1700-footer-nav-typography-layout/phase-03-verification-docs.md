# Phase 03 — Verification, Screenshots, Docs

**Status**: Complete (100%) · **Depends on**: Phase 2 · **Priority**: Medium

## Gates (must all pass)
1. Targeted: `node tests/run-browser.mjs` filtered or full run — `m-footer-brand.mjs`, `o-footer-refinement.mjs`, `q-footer-asym-layout.mjs` green first.
2. `npm run lint` → 0 errors.
3. `npm test` → **18/18** (unit; footer change shouldn't touch, i18n parity untouched).
4. `npm run build` → exit 0 (stop dev first, restart after).
5. `npx sanity schemas validate` → 0 errors (no schema change expected, run anyway).
6. `npm run test:browser` → **16/17** (sole fail = pre-existing `revalidate-webhook` / missing `SANITY_REVALIDATE_SECRET`).

## Screenshots
- `tests/.output/footer-typography-1280-vi.png`, `-768-vi.png`, `-375-vi.png`, `-1280-en.png` — before/after proof of distribution + scale.

## Docs
- Changelog: append Vietnamese bullet under `## 2026-09-29` in `docs/project-changelog.md` (root cause, classes changed, grid template, O5b amendment rationale, gate results).
- Report: `reports/implementation-2026-09-29-footer-nav-typography.md` (AC table, files, verification, risks/outcomes).
- Flip statuses: `plan.md` + phase-01/02/03 → Complete / 100%.

## Todo
- [ ] Targeted footer tests
- [ ] Full gates (lint → unit → build → schema → browser)
- [ ] Screenshots ×4
- [ ] Changelog bullet
- [ ] Report + status flips
