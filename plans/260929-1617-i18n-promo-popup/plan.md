# Plan — Multi-language (i18n) Promotional Popup + Locale-Switch Re-trigger

**Date**: 2026-09-29 · **Status**: Complete · **Progress**: 100% · **Priority**: High

## Scope (from brief)
1. **Studio**: `popupImage_vi` + `popupImage_en` on the Marketing/Popup settings doc (repo name: **Site Configuration** singleton).
2. **Binding**: frontend renders the asset for the active locale (vi vs en).
3. **Re-trigger**: switching language via the global EN/VI toggle sets `isOpen = true` and re-hydrates with the new locale's asset — instant, seamless, no manual refresh.

## Key Research Findings
- **Modal**: `src/components/layout/promo-modal.tsx` (55 LOC) — `open` state, mount-only `useEffect(() => setOpen(true), [])` (`:24`), prop-driven `imageSrc`, **no persistence** (dismissal = React state only, deliberate YAGNI), `data-slot="promo-modal"` / `"promo-modal-close"`, 3 i18n keys (`promo.title/imageAlt/close`).
- **Mount**: `src/app/[locale]/layout.tsx:28-32` — server component fetches `SITE_CONFIGURATION_QUERY`, passes `imageSrc/width/height/enableEntryPopup`; `getLocale()` from next-intl/server already used in 5 pages.
- **Schema/query**: `src/sanity/schemaTypes/site-configuration.ts:16-20` single `entryPopupImage`; `src/sanity/queries/site-configuration.ts:4-9` projects it + `enableEntryPopup`, **0 params**, unit-tested literals (`site-configuration-query.test.mts`: needs `entryPopupImage` literal, forbids `$`, ` ? `, balanced parens).
- **Field convention**: flat `_en`/`_vi` + fieldsets per `post.ts:7-10` (internationalized-array plugin NOT registered in `sanity.config.ts`).
- **Switcher**: `src/components/layout/locale-switcher.tsx:12-15` — client-side `router.replace(pathname+query, { locale })` (next-intl, writes `NEXT_LOCALE` cookie), **no full reload**, no `router.refresh`.
- **Locale on client**: `useLocale()` from next-intl — proven pattern `hero-section.tsx:19`.
- **Crux (static analysis)**: `[locale]` is a dynamic segment; switching locale changes the segment state key → Next 16.3.6 **recreates the subtree** (layout-router.js:524-526: *"Whenever the state key changes, the tree is recreated and the state is reset"*), so the modal likely re-opens + re-fetches new props automatically. **Must be confirmed empirically**; explicit `useLocale()` effect makes it guaranteed either way.
- **Precedent for locale pick**: `src/lib/news-content-provider.ts:44` `pick = (locale, en, vi) => …` (`title_en/title_vi`).
- **Test risk**: `tests/browser/r-entry-popup-cms.mjs` R3/R4 compare DOM img vs **single-field** GROQ (`:33-34,119-128`) → hard-break with localized assets; R5 uses vi messages only; no test clicks the switcher today; no test touches sessionStorage; `dismissPromo` helper (16 files) tolerant of absent modal.

## Decisions (proposed → confirm)
| # | Decision | Recommendation |
|---|----------|----------------|
| D1 | Legacy field | **Keep `entryPopupImage`** as fallback (brief says "dedicated fields", not "replace"); query keeps the literal → existing unit test stays green |
| D2 | Fallback chain (when locale asset missing) | **`popupImage_<locale>` → `entryPopupImage` → other-locale field → hide** — popup never goes blank while any asset exists |
| D3 | Re-trigger | **Explicit `useLocale()` + `useEffect(…, [locale])`** (replaces mount-only effect; covers both remount and same-instance cases) + empirical remount check |

## Phases
| # | Phase | Status | Progress | Gate |
|---|-------|--------|----------|------|
| 1 | Schema `popupImage_vi/_en` + query projection + `layout.tsx` locale binding | Complete | 100% | [phase-01](phase-01-schema-binding.md) · lint 0 · unit 18/18 · schema 0 errors |
| 2 | Modal locale-switch re-trigger (`useLocale` effect) + instant re-hydration | Complete | 100% | [phase-02](phase-02-locale-retrigger.md) · smoke: reopen EN/VI both ways, marker survived (no reload), 0 pageerror |
| 3 | Tests (unit extend + R3/R4 localization + new R15/R16) + pipeline + changelog | Complete | 100% | [phase-03](phase-03-tests-verification-changelog.md) · `r-entry-popup-cms` **13/13** · build 0 · browser **16/17** (sole fail = pre-existing `revalidate-webhook`) |

## Gate Expectations
`npm run lint` 0 · `npm test` **18/18** (same file count; `site-configuration-query.test.mts` extended) · `npm run build` 0 · `sanity schemas validate` 0 errors · `npm run test:browser` **16/17** (sole fail = pre-existing `revalidate-webhook`) · i18n parity kept (0 new keys planned).

## Risks & Mitigations
- Remount assumption wrong → D3 explicit effect covers it; browser test R15 proves behavior either way.
- Two modal instances after switch (double-mounted subtrees) → R2-style `count === 1` assertion in R15.
- R3/R4 stale single-field expectation → test GROQ + derivation become locale-aware (D2 chain mirrored exactly).
- Locale switch blocked by open overlay when clicking header → new checks dismiss before/after as needed; keep `dismissPromo` before any `page.click`.
- Only one locale's asset filled in live CMS → D2 chain (cross-locale last) keeps popup visible for both locales.

## Out of Scope
Per-locale alt text / new i18n keys · localized headline/copy in popup · suppression persistence (localStorage) · internationalized-array plugin · Studio structure changes.

## Docs impact
minor — changelog bullet + plan + report.
