# P3 — `/deals` Page + Promotion Card (RSC)

## Context Links
- Target: `src/app/[locale]/deals/page.tsx` (45 lines → rewrite in place)
- Params pattern: `src/app/[locale]/explore/destinations/[slug]/page.tsx:22-24,42-50` (`params: Promise<{ locale }>`)
- Empty state: `src/app/[locale]/blog/page.tsx` + `explore/destinations/page.tsx:78` (`text-center text-muted-foreground`)
- Fetch: `src/sanity/lib/fetch-published.ts` (returns `null` on failure → `?? []`)
- Locale-aware link: `src/i18n/navigation.ts` (`Link`)

## Overview
Priority: P0 · Status: TODO
Rewrite `/deals` as RSC: fetch → live-filter → localize → render cards (separate RSC component) or empty state. Remove `DealItem` + `t.raw("items")`.

## Key Insights
- Countdown is server-computed text ("N days left") → NO `"use client"` component needed anywhere.
- `fetchPublished` fail-opens to `null` → grid must render `deals.empty` (this is also the pre-seeding state: no `SANITY_WRITE_TOKEN`, editors enter data later).
- `key = _id` (no slug field on the doc).
- Card CTA renders only when `targetTour.slug` present (optional ref, dangling ref safety).
- Card in `src/components/deals/promotion-card.tsx` keeps both files <200 lines (precedent: `explore/destination-card.tsx`); card calls `await getTranslations("deals")` itself (RSC), so the page only passes the `PromotionCard` view model.

## Requirements
- [ ] `export default async function DealsPage({ params }: { params: Promise<{ locale: string }> })`, await params (canonical pattern).
- [ ] `Promise.all([fetchPublished(PROMOTIONS_QUERY, {}, { tags: ["sanity:promotion:list"] }), getTranslations("deals")])`.
- [ ] `filterLivePromotions(raw ?? [])` → `.map((p) => toPromotionCard(p, locale))` → grid; empty → `deals.empty` paragraph.
- [ ] REMOVE `DealItem` interface + `t.raw("items")` (file stays RSC, no `t.raw` at all).
- [ ] KEEP chrome: h1 `deals.title`, subtitle, disclaimer, container/grid classes (`grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto`), `metadata` export.
- [ ] Card sections: badge chip (`rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary`), `h2` title, banner `<img>` (`rounded-xl aspect-[16/9] w-full object-cover`, CMS `alt`), description `<p>`, price row: discounted + `originalPrice` struck-through only when present (omit row when both null), countdown `daysLeft === 0 ? t("lastDay") : t("endsInDays", { count: daysLeft })` + `· {dateLabel}`, `Link href={"/explore/destinations/" + tourSlug}` labelled `t("viewTour")` when slug present.
- [ ] Page imports ONLY promotions lib for domain logic (no GROQ/type leakage beyond `PromotionCard`); both files <200 lines.

## Architecture
```
deals/page.tsx (RSC)
  params → Promise.all[fetchPublished(PROMOTIONS_QUERY), getTranslations]
        → filterLivePromotions → toPromotionCard ×N
        ├─ cards.length > 0 → grid → <PromotionCard card={…}/> ×N
        └─ else             → <p>{t("empty")}</p>
promotion-card.tsx (RSC, "use client" NOT set)
  await getTranslations("deals") → chip · h2 · img · prices · countdown · Link
```

## Related Code Files
- create: `src/components/deals/promotion-card.tsx`
- modify: `src/app/[locale]/deals/page.tsx`
- delete: none (`DealItem` removed in place)

## Implementation Steps
1. Rewrite `page.tsx` per Architecture; keep `metadata` + heading/disclaimer block untouched.
2. Create `src/components/deals/` folder + `promotion-card.tsx` (~90 lines) taking `card: PromotionCard`.
3. Price row: `{card.price && <span>…}</span>}` + `{card.originalPrice && <s className="text-muted-foreground line-through">…}</s>}`.
4. Countdown line: label + `· {card.dateLabel}` in `text-xs text-muted-foreground` → gate `npx tsc --noEmit`, `npm run lint`.

## Todo List
- [ ] `page.tsx` rewritten (Promise params, fetch with tag, filter, map, empty state)
- [ ] `DealItem` + `t.raw("items")` removed
- [ ] `src/components/deals/promotion-card.tsx` created (RSC, all card sections)
- [ ] banner img uses CMS `alt` + aspect-ratio classes
- [ ] originalPrice struck-through only when present; both-null → no price row
- [ ] "View tour" link rendered only when `tourSlug` present
- [ ] `deals.title/subtitle/disclaimer` + grid classes unchanged
- [ ] both files <200 lines · `tsc` 0 · `lint` 0

## Success Criteria
No CMS data → heading + subtitle + `deals.empty` + disclaimer, no crash (expected until editors seed promotions); with data → chip/title/banner/prices/countdown/link per card; `h1` still `deals.title` (browser `l-navbar` L4 stays green).

## Risk Assessment
- Grid class drift could break browser tests → keep container classes verbatim (L4 asserts only h1; grep confirms no test asserts `deals.items`).
- `<img>` CLS → `aspect-[16/9] object-cover` reserves space; `asset.url` from fragment (house pattern: `destination-card.tsx:53-56`).

## Security Considerations
Published-only, stega-off data; alt text authored in CMS (a11y); no user input rendered; no `"use client"` → no Sanity code shipped to client bundle.

## Next Steps
P4 keeps promotions discoverable via `/search` after `deals.items` leaves messages.
