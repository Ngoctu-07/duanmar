# Plan: Transparent Logo Integration & Footer Navigation Refactor

Plan dir: `plans/260928-1835-transparent-logo-footer-refactor/`
Reports: `plans/260928-1835-transparent-logo-footer-refactor/reports/`
Work context: `D:\tour`

## Executive Summary
Replace header logo lockup with transparent circular badge + low-opacity text overlay, and rebuild footer as brand block + 3 columns (Tours / Liên hệ / Thông tin) with contact URLs single-sourced from `contact.nodes`. 3 phases, no new deps, no schema/API changes.

## Binding Decisions (do NOT re-ask)
- Source artwork `D:\logo duanmar.jpg` → circular alpha mask → `public/images/logo-duanmar.png` (script+asset produced by lead in parallel; this plan only references/verifies it).
- Footer: REPLACE 3 existing column groups (`footer.tsx:5-27`, `46-93`). Bottom bar `footer.tsx:95-125` untouched.
- Column A reuses `common.domesticTours` / `common.internationalTours` (NOT "Tour nội địa") — noted deviation, DRY + header parity (`header.tsx:11-17`).
- Column B consumes `contact.nodes.*` via `useTranslations("contact")` + `t.raw(...)` (pattern: `src/app/[locale]/contact/page.tsx:41`). Social = `target="_blank" rel="noopener noreferrer"`; `tel:`/`mailto:` plain `<a>`.
- Column C: `Cách đặt tour`→`/support`, `Bài viết`→`/blog`, `Tuyển dụng`→`/about/careers`.
- Header: `<Image>` + solid `BrandWordmark` + `aria-hidden` duplicate overlay (opacity 0.3–0.4); link `aria-label="DuanMar"`.

## Phases
| # | Phase file | Status | Scope |
|---|---|---|---|
| 01 | [phase-01-logo-asset-and-header.md](./phase-01-logo-asset-and-header.md) | Complete | asset verify, `brand-logo.tsx`, header lockup + overlay + a11y |
| 02 | [phase-02-footer-columns-and-i18n.md](./phase-02-footer-columns-and-i18n.md) | Complete | footer brand + A/B/C columns, 4 new i18n keys ×2, key disposition |
| 03 | [phase-03-tests-pipeline-changelog.md](./phase-03-tests-pipeline-changelog.md) | Complete | `tests/browser/m-footer-brand.mjs`, 4 gates, changelog |

## Allow-list
- CREATE: `public/images/logo-duanmar.png` (lead), `src/components/layout/brand-logo.tsx`, `tests/browser/m-footer-brand.mjs`
- MODIFY: `src/components/layout/header.tsx` (`:25-27`), `src/components/layout/footer.tsx`, `src/messages/en.json` + `src/messages/vi.json` (`footer.*` only), `docs/project-changelog.md`, [optional] `src/components/layout/footer-columns.tsx`
- DELETE: none (`footer.columns` old labels live on via sitemap; orphaned keys KEPT — see phase-02)
- FORBIDDEN: new deps, `*-enhanced` files, edits to `tests/browser/revalidate-webhook.mjs`, edits in `.claude/skills`, `next.config.ts`

## Global Verification (run in order, after each phase)
```
npm run lint
npm test                 # expect 14/14 (i18n parity = both locales for every new key)
npm run build            # run WITHOUT dev server open (wipe .next risk, changelog 2025-09-25)
npm run test:browser     # needs dev server :3000; expect 11/12 (revalidate-webhook = pre-existing env fail, DO NOT "fix")
```

## Risks
- `next-intl` `Link` may locale-prefix hrefs → contact nodes must render as plain `<a>` (byte-equal hrefs) — phase-02.
- Header lockup inside `h-16` bar: oversized logo → overflow (cap ≤40px).
- Overlay must NOT obscure emblem: keep `aria-hidden` + opacity ≤0.4, never `mix-blend` that inverts the black disc.
- Footer LOC creep past 200 → split to `footer-columns.tsx`.
- j/l/g header tests assert `header a[href]` sets → brand link stays `href="/"` (no `/about`), or J1 fails.

## Resolved Questions (were open at planning time)
1. Orphaned `footer.{visaInfo,gettingAround,accommodation,healthSafety}` → **KEPT** (parity test green; deleting = separate task).
2. Brand block mobile span → **APPLIED** `col-span-2 md:col-span-1` (logo+tagline too cramped in a half-width phone cell).
3. Mobile Sheet logo → **NOT added** (scope = desktop lockup; sheet keeps text-only brand).

## Completion Notes (2026-09-28)
- Pipeline: lint 0 · `npm test` **14/14** · `next build` 0 (dev server stopped for build) · `npm run test:browser` **11/12** (only pre-existing `revalidate-webhook` env fail, untouched).
- New `tests/browser/m-footer-brand.mjs` = **24/24 checks**; 0 existing tests edited (grep: no test referenced footer/brand).
- Deviations from plan text (documented, none are surprises): asset is **512×512** not 1024 (phase-01 said 1024) — 512 is 14× the 36px display size; Column A uses `common.*` labels as decided; VI column title = **"Tour du lịch"** (plan table draft said "Tour") to match the AC wording; EN hrefs are `/en/...` prefixed (plan note "EN unprefixed" was wrong — site renders `/en` prefixes everywhere), test encodes `/en/...`.
- Test-infra note: HTML has **no `document.documentElement.lang`** → locale guard uses `NEXT_LOCALE` cookie + explicit `/{locale}` URL.
- Evidence: `tests/.output/m-brand-01-header-vi.png`, `m-brand-02-footer-vi.png`, `m-brand-03-footer-en.png`.
- Docs impact: **minor** (`docs/project-changelog.md` entry + these status flips).
