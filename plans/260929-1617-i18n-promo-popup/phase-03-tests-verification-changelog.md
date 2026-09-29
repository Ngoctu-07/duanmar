# Phase 3 — Tests, Pipeline, Studio Check, Changelog

**Context**: plan [plan.md](plan.md) · Inputs: Phases 1-2
**Priority**: High · **Status**: Complete (100%) · **Depends on**: Phase 2

## Overview
Make `r-entry-popup-cms.mjs` locale-aware (R3/R4 currently hard-code the single legacy field), add re-trigger checks (R15/R16), extend the unit query test, run the full gate pipeline, changelog + report.

## Requirements
- AC1: `tests/unit/site-configuration-query.test.mts` gains checks: projects `popupImage_vi` **and** `popupImage_en`; still 0 params / no GROQ ternary / balanced parens; **groq-js `parse()`** on the query (catches missing-comma class of bug from feature 260929-1537).
- AC2: `r-entry-popup-cms.mjs` updates:
  - GROQ (`:33-34`) fetches all 3 image fields; expected-asset derivation mirrors Phase-1 chain for **vi** (`popupImage_vi ?? entryPopupImage ?? popupImage_en`); `enabled`/`mode`/`expectW/H` derived from the chosen asset.
  - R3/R4 unchanged in spirit but compare against the derived VI asset (only breaks if rendering ignores the chain).
  - **R15 (new)**: after R7 (header nav to `/vi/tours/domestic`), click the EN button in `header` (locale-switcher) → assert **no `page.goto`** (same execution context) → `[data-slot="promo-modal"]` count **=== 1** within 5s → img src matches **EN chain** (`popupImage_en ?? entryPopupImage ?? popupImage_vi`) → `alt === msg.en.promo.imageAlt` (load `en.json` too).
  - **R16 (new)**: dismiss → click VI button → modal reappears with VI asset → dismiss (leaves page clean; R11 zero-pageerror still asserted last).
  - Selector for switcher: header `button` whose trimmed text is `en`/`vi` (two instances desktop/mobile → pick visible one).
- AC3: gates: lint · unit 18/18 · build (dev stopped/restarted) · schema validate · full browser suite 16/17 · Studio manual note (upload per-locale images).
- AC4: changelog under `## 2026-09-29` + plan statuses + report file.

## Related Code Files
- Modify: `tests/unit/site-configuration-query.test.mts`
- Modify: `tests/browser/r-entry-popup-cms.mjs` (GROQ `:33-34`, derivation `:61-73`, R3/R4 `:119-128`, insert R15/R16 after R7 `:215`, messages load `:6-8`)
- Modify: `docs/project-changelog.md`, `plans/260929-1617-i18n-promo-popup/*` (statuses + report)

## Implementation Steps
1. Unit additions first (fast fail on query shape).
2. Update browser test derivation + R3/R4; add R15/R16; keep R8-R10 disabled branch semantics (`enabled` from chain-derived asset).
3. Run `node tests/browser/r-entry-popup-cms.mjs` standalone → exit 0.
4. Full pipeline: lint → unit → stop dev → build → schema validate → start dev → `npm run test:browser`.
5. Screenshots: existing `r-entry-popup-01/02` + new `r-entry-popup-03-locale-en.png` (EN asset open) if feasible.
6. Changelog + statuses + report.

## Todo List
- [ ] unit query test extensions
- [ ] R3/R4 locale-aware + R15/R16
- [ ] standalone run
- [ ] full gate pipeline
- [ ] changelog + statuses + report

## Success Criteria
`node tests/browser/r-entry-popup-cms.mjs` exit 0 (all checks incl. R15/R16) · unit 18/18 · lint 0 · build 0 · schema 0 errors · suite 16/17 (known env fail only).

## Risk Assessment
Live CMS may have only `entryPopupImage` set (likely) → R15/R16 prove **re-trigger** mechanics while asset identity = legacy for both locales; the per-locale asset swap is proven by unit chain + R3/R4 derivation logic and lights up when editors upload the second image. Report must state which assets were live at test time.

## Security Considerations
No secrets; test reads public dataset like existing files.

## Next Steps
Done → outstanding: editors upload `popupImage_vi`/`popupImage_en` in Studio (`/studio` → Site Configuration).
