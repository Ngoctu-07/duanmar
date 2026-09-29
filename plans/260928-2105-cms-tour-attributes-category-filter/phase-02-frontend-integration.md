# Phase 02 — Frontend Integration: Tabs, Cards Grid, Conditional Badges

**Status**: Complete · **Priority**: High · **Depends on**: P1 (fields + `DESTINATIONS_BY_CATEGORY_QUERY`)

## Context Links
- Tours pages: `src/app/[locale]/tours/domestic/page.tsx` (30 LOC; h1 `:16` = `t("domestic.title")`, subtitle `:17`, body `:20`, CTA `:21-26`) · `international/page.tsx` (23 LOC; h1 `:15`, subtitle `:16`, body `:18-20`, no CTA). i18n ns `tours` at `messages/{en,vi}.json:1126` (`domestic.{title,subtitle,body,cta}`, `international.{title,subtitle,body}`).
- Tab/pill precedent: `explore/events/page.tsx:51-73` (`<nav>` + `Link` + `aria-current` at `:62` — precedent value `"true"`; we use `"page"`, correct for current-page links, no test constrains value). Listing pills `explore/destinations/page.tsx:51-75`. **No tabs component; no `role="tab"` anywhere; do NOT introduce `@base-ui/react` Tabs (KISS — SSR pills).**
- Card grid precedent: `explore/destinations/page.tsx:80` `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`, empty state `:77-79`, `actionLabel={t("viewDetails")}` + `priceRange={priceRanges[dest.slug.current]}` `:82-87`; price plumbing `:36` `ALL_TOUR_PRICING_QUERY` fetch + `:42` `buildPriceRangeLabels(pricingDocs, locale, priceT("label"))`.
- Card anatomy: `src/components/explore/destination-card.tsx` (64 LOC) — interface `:9-16`, props `:18-22` (`priceRange?` optional), region row `:43-46`, name row `:47-50` (TourRatingBadge `:49`), description `:51-53`, `PriceRangeRow` `:54`, link `/explore/destinations/<slug>` `:55-60`; root = `data-slot="card"` (ui/card.tsx:11); image gate `:31-41` = conditional-render precedent; `PriceRangeRow` returns null when absent (`price-range.tsx:13`), `TourRatingBadge` client comp rendering null (`tour-rating-badge.tsx:50,60`).
- Detail: `[slug]/page.tsx` — chip row `:83-88` (region chip `:84-86` + `BookTicketButton`), h1 `:90`, description gate `:93-97`, `PriceBlock` `:99`, **`CustomerReviews` `:101` (contract — must stay)**, `notFound()` `:56`.
- Fetch contract: `fetchPublished` (`lib/fetch-published.ts:30-45`) + tags `["sanity:destination:list"]` (listing precedent `page.tsx:34`) / `["sanity:pricing:all"]` (`:36`) — mirrors `fetch-published-cache.test.mts:24-61` expectations.
- Cards shared with tested surfaces: listing `explore/destinations/page.tsx:82`, homepage `homepage/featured-destinations.tsx:29` — additions MUST be optional-prop + conditional (decision 6).

## Overview
- **Priority**: High · **Status**: Complete · **Effort**: ~1 h
- AC2: payload carries `difficultyLevel` + `isSpecialTour`; UI renders attributes ONLY when present/toggled; standard tours fall back to today's exact card/detail layout.
- AC3: `/tours/domestic` shows strictly `category=="domestic" || !defined(category)`; `/tours/international` strictly `category=="international"` — enforced in GROQ (P1), rendered as card grid + SSR pill tabs.

## Key Insights
- **One shared badge component** (`tour-attribute-badges.tsx`, client, `useTranslations("destinations")`, precedent `tour-rating-badge.tsx`) used by BOTH card and detail ⇒ DRY, locale-aware, SSR-rendered (visible to DOMParser-based tests), returns `null` when both fields absent ⇒ zero layout change (deviation vs proposal's inline chips at 2 sites — flagged).
- Card is a **sync server component** → cannot `await getTranslations` inside; a client badge child avoids making `DestinationCard` async (keeps call sites byte-identical).
- Always-render `<TourAttributeBadges .../>` (component self-gates to null) — same pattern as `TourRatingBadge` at `:49` (rendered unconditionally).
- Tab labels reuse `common.{domesticTours,internationalTours}` (en `:86-87`) ⇒ 0 nav keys; only 6 i18n keys needed (`tours.empty` + 5 badge labels), added to BOTH files → parity 783 → 789.
- `priceRange` on `/tours` cards = cheap parity (3 extra lines copied from listing precedent); if omitted cards still valid (`priceRange?`) — **decision: include**.

## Requirements
- **New `src/components/tours/tour-category-section.tsx`** (server comp, ≤120 LOC): props `{ category: "domestic" | "international" }`; renders
  1. pill `<nav aria-label>` with 2 `Link`s from `@/i18n/navigation` → `/tours/domestic` + `/tours/international`, labels from `getTranslations("common")`, active gets `aria-current="page"` + primary styling (events/listing pill classes), inactive = border/muted pill;
  2. fetch `fetchPublished(DESTINATIONS_BY_CATEGORY_QUERY, { category }, { tags: ["sanity:destination:list"] }) ?? []` (+ `ALL_TOUR_PRICING_QUERY` with `tags:["sanity:pricing:all"]`, `getTranslations("priceRange")`, `getLocale()` — listing precedent);
  3. grid `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` of `DestinationCard` (`actionLabel` from `destinations.viewDetails` via `getTranslations("destinations")`);
  4. empty state `<p className="text-center text-muted-foreground py-12">{t("empty")}</p>` (ns `tours`) when 0.
- **Rewrite both `/tours/*/page.tsx`**: keep metadata, h1/subtitle/body/CTA EXACTLY (same keys, same markup order: header block → body/CTA block), render `<TourCategorySection category="domestic|international" />` below existing content. h1 untouched (l-navbar contract).
- **`destination-card.tsx`** (≤75 LOC): extend interface with `difficultyLevel?: string; isSpecialTour?: boolean;` (NO `category` — YAGNI, flagged deviation); render `<TourAttributeBadges difficultyLevel={...} isSpecialTour={...} />` inside region row `:43-46` (chips wrap after region label). 0 prop changes at call sites.
- **New `src/components/explore/tour-attribute-badges.tsx`** (client, ≤45 LOC): `useTranslations("destinations")`; renders `null` unless `difficultyLevel` ∈ {easy,medium,hard,extreme} set and/or `isSpecialTour === true`; chips = `<span className="rounded-full border px-3 py-1 text-xs font-medium">` (detail region chip style `:84-86`); labels `difficulty.<level>` + `special`.
- **Detail `[slug]/page.tsx`**: insert `<TourAttributeBadges ... />` into chip row `:83-88` after region chip (server page renders client comp — fine). Nothing else moves; `CustomerReviews` `:101` untouched.
- **i18n (+6 ×2 files, both)**: `tours.empty` (EN "No destinations in this category yet." / VI "Chưa có điểm đến nào trong danh mục này.") · `destinations.difficulty.{easy,medium,hard,extreme}` (EN Easy/Medium/Hard/Extreme · VI Dễ/Trung bình/Khó/Cực khó) · `destinations.special` (EN "Special tour" / VI "Tour đặc biệt"). Tab labels NOT added (reuse `common.*`).
- **Non-goals**: no booking/checkout change; no `role="tab"`; no Base UI; no footer/header/sitemap edit; no `category` badge on cards; no fabricated CMS data.

## Related Code Files
- **Create**: `src/components/tours/tour-category-section.tsx` · `src/components/explore/tour-attribute-badges.tsx`
- **Modify**: `src/app/[locale]/tours/domestic/page.tsx` · `src/app/[locale]/tours/international/page.tsx` · `src/components/explore/destination-card.tsx` · `src/app/[locale]/explore/destinations/[slug]/page.tsx` · `src/messages/en.json` · `src/messages/vi.json`
- **Delete**: none
- **Read-only**: `explore/events/page.tsx:51-73` · `explore/destinations/page.tsx` · `homepage/featured-destinations.tsx` · `rating/tour-rating-badge.tsx` · `pricing/price-range.tsx` · `tests/browser/l-navbar.mjs` · `tests/browser/g-reviews.mjs`

## Implementation Steps
1. Create `tour-attribute-badges.tsx` (client): gate → null; else 1–2 chips (difficulty label via `t(\`difficulty.${level}\`)` guarded to known levels, special label when `isSpecialTour === true`).
2. Create `tour-category-section.tsx` (server): nav pills (copy class strings from `explore/events/page.tsx:64-67`, `aria-current="page"` on active) → `Promise.all` of category fetch + pricing fetch + 3 `getTranslations` + `getLocale` → grid/empty-state per Requirements.
3. Patch `destination-card.tsx`: interface +2 optional fields; add badge component import + render in region row (`:43-46`). Verify `git diff` = added lines only.
4. Patch detail page: add badge component into chip row after region chip `:86` (before `BookTicketButton`).
5. Rewrite both tours pages: add import + `<TourCategorySection category="…" />` after existing blocks; **do not modify h1/subtitle/body/CTA lines**.
6. Add the 6 i18n keys to BOTH `en.json` (`tours` `:1126+`, `destinations` `:122+`) and `vi.json` (same positions); `npm test` → i18n-parity **789/789**.
7. `npm run lint` → 0; **stop dev → `npm run build` → 0**: route table MUST show `ƒ /[locale]/tours/domestic` + `ƒ /[locale]/tours/international` (any `●`/`○` = regression); restart dev `:3000`.
8. Visual/functional smoke: `/vi/tours/domestic` (200, h1 unchanged, pills with aria-current, all legacy docs listed), `/vi/tours/international` (200, h1 unchanged, empty-state copy), `/vi/explore/destinations` + `/vi/explore/destinations/hcm` + `/vi` (200, cards byte-identical — no badge data yet), `#customer-reviews` still in hcm SSR.

## Todo List
- [ ] Create `src/components/explore/tour-attribute-badges.tsx` (client, null-gated, ≤45 LOC)
- [ ] Create `src/components/tours/tour-category-section.tsx` (pills + fetch + grid + empty, ≤120 LOC)
- [ ] Patch `destination-card.tsx` interface + badge render (optional only)
- [ ] Patch detail `[slug]/page.tsx` chip row (keep `CustomerReviews` intact)
- [ ] Rewrite `tours/domestic/page.tsx` + `tours/international/page.tsx` (h1 etc. verbatim)
- [ ] Add 6 i18n keys ×2 files → parity 789/789
- [ ] `npm run lint` 0 → stop dev → `npm run build` 0 (`ƒ` both tours routes) → restart dev
- [ ] Smoke: 5 surfaces 200, h1s unchanged, SSR `#customer-reviews` present

## Success Criteria
- AC2: with no CMS values ⇒ DOM of listing/homepage cards unchanged (badge comp renders null); with values ⇒ chips appear only on that card/detail.
- AC3: domestic page lists `domestic + undefined-category` docs, international lists strictly `category=="international"` (P3 proves against live GROQ).
- h1/subtitle/body/CTA byte-identical; `l-navbar` + `g-reviews` + `m-footer-brand` contracts unaffected; parity 789/789; lint 0; build 0 with `ƒ` on both tours routes.
- All new files ≤200 LOC, kebab-case, no new deps.

## Risk Assessment
- **Card DOM drift** (homepage/listing under test) → badge comp returns null absent data; assertion: destinations listing card count/text unchanged in smoke + full suite green.
- **Hydration mismatch** → badge text derived solely from props + i18n (server & client agree); no Date/random.
- **h1/nav interference** → new `<nav>` is page content, NOT inside `header` (`l-navbar` scopes to `header nav a` `:34`); no new h1.
- **Reviews SSR** → chips are siblings above `CustomerReviews`; suite check `g-reviews.mjs:154-167` guards.
- **Empty international page** (no backfilled docs yet) → designed empty-state, still 200 + exact h1.

## Security Considerations
- Read-only published data via `fetchPublished` (stega off); no write path, no tokens in components; i18n only — no user input rendered; no layout/privilege changes.

## Next Steps
- P3 proves filter/badge/parity behavior: `phase-03-tests-verification-changelog.md` (new unit + browser tests, pipeline, changelog).
