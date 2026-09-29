# Implementation Report — i18n Promo Popup + Locale-Switch Re-trigger

**Date**: 2026-09-29 · **Plan**: `plans/260929-1617-i18n-promo-popup/` · **Status**: Complete (100%)

## Scope
(1) `popupImage_vi`/`popupImage_en` fields on Site Configuration; (2) locale-aware asset binding; (3) EN/VI toggle re-opens modal instantly with the new locale's asset — no reload.

## Deliverables
| AC | Implementation | Verified |
|----|----------------|----------|
| 1 Schema | `site-configuration.ts`: fieldset `popup` + 2 image fields (hotspot); `entryPopupImage` kept as fallback (D1); query +2 comma-separated projections (still 0 params, no ternary) | schema validate 0 errors; unit +3 checks incl. **groq-js parse** |
| 2 Binding | `layout.tsx`: `getLocale()` → chain **`popupImage_<locale>` → `entryPopupImage` → other locale → null** (D2 approved); width/height from chosen asset; PromoModal props unchanged | unit chain derivation mirrored in test GROQ; R3/R4 compare vs chosen VI asset |
| 3 Re-trigger | `promo-modal.tsx`: `useLocale()` + `useEffect(…, [locale])` (was `[]`); works whether `[locale]` segment remounts or instance persists; no storage added | **R15**: EN toggle → `/en/...`, count=1, EN asset, EN alt, reload-marker=1; **R16**: back to VI; smoke both directions 0 pageerror |

## Files
- **Modified (7)**: `src/sanity/schemaTypes/site-configuration.ts` · `src/sanity/queries/site-configuration.ts` · `src/app/[locale]/layout.tsx` · `src/components/layout/promo-modal.tsx` · `tests/unit/site-configuration-query.test.mts` · `tests/browser/r-entry-popup-cms.mjs` · `docs/project-changelog.md`
- **Created**: this plan dir (plan + 3 phases + report). **Deleted**: 0. **i18n keys**: 0 (parity untouched).

## Verification (gates)
- lint exit 0 · `npm test` **18/18** · `npm run build` exit 0 (dev stopped/restarted) · `sanity schemas validate` 0 errors
- `r-entry-popup-cms.mjs` exit 0 (**13/13** incl. R15/R16) · `npm run test:browser` **16/17** (sole fail = pre-existing `revalidate-webhook` / missing `SANITY_REVALIDATE_SECRET`)
- Evidence: `tests/.output/promo-i18n-smoke.png`, `r-entry-popup-03-locale-en.png`

## Key finding
Live CMS has only `entryPopupImage` → both locales currently resolve to the legacy asset (D2 chain); R15/R16 still prove re-trigger + EN/VI message switching. Per-locale asset swap activates the moment editors upload `popupImage_vi`/`popupImage_en`.

## Outstanding (user action)
Studio → Site Configuration → upload per-locale popup images (fieldset "Promo Popup").

## Docs impact
minor — changelog bullet under `## 2026-09-29` + plan statuses + this report.

**Status:** DONE
**Summary:** Per-locale popup fields, D2 fallback chain, and guaranteed locale-switch re-open (no reload) landed; 18/18 unit, 13/13 popup test, 16/17 suite (known env fail).
