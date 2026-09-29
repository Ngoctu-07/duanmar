# Verification Log — Promo Modal & Payment Toast (plan `260928-1200`)

**Date**: 2026-09-28 · **Server**: dev on :3000 (secret exported from temp file, never in `.env*`)

## Commands
| Command | Result |
|---|---|
| `npm run lint` | exit 0 |
| `npm test` | 11/11 files (EN/VI parity — `promo` ns + `booking.toastSuccess` both locales) |
| `npm run build` | exit 0 (dev stopped first; fixed `clearTimeout` TS error → `window.setTimeout` + `number\|undefined` ref) |
| `npm run test:browser` | **7/7** (c-booking, c-payment, d8-a11y, f-ui, g-header, h4-p4-e2e, revalidate-webhook 10/10) |

## Grep / diff gates
| Gate | Expected | Actual |
|---|---|---|
| `dismissPromo` call sites across 6 test files | 19 | **19** (c-booking 5, c-payment 1, d8-a11y 1, f-ui 7, g-header 3, h4-p4-e2e 2) + 6 imports = 25 lines |
| imports of `helpers/promo.mjs` | 6 files | **6** |
| assertion edits this feature | 0 (`check(` counts identical to baseline) | **0** (test diff = dismissPromo lines + imports only) |
| `aria-live` occurrences in `tests/` | 8 (unchanged — toast avoids it) | **8** |
| new dependencies in `package.json` | 0 | **0** (`git diff HEAD -- package.json` empty) |
| files <200 LOC | ≤200 | dialog 116 · promo-modal 43 · toast 22 · booking-payment-section 199 · promo helper 19 |

## Hardening (why f-ui initially failed)
- Helper v1 clicked too early (hydration race) → backdrop stayed open → `#trip-detail-heading` timeout.
- Helper v2: 10s mount wait, X click with Escape fallback, `waitForFunction` asserting BOTH `promo-modal` and backdrop gone.
- Stability: **5/5** consecutive dismiss rounds clean; browser suite back to 7/7.

## Evidence (visually reviewed)
- `evidence/promo-modal-vi.png` — popup 672×456 centered, close X 28×28 visible (`[data-slot=promo-modal-close]`), image loaded (naturalWidth > 0), backdrop dims page, `DuanMar` casing.
- `evidence/payment-success-toast.png` — dark card bottom-right with `border-l-4 border-primary`, VI text verbatim: "Cảm ơn quý khách đã đặt tour. Chúng tôi sẽ liên hệ trong vòng 5 phút."
- Toast lifecycle probe: shown @3034ms → dismissed @8035ms = **exactly 5000ms** visible.

## Notes
- `public/images/promo-modal.png` is a GENERATED placeholder (1200×800, HTML→Puppeteer, `promo-banner.html` + `render-banner.mjs`) — AI image gen unavailable (no keys), user approved approach; **user may overwrite file anytime** (same path, app unchanged).
- Image gate `test -f public/images/promo-modal.png` passed before build.
- `evidence/debug-submit-failed.png` deleted (debug artifact).
- No commit made (explicit request required). No `.env*`, `package.json`, `.git/config` touched.
