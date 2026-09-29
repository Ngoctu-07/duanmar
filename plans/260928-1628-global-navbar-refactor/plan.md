# Global Navbar Refactor — Plan

**Date**: 2026-09-28 · **Type**: UI/Routing + i18n + Tests · **Status**: Complete

## Executive Summary
Purge the 5 legacy links from the global header (desktop + mobile sheet share one `navItems` array in `header.tsx:11-17`) and render exactly 4, in order: **Tour trong nước** → `/tours/domestic` · **Tour nước ngoài** → `/tours/international` · **Ưu đãi & Gói du lịch** → `/deals` (existing) · **Blog** → `/blog` (existing). Foundation pages for Domestic/International are new static, message-driven routes (no domestic/international field exists in data — YAGNI, no fake tour data). Footer/sitemap/CTAs keep using the untouched `common.*` keys.

## Context Links
- **Research**: `research/research-summary.md` (2 explore agents, all file:line verified 2026-09-28)
- **Precedent**: `plans/260926-0136-top-nav-culture-deals-news/` (same shape: static nav landing pages) · `plans/260928-1428-about-us-section-contact-page/` (header purge precedent: keys stay for footer/sitemap)

## Binding Decisions (do not re-ask)
1. **Href map + order (AC2)**: `domesticTours→/tours/domestic`, `internationalTours→/tours/international`, `deals→/deals`, `blog→/blog` — exactly these 4, this order.
2. **One array, both surfaces**: `navItems` feeds desktop (`header.tsx:31`) AND mobile sheet (`:91`) → AC1+AC2 satisfied everywhere by one edit.
3. **i18n**: NEW `common.domesticTours|internationalTours|blog` × both locales ("Domestic Tours"/"Tour trong nước", "International Tours"/"Tour nước ngoài", "Blog"/"Blog"). **Reuse `common.deals`** (VI already exact: `vi.json:77`). Old keys `explore/planTrip/culture/news/deals` stay — footer (`footer.tsx:47,63`) + sitemap page (`:37,57,69-71`) consume them; changing/removing values breaks those surfaces (About-removal precedent).
4. **AC3 routing**: `/blog` (`blog/page.tsx`) and `/deals` (`deals/page.tsx`) exist → only Domestic/International are new: `src/app/[locale]/tours/{domestic,international}/page.tsx`. `[...rest]` 404 catch-all doesn't conflict (static segment wins).
5. **Foundational = static pages**: server component + static `metadata` + new `tours` messages namespace; Domestic links to existing `/explore/destinations` (all inventory is Vietnam), International shows honest empty-state. NO Sanity schema change, NO fake data.
6. **Sitemaps**: add both routes to `src/app/sitemap.ts:8-32` + HTML sitemap discover group (`sitemap/page.tsx:66-78`, labels via existing `tc`).
7. **Legacy routes stay live** — AC1 purges the header only; `/explore`,`/culture`,`/news`,`/plan-your-trip` pages, footer, homepage CTAs untouched.
8. **Tests**: NEW `tests/browser/l-navbar.mjs` (enforces AC1-3) · PATCH `j-about-contact.mjs:40-41` (asserts header KEEPS `/explore`+`/culture` — encodes old spec, must flip; documented like F7/B6 precedents). `g-header.mjs` verified unaffected (no count/href assertions on those links).

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Verification |
|---|-------|--------|----------|-----------|--------------|
| 1 | i18n keys ×2 locales + header `navItems` purge/replace | Complete | 100% | [phase-01](phase-01-i18n-header.md) | lint, `npm test` 14/14, build, DOM probe (4 links/order desktop+sheet) |
| 2 | `/tours/domestic` + `/tours/international` + sitemap ×2 | Complete | 100% | [phase-02](phase-02-routes-sitemap.md) | build route table, curl 200 + distinct h1, sitemap.xml hits |
| 3 | `l-navbar.mjs` + j J1 patch + full pipeline + changelog | Complete | 100% | [phase-03](phase-03-tests-pipeline-changelog.md) | lint · test 14/14 · build · test:browser **10/11** (revalidate tolerated) |

## New Files (allow-list)
- **Create**: `src/app/[locale]/tours/domestic/page.tsx` · `src/app/[locale]/tours/international/page.tsx` · `tests/browser/l-navbar.mjs` · `plans/260928-1628-global-navbar-refactor/*`
- **Modify**: `src/components/layout/header.tsx` · `src/messages/{en,vi}.json` · `src/app/sitemap.ts` · `src/app/[locale]/sitemap/page.tsx` · `tests/browser/j-about-contact.mjs` · `docs/project-changelog.md`
- **Delete**: 0. No `*-enhanced` files; all files <200 LOC; no new deps.

## Global Verification (every phase)
`npm run lint` → `npm test` (**14/14**) → `npm run build` → (P3) `npm run test:browser` on dev :3000 (**10/11** — only pre-existing `revalidate-webhook.mjs` env failure, do NOT "fix").

## Key Risks
- **j J1 patch** = only existing-test edit (spec change, documented in changelog) · g-header/f-ui unaffected (verified).
- **No nav-count assertions** exist anywhere (verified) — 5→4 breaks nothing else.
- **i18n parity** test (`tests/unit/i18n-parity.test.ts:46-59`) requires every new key in BOTH locale files → added together.
- **Header `<nav>` must render exactly 4** — no extra links inside `<nav>` (search/my-trips live outside it ✓ `header.tsx:42-63`).

## Unresolved Questions
None — plan approved 2026-09-28 (route map + EN labels confirmed with user).

## Completion Notes (2026-09-28)
- **Pipeline**: lint 0 · `npm test` **14/14** · `next build` 0 (route table: `ƒ /[locale]/tours/{domestic,international}`) · `npm run test:browser` **10/11** (only tolerated pre-existing `revalidate-webhook` env failure) · new `l-navbar.mjs` **18/18** (94 ln) · `j-about-contact` green after patch · `g-header` **0 edits, green** · curl `/vi`+`/en` new routes 200, distinct h1s, sitemap.xml 4 hits · evidence `tests/.output/l-navbar-01..02.png`.
- **Deviations (0 beyond plan)**: all decisions executed as approved; j J1 patch was pre-approved as decision 8 (2 checks flipped `/explore|/culture` → `/deals|/blog`, `check(` count unchanged).
- **Follow-ups**: tour inventory remains 100% Vietnam-domestic — when international inventory arrives, add a scope/country field to Sanity and replace the International empty-state · consider homepage hero CTA (`hero-section.tsx:60` → `/explore`) review in a future IA pass (out of scope here).
