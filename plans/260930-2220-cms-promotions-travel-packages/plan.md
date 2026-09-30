# CMS-Driven Promotions & Travel Packages (`/deals`)

**Date**: 2026-09-30 · **Type**: Feature Implementation · **Status**: Complete

## Executive Summary
`/[locale]/deals` renders 4 hardcoded i18n cards via `t.raw("items")`. Convert to Sanity
`promotion` documents (house bilingual pattern A: flat `_en`/`_vi` + fieldsets), add
server-side expiry filter, per-promo currency-honest pricing, countdown labels, real
`targetTour` reference, banner image with alt, and keep promotions searchable. Page stays
RSC — zero new client JS, zero new dependencies.

## Context Links
- Target page: `src/app/[locale]/deals/page.tsx` (45 lines, RSC) · Search: `src/app/[locale]/search/page.tsx:30,99-101,130-151`
- Pattern source: `src/sanity/schemaTypes/article.ts:7-53` (fieldsets), `:61-67` (image+hotspot), `:75-89` (date, preview) · reference precedent `destination.ts` (`country` ref; `name` string, `slug`)
- Query: `src/sanity/queries/destinations.ts` (`defineQuery` + `${imageFragment}`) · `src/sanity/fragments/image.ts` · fetch `src/sanity/lib/fetch-published.ts` (published-only, fail-open `null`, tag cache)
- Params precedent: `src/app/[locale]/explore/destinations/[slug]/page.tsx:22-24,42-50`
- Rules: `./.claude/rules/development-rules.md`, `./.claude/rules/documentation-management.md` · NOTE: `./README.md` does not exist in repo (nothing to read — unresolved).

## Locked Decisions (do not re-litigate)
1. Doc type `promotion`; pattern A flat `_en`/`_vi` + `fieldsets` mirroring `article.ts:7-53`.
2. Prices: `discountedPrice`/`originalPrice` numbers + required `currency` enum (VND|USD, init VND) — house `formatPrice` flips currency by locale and would mislabel a single number; format with `Intl.NumberFormat`.
3. Expiry: JS filter `validUntil >= today` (string `YYYY-MM-DD`). GROQ `now()` would kill a promo at 00:00 UTC ON its last day, breaking the "Last day today" label.
4. `targetTour` = optional `reference → destination`; card shows "View tour" only when slug exists. CTA label from i18n (destination `name` is mono-language).
5. `bannerImage` = image + hotspot + nested `alt` string — **first image-alt precedent in repo** (document in schema comment).
6. `validUntil` = `date`, required. `isActive` bool, init true, required. NO slug (cards key `_id`).
7. `description` = **plain `type: "text", rows: 3`** (NOT Portable Text): blurbs are 1–2 sentences, renders identical to today's `<p>` with zero serialization/JS — PT only where inline formatting is actually used (article content, itinerary details).
8. Missing/malformed `validUntil` → NOT live (fail closed; schema requires it anyway).

## Phases
- [x] P1 Schema + GROQ query + registration → `phase-01-promotion-schema-and-groq-query.md`
- [x] P2 Shared lib + i18n keys (EN/VI parity) → `phase-02-promotions-lib-and-i18n.md`
- [x] P3 `/deals` page + `promotion-card.tsx` (RSC) → `phase-03-deals-page-and-card-ui.md`
- [x] P4 Search index integration → `phase-04-search-index-integration.md`
- [x] P5 Tests + gates + changelog → `phase-05-tests-gates-and-changelog.md`

## Files
- create: `src/sanity/schemaTypes/promotion.ts`, `src/sanity/queries/promotions.ts`,
  `src/lib/promotions.ts`, `src/components/deals/promotion-card.tsx`,
  `tests/unit/promotion-schema-queries.test.mts`
- modify: `src/sanity/schemaTypes/index.ts`, `src/app/[locale]/deals/page.tsx`,
  `src/app/[locale]/search/page.tsx`, `src/messages/en.json`, `src/messages/vi.json`,
  `docs/project-changelog.md`
- delete: none. **Do NOT touch** the many other modified working-tree files (other features).

## Verification Gates (P5)
`npx tsc --noEmit` → `npm run lint` → `npm test` (27/27 → **28/28** files) →
`npx sanity schemas validate` (0 errors) → `npm run build`
(**stop dev server on :3000 first** — PID 16856 at plan time, re-check `netstat`; restart after).
Browser check OPTIONAL: no `SANITY_WRITE_TOKEN` → page renders `deals.empty` until an
editor enters promotions — expected (same as itinerary feature).

## Risk / Security
- i18n parity: `deals.items` removed from BOTH message files; 4 new keys added to both.
- GROQ safety: `defineQuery`, no ` ? `, balanced parens, `${imageFragment}`, no `$` params.
- Published-only, stega-off fetch; no secrets; day boundary uses UTC `YYYY-MM-DD`
  (same convention as `article.ts` initialValue) — ±7h edge for VI users near midnight, accepted.
