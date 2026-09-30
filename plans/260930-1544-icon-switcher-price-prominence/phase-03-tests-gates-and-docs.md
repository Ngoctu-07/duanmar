# Phase 3: Browser Test, Gates, Docs

**Plan**: [`plan.md`](plan.md) · **Est**: 1h · **Status**: pending (blocked by Phase 1+2) · **Files**: 1 create, 1-2 modify

## Context Links
- Harness pattern: `tests/browser/*.mjs` with `getBrowser/getPage/closeBrowser` from `.claude/skills/chrome-devtools/scripts/lib/browser.js`, `check(name, ok, detail)` accumulator, screenshots → `tests/.output/`, exit 1 on any failure; `dismissPromo` from `tests/helpers/promo.mjs`; runner `tests/run-browser.mjs` executes every `tests/browser/*.mjs` sorted (28 files today → 29 after this plan).
- Live data: dev dataset slugs `hcm`/`dn`/`nyc` verified 200 at `/vi/explore/destinations/<slug>`; pricing doc lookup pattern `fetchTourPricing(slug)` in `tests/helpers/cms-expectations.mjs` (used by `c-booking.mjs:91`).
- **Baseline (re-verified this session)**: `revalidate-webhook.mjs` FAILs (`SANITY_REVALIDATE_SECRET` unset in process/.env.local) · `b-booking-confirmation-email.mjs` FAILs (`BOOKING_EMAIL_DELAY_MS=2000` in `.env.local:16`, test expects 100–130s) → **success target = 27/29 files, never 29/29**.

## Create: `tests/browser/u-icon-switcher-price.mjs` (~180 lines, single file — YAGNI)
Structure: `results[]/errors[]/check()` + `sleep` + browser 1280×900 → sections U1–U8 → summary + exit code (copy `g-header.mjs:16-22` skeleton). Tolerance ±1px on all geometry (device pixel rounding).

**U1 — Header icons (desktop `/vi`)**
- `header a[aria-label="Tìm kiếm"] svg` and `header a[aria-label="Chuyến đi của tôi"] svg` → `getBoundingClientRect()` w==h==**28**±1 (proves `size-7` beat the Button `size-4` override).
- Header icon buttons remain 36×36 (no unintended `size` prop drift).

**U2 — Input + nav-tile icons (`/vi`)**
- Hero search adornment (`main` svg containing `lucide-search`, absolute-positioned) → **24**±1; assert rect.left ≥ 0 and rect.right ≤ input's `pl-10` content edge (no collision with placeholder).
- Quick-access svgs (`section svg.lucide-file-text` + 4 siblings in the `py-8 bg-muted/30` band) → all **28**±1.
- Navigate `/vi/search`: input adornment svg → **24**±1.

**U3 — Locale switcher active/inactive styles (`/vi` desktop)**
- `header [role=group]` (aria-label = `nav.language`): height ≥ 32, font-size ≥ 14; each button height ≥ 32, `textContent ∈ {en, vi}` preserved.
- Active = button with `aria-current === "true"`: assert text === `"vi"`, `fontWeight ≥ 800`, `opacity === 1`, `backgroundColor` not transparent (≈ `bg-muted`).
- Inactive (`"en"`): no `aria-current`, `opacity ≤ 0.65`, `fontWeight < active's`, color ≠ active color.
- `check` on inequality pair: `activeFw > inactiveFw && activeOpacity > inactiveOpacity` (the actual bug: today both render identically — `data-active` never set).

**U4 — Switcher interaction**
- Click `en` button → `waitForFunction(() => location.pathname.startsWith("/en"))` → re-read: `en` now `aria-current="true"` + fw≥800, `vi` muted. (Covers `switchLocale` regression + state flip.)

**U5 — Chatbot trigger (`/vi` desktop)**
- `[data-testid="assistant-trigger"]` rect: **72 ≤ w,h ≤ 90** (expect 80) — user's 200–250% of actual 36px; inner `svg` rect **36 ≤ ≤ 44** (expect 40).
- Trigger visible (`offsetParent`), `aria-expanded === "false"`, `aria-label` present (parity with `i-ai-assistant.mjs:126-136`).

**U6 — Mobile 375×812 (`/vi`)**
- Page `documentElement.scrollWidth <= innerWidth`.
- `button[data-slot="sheet-trigger"]` svg → **28**±1; open sheet, `[role=dialog]` link svgs (`lucide-search`, `lucide-luggage`) → **24**±1; close sheet.
- Trigger rect: right edge ≤ 375, bottom edge ≤ viewport height, size still 80±1 (fixed-corner safety).
- Screenshot `u-icons-01-mobile.png`.

**U7 — Price prominence, cards (`/vi` homepage)**
- First `[data-slot="card"]` containing a `.tabular-nums` span inside `text-xs` row (the `PriceRangeRow`): value span `fontSize ≥ 24` (expect 24) && `fontWeight ≥ 800`; sibling label span `fontSize ≤ 13`; **ratio value/label ≥ 2**; value `fontSize > card h3 fontSize` (20) → "most dominant figure in container".
- Assert price span's rect is fully inside the card rect (wrap worked, no clipping by `overflow-hidden`).

**U8 — Price prominence, tour detail + checkout**
- Pick priced slug: `fetchTourPricing("hcm")` from `tests/helpers/cms-expectations.mjs`; if no doc → record `ok … skipped (no tiers)` (pattern `s-tour-hero-carousel.mjs:187`) else goto `/vi/explore/destinations/hcm`.
  - `section[aria-labelledby="tour-price-heading"]` `td` cells: per-guest cell `fontSize ≥ 28` (expect 28) && `fontWeight ≥ 800`; group-total cell `fontSize ≥ 28`; `thead th` fontSize unchanged ≤ 13 (labels not doubled).
  - At 375: page `scrollWidth <= innerWidth` (table scrolls inside its `overflow-x-auto` region).
- Checkout (`/vi/booking/checkout?tour=hcm`, helpers cloned from `d8-a11y.mjs:34-56`: native value-setter `setInput` for `#booking-guests`=`2`, `#booking-full-name`, `#booking-email`, `#booking-phone`, click `td[data-day=<tomorrow>] button`, submit):
  - pricing total span (`section[aria-labelledby="booking-pricing-heading"] span.tabular-nums`) `fontSize ≥ 36` && fw ≥ 800;
  - summary `dl` row `dt == "Tổng cộng"` → `dd` `fontSize ≥ 28` && fw ≥ 800 && `text-primary` (and sibling travel-date `dd` still has `font-semibold` + `text-primary` — F7 guard);
  - select `input[name="payment-method"][value="momo"]`, wait `img[alt="Mã QR thanh toán"]`: label `p` ("Số tiền cần thanh toán") `nextElementSibling` `fontSize ≥ 40` && fw ≥ 800; then 375 → page `scrollWidth <= innerWidth`.
- Screenshot `u-price-01-detail.png`, `u-price-02-checkout.png`.

**U9 — zero pageerrors** (pattern `i-ai-assistant.mjs:271`).

## Regression runs (invariant owners — each tied to a specific risk)
| Test | Why (invariant at risk) |
|---|---|
| `i-ai-assistant.mjs` | trigger click/visible/375 `scrollWidth` + panel fit (`:126-143,217-268`) with 80px trigger |
| `g-header.mjs` | `header a[aria-label=…]` selectors (`:34-35`) + mobile sheet |
| `a-ux-microinteractions.mjs` | tooltip structure/opacity on the SAME resized buttons (`:45-87`) |
| `f-ui.mjs` | F7 travel-date dd classes + row set (`:149-154`) after `TicketRow.price` |
| `c-booking.mjs` | B6 `aria-pressed==0` (`:111-114`), B8/B9 totals & dd texts (`:151-177,252-253`) |
| `c-payment.mjs` | D5/D6/D7 total text via label→sibling reads (`:97-116`) |
| `d8-a11y.mjs` | payment-status contrast + radio flow on resized checkout |
| `r-entry-popup-cms.mjs` | R15/16 locale button `textContent==="en"|"vi"` click (`:232-240`) |
| `s-tour-hero-carousel.mjs` | S3 PriceBlock above-fold + `aria-pressed==0` (`:174-193`) |
| `l-navbar`, `p-tours-category`, `m-footer-brand` | header nav/logo geometry (logo must stay ≤40px, `m-footer-brand.mjs:97`) |

## Gates (ordered, run all)
```bash
npm run lint            # expect 0
npm test                # expect 26/26 (no unit changes)
npx tsc --noEmit        # expect 0
node tests/browser/u-icon-switcher-price.mjs   # new, must be all-ok
npm run test:browser    # expect 27/29 (only pre-existing env failures)
npm run build           # ONLY after stopping dev server (CSS-404/MIME note in changelog); then restart `npm run dev`
```

## Docs
- `docs/project-changelog.md` → append `- **[Feature] Global icon upscaling + locale switcher active state + price prominence** (plan 260930-1544…)` under `## 2026-09-30`: size table, Button `size-*` rule discovery, switcher root-cause fix (`data-active` was dead), price 2× table + exclusions, test/gate evidence (real numbers). `Docs impact: minor`.
- Unresolved questions go to plan.md (not docs).

## Acceptance Criteria
- [ ] `u-icon-switcher-price.mjs` exits 0 on :3000 with dev data
- [ ] Full browser suite 27/29 (same 2 env failures as baseline, re-listed by name)
- [ ] All 4 code gates green; changelog entry appended with measured evidence
- [ ] No `tests/browser/*` existing file modified (this plan only ADDS `u-*.mjs`; invariant tests stay authoritative)
**Status:** PENDING
