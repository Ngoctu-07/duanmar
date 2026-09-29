# Verification Log — UI Polish (plan `260928-1100`)

**Date**: 2026-09-28 · **Server**: dev on :3000 (secret exported from temp file, never in `.env*`)

## Commands
| Command | Result |
|---|---|
| `npm run lint` | exit 0 |
| `npm test` | 11/11 files (EN/VI parity) |
| `npm run build` | exit 0 (dev stopped first) |
| `npm run test:browser` | **7/7** (c-booking, c-payment, d8-a11y, f-ui, g-header, h4-p4-e2e, revalidate-webhook 10/10) |

Zero test assertions edited (grep-verified: no test asserts brand/height/padding/shadow).

## Grep gates
| Gate | Expected | Actual |
|---|---|---|
| `DuanMAR` in `src/` | 0 | **0** |
| `DuanMar` in `src/` | 35 | **35** (same 32-file list as pre-replace) |
| `DuanMAR` in `docs/` (history) | 4 | 4 (untouched) |
| `DuanMAR` in `plans/` (history) | 62 | 62 (untouched) |
| `vietnam-tourism` in `package.json` | unchanged | unchanged |
| old red `oklch(0.5 0.19 25)` / `oklch(0.68 0.17 25)` | 0 / 0 | 0 / 0 (new values 5× / 5×) |
| `hover:shadow-lg` in `src/` | 0 | 0 (`hover:shadow-md` = 3) |
| `ring-1 ring-foreground/10` in `card.tsx` | 0 | 0 |
| stray `h-8`/`size-8` in `*.tsx` | 0 | 0 |
| `select.tsx` lines | ≤200 | 200 · `globals.css` ≤200 | 141 |

## Built CSS (`.next/static/chunks/25rzv20blcamb.css`)
- `--elevation-soft:0 1px 2px #0000000a, 0 4px 12px -2px #0000000f` ✓
- `.shadow-soft{--tw-shadow:var(--elevation-soft); …}` ✓
- `.rounded-xl.border{box-shadow:var(--elevation-soft)}` ✓ (43 page-card sites covered)
- `.font-body{--tw-font-weight:450;font-weight:450}` ✓ + `font-weight:450` on body ✓
- resolved primary `9f0618` ✓

## Contrast (computed WCAG)
| Pair | Ratio | Verdict |
|---|---|---|
| white ↔ `#9F0618` (light primary, text/CTA) | **8.36:1** | AA ✓ (was 6.63) |
| `#9F0618` text on white | 8.36:1 | AA ✓ |
| `#DA534F` on dark bg `#09090B` | 5.05:1 | AA ✓ |
| `#DA534F` on dark card `#171719` | 4.54:1 | AA ✓ |
| old light `#B71824` (removed) | 6.63:1 | baseline |
| rejected dark `0.55` candidate | 3.39:1 | ✗ — reason `0.62` chosen |

## Live HTTP
`/vi` 200 · `/en` 200 · `/vi/booking/checkout?tour=hcm` 200 · served HTML: `DuanMar` present, `DuanMAR` = 0.

## Evidence
`evidence/home-vi.png` (muted CTAs, soft card shadows, thicker body, wordmark `DuanMar`)
`evidence/home-en.png` · `evidence/checkout.png` (aligned h-9 form rows, resting control shadows)
Dark-mode note: black-alpha shadows flatten on near-black dark cards — accepted (phase-03 R6; dark mode dormant, no toggle in `src/`).

## Scope check
No commit made (explicit request required). No `.env*`, `package.json`, `.git/config` touched.
