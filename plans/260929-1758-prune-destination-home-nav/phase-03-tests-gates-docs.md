# Phase 03 — Tests, Gates, Docs

**Status**: Complete (100%) · **Depends on**: Phase 2 · **Priority**: High

## Test updates
### `tests/browser/l-navbar.mjs`
- `HREFS` → `["/vi", "/vi/tours/domestic", "/vi/tours/international", "/vi/deals", "/vi/blog"]`; `LABELS` → prepend `vi.common.home`.
- L1: "exactly 4" → **"exactly 5"**; order/label arrays updated (home first).
- L3: `sheetLinks.slice(-4)` → `slice(-5)`, label → "sheet last 5 = required order".
- L4: 5 URLs → 5×200; "four h1 distinct" → **"five h1 texts distinct"**; re-index i18n h1 checks: `[1]`=domestic, `[2]`=international, `[3]`=deals, `[4]`=blog; home `[0]` = hero h1 (non-empty, distinct — CMS `heroTitle` fallback).
- **NEW L6 (self-refresh)**: at `/vi` set `window.__l6 = 1` → click `header nav a[href="/vi"]` → assert refresh occurred (HARD: `__l6` wiped after load; SOFT: marker persists + a second document/RSC request observed) → then from `/vi/tours/domestic`, click Home → assert normal navigation to `/vi` with marker PRESERVED (proves refresh only triggers on home itself).

### `tests/browser/p-tours-category.mjs`
- P8/P9: `length === 4` → **5**; indexes → `[0]`=`/vi`+`common.home`, `[1]`=domestic, `[2]`=international (labels asserted as today). P21 selector unchanged.

## Gates (ordered)
1. Targeted: `l-navbar.mjs`, `p-tours-category.mjs` standalone → green.
2. `npm run lint` → 0.
3. `npm test` → **18/18**.
4. `npm run build` → 0 (stop dev → build → restart).
5. `npx sanity schemas validate` → 0.
6. `npm run test:browser` → **17/18** (sole fail = `revalidate-webhook` env).

## Docs & evidence
- Screenshots: `tests/.output/l-navbar-01-desktop.png` + `l-navbar-02-sheet.png` (5 items), `p-tours-01/02` (no promo block).
- Changelog bullet (VN) under `## 2026-09-29`.
- Report: `reports/implementation-2026-09-29-prune-destination-home-nav.md`.
- Status flips: plan + 3 phases → Complete / 100%.

## Todo
- [ ] l-navbar rewrite (L1/L3/L4 + L6)
- [ ] p-tours P8/P9 re-index
- [ ] Targeted runs → full gates
- [ ] Screenshots + changelog + report + statuses
