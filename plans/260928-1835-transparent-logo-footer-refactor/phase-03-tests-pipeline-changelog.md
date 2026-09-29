# Phase 03 — Tests, Pipeline Gates & Changelog

Status: **Complete** · Priority: P1 · Parent: [plan.md](./plan.md)

## Context Links
- Runner `tests/run-browser.mjs:25-30` auto-discovers sorted `tests/browser/*.mjs` → NO registration needed.
- Existing browser files: `c-booking, c-payment, d8-a11y, f-ui, g-header, g-reviews, h4-p4-e2e, j-about-contact, k-review-actions, l-navbar, revalidate-webhook` → letters used c,d,f,g,h,j,k,l → **next free letter = m**.
- Harness precedent `tests/browser/l-navbar.mjs`: `getBrowser/getPage/closeBrowser` from `.claude/skills/chrome-devtools/scripts/lib/browser.js`, base `http://localhost:3000`, `dismissPromo` from `tests/helpers/promo.mjs`, `check()` collector, screenshots → `tests/.output/`, exit 1 on any failure.
- No existing test references `footer`/`DuanMar`/wordmark (grep verified) → no legacy assertions to update.
- `npm test` = `node tests/run-unit.mjs` (14 files, incl. `tests/unit/i18n-parity.test.ts`).

## Deliverable
CREATE `tests/browser/m-footer-brand.mjs` (~120 LOC, mirrors `l-navbar.mjs` structure).

## Assertions
**Header (viewport 1280×900, `/vi` + `/en`, after `dismissPromo`):**
- [x] H1 `header a[href="/"]` exists AND has `aria-label="DuanMar"`
- [x] H2 inside it: `img[src*="/images/logo-duanmar.png"]` with `alt="DuanMar"`
- [x] H3 overlay: absolutely-positioned `span[aria-hidden="true"]` inside logo wrapper, text "DuanMar", computed `opacity` in 0.30–0.40
- [x] H4 solid wordmark present: `font-brand` span text "DuanMar", NOT `aria-hidden`
- [x] H5 logo img height ≤40px, no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`)
- [x] H6 screenshot `tests/.output/m-brand-01-header-vi.png`

**Footer (`/vi` then `/en`):**
- [x] F1 footer grid has exactly 4 column blocks (direct children of `div.grid`)
- [x] F2 titles in order — read expected from `src/messages/{locale}.json` (no hardcoded copy): VI `DuanMar, Tour, Liên hệ, Thông tin`; EN `DuanMar, Tours, Contact, Information`
- [x] F3 Col A exactly 2 links; hrefs `["/vi/tours/domestic","/vi/tours/international"]` (EN: unprefixed); labels `common.domesticTours` / `common.internationalTours` in order
- [x] F4 Col B exactly 5 links, order phone→email→facebook→instagram→tiktok
- [x] F5 Col B hrefs **byte-equal** to `messages[locale].contact.nodes[key].href` (`JSON.stringify` comparison) — proves single source of truth vs `/contact` page
- [x] F6 facebook/instagram/tiktok anchors: `target="_blank"` AND `rel` contains both `noopener` and `noreferrer`; phone/email anchors: no `target` attr
- [x] F7 Col C exactly 3 links: `/vi/support`, `/vi/blog`, `/vi/about/careers` with labels `footer.howToBook`, `footer.articles`, `footer.careers`
- [x] F8 brand block renders logo img + `footer.tagline` text
- [x] F9 bottom bar preserved: links `/vi/support`, `/vi/privacy`, `/vi/accessibility`, `/vi/sitemap` + `footer.rights` present
- [x] F10 old groups gone: footer contains NO `/explore/`, `/plan-your-trip/`, `/trade` hrefs
- [x] F11 zero `pageerror` events; screenshots `m-brand-02-footer-vi.png`, `m-brand-03-footer-en.png`

**Routes:** [ ] R1 `/vi/tours/domestic`, `/vi/tours/international`, `/vi/support`, `/vi/blog`, `/vi/about/careers` → HTTP 200 (via in-page `fetch`, pattern `l-navbar.mjs:63-76`).

## Pipeline Gates (all must pass in order)
1. `npm run lint` → exit 0
2. `npm test` → 14/14 (parity proves 4 new keys in both locales)
3. `npm run build` → exit 0 (run with dev server STOPPED)
4. `npm run test:browser` (dev server `npm run dev` on :3000) → expect **11/12**; `revalidate-webhook.mjs` pre-existing env failure (`SANITY_REVALIDATE_SECRET`) must NOT be touched/fixed.
   - Also must stay green (regression watch): `g-header.mjs`, `j-about-contact.mjs`, `l-navbar.mjs`, `f-ui.mjs`, `d8-a11y.mjs`.

## Changelog
APPEND to `docs/project-changelog.md` (file ascending by date, latest section `## 2026-09-28` at line 261 — add new bullet at END of file):
- Title: `- **[UI/Branding] Transparent logo header + footer navigation refactor** (plan 260928-1835-transparent-logo-footer-refactor)`
- Content: asset `public/images/logo-duanmar.png` (circular alpha mask) · header lockup `brand-logo.tsx` + `aria-hidden` overlay opacity 0.35 + `aria-label="DuanMar"` · footer 3 old groups → brand + Tours/Liên hệ/Thông tin · i18n +4 keys ×2 (`footer.{tours,info,howToBook,articles}`) · Col B single-source `contact.nodes` via `tc.raw` (byte-equal hrefs, socials `target=_blank rel=noopener noreferrer`) · deviation: Col A reuses `common.domesticTours/internationalTours` (not "Tour nội địa") · orphaned keys `visaInfo/gettingAround/accommodation/healthSafety` KEPT (still parity-tested) · Tests: NEW `tests/browser/m-footer-brand.mjs` (F/H/R checks) · Verified: lint 0 · `npm test` 14/14 · build 0 · `test:browser` 11/12 (revalidate-webhook pre-existing env fail) · Docs impact: minor.

## Todo
- [x] Create `tests/browser/m-footer-brand.mjs` with H/F/R assertions
- [x] Dev server on :3000 → `npm run test:browser` → only `revalidate-webhook` fails
- [x] Re-run `g-header`, `l-navbar`, `j-about-contact` individually → 0 regressions
- [x] `npm run lint` / `npm test` / `npm run build` green
- [x] Append changelog entry under `## 2026-09-28`
- [x] Flip phase statuses + plan status → Complete

## Success Criteria
- New test file auto-picked by runner; 11/12 files pass (tolerated pre-existing fail only).
- Contact hrefs in footer identical (byte-for-byte) to `/contact` page source values.
- Changelog documents deviation + orphaned-key decision.

## Risks
- Promo modal intercepts first click → always `dismissPromo` before selectors (precedent all tests).
- Computed opacity of nested spans: assert on the overlay span itself (`getComputedStyle`), not a parent.
- If logo asset missing, H2 fails → cascade; phase-01 asset verification is a hard prerequisite.
- Mobile-only checks flaky → keep viewport switches explicit (`page.setViewport` + sleep, pattern `l-navbar.mjs:49-52`).
