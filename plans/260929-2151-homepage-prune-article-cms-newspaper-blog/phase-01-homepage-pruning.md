# Phase 01 — Homepage DOM Pruning

**Status**: Complete · **Priority**: High

## Steps
1. `src/app/[locale]/page.tsx` — delete imports (lines 5, 8-10) + JSX (48-50, 52): `ExperienceCategories`, `TrendingItineraries`, `EventsTicker`, `TradeCtaBand`. Keep `<StoriesSection />` (line 51) + everything else. `priceRanges` stays (FeaturedDestinations).
2. Delete files: `src/components/homepage/experience-categories.tsx`, `trending-itineraries.tsx`, `events-ticker.tsx`, `trade-cta-band.tsx`.
3. i18n — delete EXACTLY these keys from **both** `src/messages/en.json` + `vi.json` (same paths → parity test stays green):
   - `home.trade` (whole object incl. title/tradeCta/mediaCta)
   - `home.experienceCategories`, `home.nature`, `home.culture`, `home.food`, `home.beaches`, `home.wellness`, `home.nightlife`
   - `home.trendingViewAll`
   - `events.tickerTitle`
   - DO NOT touch: `events.viewCalendar`, `events.*` others, `festivals.*`, `itineraries.*` (shared with explore routes/sitemap), `blog.*`.
4. Verify: `grep -rn "TradeCtaBand\|EventsTicker\|TrendingItineraries\|ExperienceCategories" src` → 0; homepage renders Hero→QuickAccess→Featured→AboutUs→Stories→Newsletter.

## Verify
- `/vi` + `/en`: removed section headings absent; `npm test` parity green; `j`, `p`, `l` regressions green.
