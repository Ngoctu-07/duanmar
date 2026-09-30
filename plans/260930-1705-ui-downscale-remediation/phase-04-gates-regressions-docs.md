# Phase 4: Gates + Regression Catalog + Changelog + Out-of-Band Debts

**Plan**: [`plan.md`](plan.md) · **Est**: 0.75h · **Status**: completed · **Files**: 1 modify (docs) + verification only · **Depends**: P1–P3

## Context Links
- **CORRECTED browser baseline — full suite run 2026-09-30 (`node tests/run-browser.mjs`, 30 files): `18/30 passed`** (the briefed "27/29" was stale, recorded pre-reseed):
  | class | files | cause |
  |---|---|---|
  | env (2, pre-existing) | `b-booking-confirmation-email.mjs` (`BOOKING_EMAIL_DELAY_MS`), `revalidate-webhook.mjs` (missing `SANITY_REVALIDATE_SECRET`) | known, do NOT "fix" |
  | CMS-reseed `hcm`-dependency (10, pre-existing) | `c-booking`, `c-payment`, `d8-a11y`, `f-ui`, `g-reviews`, `h4-p4-e2e`, `k-review-actions`, `n-lightbox-contact`, `p-tours-category` (P13 detail), `s-tour-hero-carousel` (S1 gallery query) | all navigate/`fetch` static `hcm` (404 after reseed) — verified individually + full run |
  | green (18) | incl. `u-icon-switcher-price.mjs` (**but hollow**: U8 skips 10 asserts) and `m2-footer-red-knockout.mjs` (**first recorded full-suite run = green**) | |
- Docs: `docs/project-changelog.md` = 534 lines, last section `## 2026-09-30` at :509 → append entries inside it · `Docs impact: minor`
- Out-of-band plans (both `status: pending`): `plans/260930-1544-icon-switcher-price-prominence/` (implemented + reviewed with Major finding now folded into P3; its changelog entry unwritten) · `plans/260930-1610-footer-red-knockout/` (implemented, m2 green in full suite; changelog entry + full gate record + code review outstanding)

## Gate sequence & targets (in order)
1. `npm run lint` → **0 errors**
2. `npm test` → **29/29 files** (no unit changes — CSS geometry not unit-assertable; do not add filler tests)
3. `npx tsc --noEmit` → **0**
4. `npm run build` → **0** — requires dev server **STOPPED** (CSS-404 incident precedent, changelog `## 2026-09-30`), then **restart `npm run dev`** before browser gates
5. `npm run test:browser` → report **actual N/M**; pass criterion = **no NEW failure vs the 18/30 baseline AND `u-icon-switcher-price.mjs` green with 0 SKIP lines**. Expected-shaped outcome ≈ **18–19/30** (10 hcm reds + 2 env reds pre-existing; +1 only if U8 fixture work reveals something unforeseen → then it's in-scope, fix it). The 10 hcm reds are **not** this plan's regressions — catalog only (unresolved Q: separate fixture-adoption plan vs CMS data restore)
6. Targeted spot-runs during P1/P2/P3 (fail fast): `g-header`, `a-ux-microinteractions`, `l-navbar`, `i-ai-assistant`, `u-icon-switcher-price`, `y-homepage-prune`, `z-favicon-head`

## Regression expectations (green set — selector/content based, no size/weight coupling)
- `g-header` (presence/geometry: 36px buttons unchanged) · `l-navbar` · `a-ux-microinteractions` (aria/tooltips/hero CTA fs — CTA out of scope) · `i-ai-assistant` (trigger visibility/aria/375 overflow — 48px strictly safer than 80px) · `r-entry-popup-cms` (locale `textContent`) · `d8-a11y` (pre-red; landmarks/labels unaffected)
- Footer cluster `m-footer-brand`, `m2-footer-red-knockout`, `o-footer-refinement`, `q-footer-asym-layout` — no shared files with P1/P2 (their `text-4xl` wordmark assert is unrelated to price `font-black`)
- Booking text-content: `c-booking`/`c-payment`/`f-ui` — would be size-agnostic, but pre-red on `hcm` (P3 dry-run proved the flow itself works on `bi-an-ha-noi`); F7's travel-date assertion is additionally covered LIVE by u-test `:247`
- Others expected green: `e-social-feed-heart`, `g-reviews`*(pre-red)*, `j-about-contact`, `k-review-actions`*(pre-red)*, `n-lightbox-contact`*(pre-red)*, `p-tours-category`*(pre-red)*, `revalidate-webhook`(env), `s-tour-hero`*(pre-red)*, `t-country-locale`, `v-about-narrative`, `w-about-gallery-removed`, `x-blog-feed`, `y-homepage-prune`, `z-favicon-head`

## Changelog entry (append to `docs/project-changelog.md` under `## 2026-09-30`)
- Section `### Changed` (or `### Fixed` for the U8 defect): bullet **[UI] Downscale recent upscales + contextual price hierarchy** (plan `260930-1705-ui-downscale-remediation`):
  - icons → 83.33% nearest-step (28→24 header/quick, 24→20 adornments/sheet) + `stroke-[1.5]` on 13 touched lucide icons; switcher `text-xs`/`px-2.5 py-1.5`/active `font-semibold`; chatbot trigger 80→48 + inner 40→24 (60%)
  - prices: cards 24→14.4px (60%), detail/checkout/summary 28→22.4 / 36→28.8 / 40→32 (80%), all `font-black`→`font-semibold` (7 sites, grep `font-black`=0)
  - **test remediation**: U8 dynamic CMS fixture (`resolveTourPricingFixture`, exact-slug intersect, rejects trailing-space doc) + loud skips — 10 silently-skipped assertions now execute; thresholds rewritten to new tier spec
  - Verified: lint 0 · unit 29/29 · tsc 0 · build 0 (dev stopped→restarted) · browser **N/M actual** vs corrected baseline 18/30 (2 env + 10 pre-existing `hcm`-reseed reds catalogued) · Docs impact: minor (this entry)
- **Do NOT write changelog entries for plans 1544/1610 here unless controller bundles them** — see debts below (their content differs: upscales/footer)

## Out-of-band debts (explicit list for controller bundling — user approval covers downscale only)
1. Plan `260930-1544`: changelog entry for the original upscale (still unwritten; arguably superseded by this entry — controller decision: merge narrative or write both chronologically), code-review closure (Major = U8 skip, now fixed here), plan `status` still `pending`
2. Plan `260930-1610`: changelog entry (footer red + knockout + newsletter prune), full gate record, code review, plan `status` still `pending` — its m2 test already green in full suite
3. Controller runs `node .claude/scripts/set-active-plan.cjs plans/260930-1705-ui-downscale-remediation` **after approval** (planner must NOT run it)

## Acceptance Criteria
- [ ] Gates 1–5 executed and recorded with **actual numbers** (no copied baselines)
- [ ] Changelog appended under `## 2026-09-30` with verified numbers + Docs impact: minor
- [ ] Browser report classifies every red as: env / pre-existing-hcm / (none new) — new reds must be fixed, not classified
- [ ] Debt list above handed to controller in completion message

**Status:** COMPLETED
