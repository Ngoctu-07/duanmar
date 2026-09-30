# Phase 4: Browser Test, Gates, Docs

**Plan**: [`plan.md`](plan.md) · **Est**: 1h · **Status**: pending (blocked by P1-P3) · **Files**: 1 create, 2 modify

## Context Links
- **Harness**: `tests/browser/*.mjs` — `getBrowser/getPage/closeBrowser` from `.claude/skills/chrome-devtools/scripts/lib/browser.js`, `check(name, ok, detail)` accumulator, screenshots → `tests/.output/`, `dismissPromo` from `tests/helpers/promo.mjs`, exit 1 on any failure; runner `tests/run-browser.mjs:23-25` executes every `tests/browser/*.mjs` sorted. All 26 single-letter prefixes taken (`d8-`, `h4-` suffix precedent) → new file **`m2-footer-red-knockout.mjs`** (alphabetically next to `m-footer-brand.mjs` = footer family grouped).
- **Baseline**: 29 files, **27/29** — only acceptable failures: `b-booking-confirmation-email.mjs` (`.env.local` `BOOKING_EMAIL_DELAY_MS=2000` vs test's 100–130s window), `revalidate-webhook.mjs` (missing `SANITY_REVALIDATE_SECRET`). After +1 file: **target 28/30**, same 2 names. Unit: `npm test` **26/26** (grep: only "footer" hit = `booking-confirmation-email.test.mts:92` email-signature wording — unrelated, untouched).
- **No existing color coverage of footer**: `d8-a11y.mjs` contrast runs only on checkout `p[aria-live]` (`:76-115`); `m/o/q` footer tests assert structure/geometry/hrefs only; `y-homepage-prune` asserts headings presence/absence. Hence NEW file (KISS: 1 focused file vs. overloading `m-footer-brand.mjs` which is already 194 lines — precedent `u-icon-switcher-price.mjs` added as new file).

## Create: `tests/browser/m2-footer-red-knockout.mjs` (~110 lines)
Skeleton copy: `results[]/errors[]/check()` + browser 1280×900 + `pageerror` listener (pattern `m-footer-brand.mjs:22-26,61-63`).

- **K1 — footer bg == brand-red token**: goto `/vi`, dismissPromo. In-page: create `ref` div with `style.background='var(--primary)'`, read `getComputedStyle(ref).backgroundColor` (→ `rgb(159, 6, 24)`), compare === `getComputedStyle(footer).backgroundColor`; also ≠ transparent. (Ref-div = token-relative, auto-syncs if `--primary` changes — no hardcoded hex.)
- **K2 — all typography white**: colors of `footer, footer h3, footer a, footer p, footer .font-brand` (expect ≥15 nodes) all === `rgb(255, 255, 255)` — covers headings :40/:56/:80, wordmark, tagline, 14 links, copyright, legal links; catches any leftover `text-muted-foreground`.
- **K3 — WCAG contrast**: inline `srgb/luminance/contrast` helpers (copy `d8-a11y.mjs:20-26`); `contrast(white, footerBg) ≥ 4.5` (expect **8.36**); hover evidence: `contrast(rgba(255,255,255,.8) over footerBg, footerBg) ≥ 4.5` (expect **5.66**).
- **K4 — knockout logo**:
  - `footer img` `getAttribute('src')` includes `logo-duanmar-white` (optimizer URL carries encoded query — substring match works; F8's `logo-duanmar` ⊂ `logo-duanmar-white.png` confirmed compatible with `m-footer-brand.mjs:137`).
  - Load raw `/images/logo-duanmar-white.png` into `new Image()` → `decode()` → canvas `getImageData`: corner pixel alpha `<10`; histogram `transparent(a<10) ≥ 40%` AND `opaque-white(a>245 ∧ rgb>240) ≥ 10%` (measured 67.4/20.0) — canvas pixel evidence of transparency/white strokes.
  - Header guard: `header img` src still `logo-duanmar.png` (NOT `-white`) — D4 untouched proof.
- **K5 — newsletter absent**: on `/vi` AND `/en`: `document.body.innerText` excludes `"Stay Updated"` AND `"Subscribe"` (requirement 1, both locales).
- **K6 — bottom divider**: `footer .mt-8` computed `borderTopColor` = `rgba(255, 255, 255, 0.2)` (white/20 over red ✓).
- **K7 — zero pageerrors**; screenshots `m2-footer-red-01-1280.png` (element shot — 88px knockout legibility visual check) + `m2-footer-red-02-375.png` (no h-overflow at 375).

## Modify: `tests/browser/y-homepage-prune.mjs` (requirement-driven strengthening — NOT a weakening)
- Add `"Stay Updated"` to `FORBIDDEN.vi` AND `FORBIDDEN.en` (`:23-26` — section is hardcoded EN, appears in both locales' DOM) → Y1 (`:88-90`) now asserts ABSENCE (anti-regression guard for requirement 1).
- Update the two "4 removed sections" comments (`:5-9`, `:22`) → 5 sections.
- **Explicitly unchanged**: Y3 assertion `:93` (Featured present) — its *detail* JSON `:94` simply stops listing "Stay Updated"; Y4 Stories logic untouched. No other Y-check references the block (audited).

## Regression runs (each tied to a risk)
| Test | Invariant at risk |
|---|---|
| `m-footer-brand.mjs` | F1-F11 structure/hrefs; F8 logo substring vs `-white.png`; H2/H5 header logo ≤40px unchanged |
| `o-footer-refinement.mjs` | O1a grid 4 children, O2b wordmark ≥ header (color-agnostic geometry) |
| `q-footer-asym-layout.mjs` | Q5 gap ratios @1280 — class map must not touch grid |
| `y-homepage-prune.mjs` | Y1 (+new Stay Updated) / Y2 / Y3 / Y4 after P1 |
| `g-header.mjs`, `l-navbar.mjs` | header selectors — header untouched (D4) |
| `j-about-contact.mjs` J2, `p-tours-category.mjs` P19 | homepage section order/presence after newsletter delete |

## Gates (ordered, all before done)
```bash
npm run lint                              # expect 0
npm test                                  # expect 26/26
npx tsc --noEmit                          # expect 0
npm run logo:knockout                     # assertions pass; 2nd run → git diff empty (determinism)
node tests/browser/m2-footer-red-knockout.mjs   # expect all-ok
npm run test:browser                      # expect 28/30 (files 29→30; same 2 env failures by name)
npm run build                             # ONLY with dev stopped (CSS-404/MIME incident in changelog); restart dev after
```

## Docs
- `docs/project-changelog.md` → append under `## 2026-09-30` (`:509`, last section): `- **[Feature] Footer brand-red inversion + newsletter prune + knockout logo** (plan 260930-1610…)` — newsletter location correction (not in footer), `bg-primary` = rgb(159,6,24) + contrast table (8.36/5.66), knockout formula correction + histogram evidence (67.4/20.0), test/gate numbers (28/30). `Docs impact: minor`.
- Unresolved questions stay in plan.md (not docs).

## Acceptance Criteria
- [ ] `m2-footer-red-knockout.mjs` exits 0 on :3000; full suite **28/30** (same 2 baseline failures re-listed by name)
- [ ] `y-homepage-prune.mjs` green with "Stay Updated" in FORBIDDEN (absence proven in both locales)
- [ ] All 6 gates green; changelog appended with measured evidence; no `m/o/q/g` test files modified
**Status:** PENDING
