---
title: "Downscale Recent UI Upscales to 83.33%, Chatbot to 60%, Contextual Price Hierarchy"
description: "Roll back plan 260930-1544 enlargements (icons 83.33%, chatbot 60%), refine strokes/weights, rebalance prices (cards 60%, detail+checkout 80%), un-skip U8's 10 assertions via dynamic CMS fixture."
status: complete
priority: P2
effort: 3.5h
branch: master
tags: [ui-icons, tailwind, pricing, browser-tests, test-remediation]
created: 2026-09-30
---

# UI Downscale Remediation

**Date**: 2026-09-30 · **Type**: Bugfix/Remediation (UI) · **Plan ID**: 260930-1705 · **Rolls back**: `plans/260930-1544-icon-switcher-price-prominence/` (implemented, `status: pending`)

## Executive Summary
Scale back everything plan 1544 enlarged — primary/nav/input icons → 83.33% (nearest standard step), chatbot trigger → exact 60% (clean non-intrusive float), locale switcher → compact — plus weight/stroke refinement (`font-extrabold`/`font-black` → `font-semibold`, lucide stroke → 1.5 on touched icons only). Prices get contextual tiers: listing/homepage cards → 60%, tour-detail + checkout/summary → 80% (still focal, not absurd). Test remediation folded in: `u-icon-switcher-price.mjs` U8 silently skips 10 assertions on dead fixture slug `hcm` — replaced with dynamic resolution (validated end-to-end). Pure presentation; no logic/i18n/data/CMS changes.

## Context Links
- **Rollback source**: `plans/260930-1544-…/phase-01-*.md` + `phase-02-*.md` (authoritative before-map) · **Sibling debt**: `plans/260930-1610-footer-red-knockout` (mid-flight, shares changelog) · **Docs**: `docs/project-changelog.md` append under `## 2026-09-30` (:509) · `Docs impact: minor`
- **VERIFIED probes (2026-09-30, dev :3000 + offline compile)**:

| fact | evidence |
|---|---|
| TW4.3.3 generates `.stroke-[1.5]` (→`stroke-width:1.5`) but **NOT** `.stroke-1.5`; CSS class beats lucide `stroke-width="2"` attr (computed 2px→1.5px) | offline postcss probe + live Chromium probe |
| `hcm` destination 404 (reseed); `bi-an-ha-noi` detail+checkout 200 with PriceBlock, form, momo QR | curl + 12-probe U8 dry-run **PASS** |
| live pricing slugs: `bi-an-ha-noi`, `"mat-ma-do-thi "` (trailing space → app exact-match lookup misses → rejected); U8 skip exits green while masking 10 asserts | Sanity query + full u-test run |
| browser baseline **18/30** (2 env reds + 10 `hcm`-reseed reds; briefed "27/29" stale; `m2` green in first full run) | `node tests/run-browser.mjs` full log |
| Button size rule: inside `<Button>` `size-*` only, else `h-* w-*` (`button.tsx:6` `[&_svg:not([class*='size-'])]:size-4`) | 1544 probe (still holds) |
- grep audit: `strokeWidth|stroke-1` in `src` = 0 · `font-extrabold` only `locale-switcher.tsx:31` · `font-black` = exactly the 7 price lines · no non-`u-*` test asserts `size-7|h-5 w-5|text-2xl|stroke-width|fw≥800`

## Requirements
### Functional
- [x] P1 table: icons 83.33% (28→`size-6`=24 nearest step, 24→`h-5 w-5`=20 exact), quick-access 28→24, chatbot `size-20`→`size-12` + `size-10`→`size-6` (exact 60%), switcher `text-xs`/`px-2.5 py-1.5`/active `font-semibold`, `stroke-[1.5]` on the 13 upscale-touched lucide icons ONLY
- [x] P2 table: card value `text-2xl font-black`→`text-[0.9rem] font-semibold` (60%); PriceBlock/checkout live total/payable/summary/my-trips → `text-[1.4rem]`/`text-[1.8rem]`/`text-[2rem] font-semibold` (80%); `text-xs` row container + travel-date `strong` branch untouched
- [x] P3: 25 u-test threshold/flow edits (never deleted) + 6 new stroke checks + dynamic fixture + loud skips
### Non-Functional
- [x] Invariants: 375px no-overflow · switcher `aria-current` contract (`r-entry-popup-cms:260-268`) · `aria-pressed` counts (`c-booking:111`, `s-tour-hero:191`) · F7 travel-date `font-semibold text-primary` (`f-ui.mjs:153`, live via u `:277`) · header icon buttons stay 36×36
- [x] Gates: lint 0 · unit **29/29** · tsc 0 · build 0 (dev STOPPED → restart) · browser = **16/30 actual**, u-test green with **0 SKIP lines**, `a-ux` green · **AC waiver**: reds = 2 env (`b-booking-confirmation-email`, `revalidate-webhook`) + 10 pre-existing `hcm`-reseed + **2 CMS-contact drift** — `m-footer-brand` F4/F5 and `j-about-contact` J3 both assert i18n `contact.nodes` (phone/email/facebook/**instagram**/tiktok) but `siteConfiguration.socialLinks` now returns 3 entries `{facebook, tiktok, {platform:"other", displayText:"duanmar@hcmussh.edu.vn", targetUrl:null}}` → instagram missing, 5th node renders as an unlinked `<span>` (4/5 anchors). Content/schema drift from plan `260930-2303`/Studio edits made **during** this session (footer `scrollWidth` went 375→434 between two runs of the same test), standalone-reproducible, zero file overlap → dispositioned as unresolved Q4, not a regression of this change. **Side finding fixed here**: that unlinked span (235px) overflowed the 160px mobile footer column → `footer.tsx` contact list got `break-words` (375 no-overflow invariant restored: `u` U6/U8 + `a-ux` D1 green again)

## Implementation Phases
### Phase 1: Icons + switcher + chatbot downscale (Est: 1h)
[`phase-01-icons-switcher-chatbot-downscale.md`](phase-01-icons-switcher-chatbot-downscale.md) — Modify: `header.tsx:74,86,97,106,113` · `hero-section.tsx:55` · `search-client.tsx:65` · `quick-access-icons.tsx:24` · `assistant-widget.tsx:210,213` · `locale-switcher.tsx:22,31`. Locked: nearest-step rounding (alt: `size-[23px]` rejected), `stroke-[1.5]` class mechanism (alt: prop/`stroke-1.5`/`@theme` rejected), switcher padding = ONLY structural-padding rollback (audit negative — nothing else was upscaled), dead container `font-medium` removed (1544 review Nit), inactive stays `font-normal`.
### Phase 1b: CTA rollback to 83.33% (user-confirmed scope addition, 3 files)
Added at implementation time — user's item 1 named "CTAs and structural padding", which plan `260929-2207` upscaled ~150% (outside 1544). Modify: `hero-section.tsx:66` + `about-us-section.tsx:40` `px-8 py-4 text-lg` → `px-7 py-3.5 text-sm` (32/16/18 → 28/14/14px) · `destination-card.tsx:82` `px-6 py-3 text-base` → `px-5 py-2.5 text-sm` (24/12/16 → 20/10/14) · `tests/browser/a-ux-microinteractions.mjs` C1/C2 → 83.33% window (py 13–15, fs 14–16). Nearest standard steps (4px grid); `size="lg"` `h-10` geometry untouched (never upscaled).
### Phase 2: Contextual price hierarchy (Est: 0.75h)
[`phase-02-contextual-price-hierarchy.md`](phase-02-contextual-price-hierarchy.md) — Modify: `price-range.tsx:20` (60%) · `price-block.tsx:73,76` (80%) · `booking-pricing-section.tsx:72` · `booking-payment-section.tsx:169` · `booking-summary.tsx:130` · `my-trips-detail.tsx:101` (checkout tier 80%). Locked: checkout/booking = detail tier (option a; b/c rejected), route mapping = detail `explore/destinations/[slug]` + `explore/itineraries/[slug]` vs listing `/vi/tours` + homepage cards; user's `/…/destinations/hcm` example now 404s → manual QA on `bi-an-ha-noi`.
### Phase 3: u-test rewrite + dynamic fixture (Est: 1h)
[`phase-03-tests-fixture-remediation.md`](phase-03-tests-fixture-remediation.md) — Modify: `tests/helpers/cms-expectations.mjs` (+`resolveTourPricingFixture()`: exact-slug intersect of tiered pricing × published destinations, deterministic) · `tests/browser/u-icon-switcher-price.mjs` (threshold table, 6 stroke checks, loud-skip replacing `check(true)`). Depends on P1+P2.
### Phase 4: Gates + regressions + docs (Est: 0.75h)
[`phase-04-gates-regressions-docs.md`](phase-04-gates-regressions-docs.md) — Modify: `docs/project-changelog.md`. Execute gates in order, classify every red (env / pre-existing-hcm / new→fix), hand controller the 1544+1610 debt list.

## Testing Strategy
- **Authority**: u-test per P3 table — U1 28→24 ×2 · U2 24→20/28→24/24→20 · U3 h≥28, fs≥12, btn≥26, fw≥600 ×2 · U5 48±1/24±1 · U6 24/20/48±1 · U7 fs≥14, ratio≥1.2, fw≥600, h3-flip · U8 cells≥22, total≥28, summary≥22, payable≥32 (fw≥600 each) · +6 stroke `≤1.5` · fixture dynamic, skips loud
- **Regression green-set**: `g-header`, `l-navbar`, `a-ux-microinteractions`, `i-ai-assistant`, `r-entry-popup-cms`, `m/m2/o/q`-footer, `y-homepage-prune`, `z-favicon-head`, `t-country-locale`, `j/e/v/w/x` · 12 pre-reds catalogued in P4, not fixed here
- **Unit**: none new (CSS geometry not unit-assertable) → **29/29** (suite grew from the briefed 26 via concurrent plans)

## Security Considerations
- [x] No new env/keys/inputs; helper reads published Sanity via existing `cms-expectations.mjs` pattern; no CMS writes; text stays React-escaped

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| U8 runs live for first time since reseed → surprise reds | High | 12-probe dry-run PASS on `bi-an-ha-noi` (detail+checkout+momo+0 pageerrors) before edits |
| Nearest-step rounding (24 vs exact 23.33) visual drift | Med | Locked table; ≤0.67px drift; arbitrary values only where no step ≈ target % |
| Card ratio 14.4/12 sits exactly on `≥1.2` float edge | Med | computed 1.2000000000000002 ≥ 1.2 verified; fallback threshold ≥1.19 |
| 10 pre-existing `hcm` reds misread as regressions | Med | Baseline 18/30 + classification in P4; pass = no NEW red + u 0 SKIP |
| Changelog file shared with mid-flight plan 1610 | Low | append-only section; controller sequences the two plans |
| stroke 1.5 thinning icon visibility/contrast | Low | visual QA in P1; `d8` (pre-red) asserts labels/landmarks, not strokes |

## Quick Reference
```bash
npm run lint && npm test && npx tsc --noEmit   # 0 / 26 files / 0
npm run build                                   # ONLY with dev stopped (CSS-404 precedent) → restart `npm run dev`
npm run test:browser                            # actual N/M vs baseline 18/30; u-test must show 0 SKIP
node .claude/scripts/set-active-plan.cjs plans/260930-1705-ui-downscale-remediation   # CONTROLLER after approval — planner must NOT run
```

## TODO Checklist
- [x] P1: 6 files — 13 icons at 83.33%/60% + `stroke-[1.5]`; switcher compact + `font-semibold`
- [x] P2: 6 files — 7 `font-black` sites → two contextual tiers, all `font-semibold`
- [x] P3: u-test 25 rewrites + 6 stroke checks + dynamic fixture + loud skips (0 `check(true)` placeholders)
- [x] P4: gates with actual numbers · changelog append · 1544/1610 debts handed to controller
- [x] Code review passed

## Unresolved Questions
1. ~~Checkout/booking prices locked to **80% (option a)** — confirm user accepts~~ → **RESOLVED 2026-09-30**: user picked "80% — same as detail"; CTA rollback also confirmed in-scope ("Yes — downscale CTAs too").
2. The 10 pre-existing `hcm`-dependent reds: follow-up plan adopting the shared resolver (est ~1.5h) vs restoring `hcm` docs in Studio — outside user-approved downscale scope; controller/user call.
3. Plan 1544's unwritten changelog entry: merge narrative into this entry vs write both chronologically — controller + docs-manager call.
4. `m-footer-brand` F4/F5 red is NEW vs the 18/30 baseline: CMS `contact.nodes` exposes 3 of the 5 `NODE_KEYS` (phone/email/facebook; instagram+tiktok absent) — data drift from plan `260930-2303-cms-social-contact-links`, reproducible standalone, zero relation to this change's files. Controller call: reseed/restore the 2 CMS nodes or relax the test to "≥ rendered nodes".
