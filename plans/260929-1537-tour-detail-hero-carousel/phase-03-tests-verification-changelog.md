# Phase 3 — Tests, Full Pipeline, Studio Check, Changelog

**Context**: plan [plan.md](plan.md) · Inputs: Phases 1-2
**Priority**: High · **Status**: Complete (100%) · **Depends on**: Phase 2

## Overview
New data-driven browser test `s-tour-hero-carousel.mjs`, full gate pipeline, fold measurement proof, Studio manual verification, changelog + plan status + report.

## Requirements
- AC1: browser test asserts — carousel testid present; **data-driven branches**: ≥2 gallery images → track slides ≥2 + index advances after ~3.3s + seamless wrap; 0/1 gallery → static fallback img (no interval) · hero box ratio ≈ 0.45×width and **< 0.5×width** (proves −20% vs 0.5625) · above-the-fold @1280×900: booking CTA + h1 + PriceBlock top < 900 (PriceBlock branch only if `section[aria-labelledby="tour-price-heading"]` exists) · 0 `button[aria-pressed]` outside `#customer-reviews` (re-assert c-booking invariant).
- AC2: gates all green per plan.md; re-run `p-tours`, `c-booking`, `g-reviews`, `d8-a11y` at minimum (full suite anyway).
- AC3: Studio manual check: `sanity schemas validate` + user opens Homepage→ no wait: user opens `/studio` → destination doc shows `galleryImages` with min-3 validation + preview thumbnail from first image.

## Related Code Files
- Create: `tests/browser/s-tour-hero-carousel.mjs` (runner auto-picks `tests/browser/*.mjs`)
- Modify: `docs/project-changelog.md` (append under `## 2026-09-29`), `plans/260929-1537-tour-detail-hero-carousel/*` (statuses + report)

## Implementation Steps
1. Write `s-tour-hero-carousel.mjs`: goto `/vi/explore/destinations/hcm`, dismiss promo, fetch live gallery via GROQ (pattern: `j-about-contact.mjs` `fetchHomepageMedia`) → choose branch; puppeteer `boundingBox()`/`getBoundingClientRect` for ratio + fold asserts; screenshot.
2. Fold proof script: measure @1280×900 and @375×812; record numbers in report (hero h must be ≈0.45×w; CTA/price tops < vh).
3. `npm run lint` → `npm test` (18/18) → stop dev → `npm run build` → `npx sanity schemas validate` → start dev → `npm run test:browser` (16/17 expected).
4. Changelog bullet (VN style, under `## 2026-09-29`).
5. Plan statuses → Complete; write `reports/implementation-2026-09-29-tour-hero-carousel.md`.

## Todo List
- [ ] new browser test (both data branches)
- [ ] fold measurement proof (2 viewports)
- [ ] full gate pipeline
- [ ] Studio validate + manual note
- [ ] changelog + statuses + report

## Success Criteria
`node tests/browser/s-tour-hero-carousel.mjs` exit 0 · full suite 16/17 (sole pre-existing fail) · lint 0 · unit 18/18 · build 0 · schema 0 errors · screenshots saved.

## Risk Assessment
Live CMS has 0 `galleryImages` today → static branch is the one exercised until user uploads ≥3 images in Studio (or runs backfill with token); test auto-switches branch afterwards. Note as outstanding user action in report.

## Security Considerations
No secrets; GROQ reads use public dataset like existing tests.

## Next Steps
Done → outstanding: user Studio upload (≥3 gallery images per doc), optional backfill `--apply` when `SANITY_WRITE_TOKEN` exists.
