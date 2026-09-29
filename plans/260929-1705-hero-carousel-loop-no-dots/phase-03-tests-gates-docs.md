# Phase 03 — Test Rewrite, Full Gates, Docs

**Status**: Complete (100%) · **Depends on**: Phase 2 · **Priority**: High

## Test rewrite — `tests/browser/s-tour-hero-carousel.mjs`
1. S1 snapshot: replace `dots` collection with `buttons` count; assert `buttons === 0` (dots removed).
2. S2 multi-slide branch:
   - Keep clone check `imgs === galleryCount + 1`.
   - Replace "one dot per gallery image, no aria-pressed" → **"S2 pagination dots removed"** (`buttons === 0`).
   - Replace `activeDot()` helper with **active-slide helper** (index of slide child where `aria-hidden !== "true"`).
   - "autoplay advances after ~3s": active-slide index changes.
   - "infinite loop": **strengthened** — within `galleryCount*3000+4000`ms observe (a) active child == `galleryCount` (clone displayed) AND (b) subsequently active child == 0 (real first slide) — proves the snap-back, closing the old blind spot where `aria-current` flipped to dot 0 while the clone was still shown.
   - Remove dot-label/`slideLabel` assertions.
3. Static branch (`galleryCount < 2`): update `dots` reference → `buttons === 0`.
4. Keep: S1/S3/S4, `dismissPromo`, cursor parking (now harmless), B6 `aria-pressed` invariant check.

## Verification sequence
1. `node tests/run-browser.mjs` full → all green except `revalidate-webhook.mjs` (env, pre-existing).
2. `npm run lint` → 0 errors.
3. `npm test` → **18/18** (i18n parity included).
4. `npm run build` → exit 0 (stop dev → build → restart dev).
5. `npx sanity schemas validate` → 0 errors.
6. Final `npm run test:browser` → confirm suite state.

## Evidence & docs
- Screenshots: `tests/.output/s-hero-carousel-03-no-dots-desktop.png`, `-04-no-dots-mobile.png` (dots visibly absent).
- Live probe log (cursor on hero, full wrap) recorded in report.
- Changelog: Vietnamese bullet under `## 2026-09-29` in `docs/project-changelog.md` (root cause = hover pause masking a working loop; dots removed; `slideLabel` dropped; test strengthened).
- Report: `reports/implementation-2026-09-29-hero-carousel-loop-no-dots.md`.
- Flip statuses: `plan.md` + phase-01/02/03 → Complete / 100%.

## Todo
- [ ] Rewrite S1/S2 checks (active-slide tracking + strengthened loop proof)
- [ ] Targeted run of s-tour-hero-carousel
- [ ] Full gates (browser → lint → unit → build → schema → final browser)
- [ ] Screenshots ×2 + probe evidence
- [ ] Changelog + report + status flips
