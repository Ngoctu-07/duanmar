# P4 — Search Index Integration

## Context Links
- `src/app/[locale]/search/page.tsx:30` (`SearchMessages.deals`), `:99-101` (messages loop), `:130-151` (params/fetch/`buildEntries` call)
- Fetch precedent in same file `:140-142` (`fetchPublished(DESTINATIONS_QUERY, { region: "" }, { tags: […] })`)
- Entry shape: `src/components/search/search-client.tsx` (`SearchEntry`; `search.page` label already exists EN/VI at `messages` `search` block)

## Overview
Priority: P1 · Status: TODO
`deals.items` leaves messages (P2) → source promotions from Sanity in the search page: fetch `PROMOTIONS_QUERY`, localize per `locale`, index live promos as `type: "page"` → `/deals`.

## Key Insights
- `buildEntries` gains `locale` + `promotions` params (single call site — safe signature change); destinations/articles stay as-is.
- Reuse `type: "page"` + existing `search.page` label → zero new i18n keys.
- Same shared helpers as P3 (`filterLivePromotions`, `pickPromotionText`) → DRY, expired promos never indexed.
- Query has no params → `fetchPublished(PROMOTIONS_QUERY, {}, { tags: ["sanity:promotion:list"] })`; `null` → `[]`.

## Requirements
- [ ] Remove `deals` member from `SearchMessages` interface.
- [ ] Remove the `messages.deals.items` loop (`:99-101`).
- [ ] Fetch `PROMOTIONS_QUERY` inside the existing `Promise.all`.
- [ ] New loop: `filterLivePromotions(promotions)` → `pickPromotionText(p, locale)` → `collect(entries, "page", "/deals", title, description, badgeTag)`.
- [ ] Skip empty-title entries (existing `collect` guard) — no dead entries.

## Architecture
```
buildEntries(messages, destinations, articles, promotions, locale)
  …existing loops…
  + promotions: Sanity (published, isActive, live-filtered, localized) → {type:"page", href:"/deals"}
→ SearchClient
```

## Related Code Files
- modify: `src/app/[locale]/search/page.tsx`
- create/delete: none

## Implementation Steps
1. Import `PROMOTIONS_QUERY` + `filterLivePromotions`/`pickPromotionText` from `@/lib/promotions`.
2. Add `promotions: PromotionRecord[]` and `locale: string` to `buildEntries` signature; update the single call site.
3. Delete `deals` interface member and old messages loop; add promo loop (badgeTag as `keywords`).
4. Add fetch to `Promise.all` with tag `sanity:promotion:list`; `(promotions ?? [])`.
5. Gate: `npx tsc --noEmit`, `npm run lint`.

## Todo List
- [ ] `SearchMessages.deals` removed from interface
- [ ] old `messages.deals.items` loop removed
- [ ] `PROMOTIONS_QUERY` fetched in existing `Promise.all` (tag `sanity:promotion:list`)
- [ ] promo entries indexed: `type: "page"`, `href: "/deals"`, localized per `locale`
- [ ] expired promos excluded (shared `filterLivePromotions`)
- [ ] `tsc` 0 · `lint` 0

## Success Criteria
Search page compiles with `deals.items` gone; once editors seed promotions, `/search?q=<promo title>` returns the deal → `/deals` in both locales; expired promos never surface.

## Risk Assessment
- Extra fetch cost → cached by `unstable_cache` (revalidate 300 + shared tag), same as destinations.
- `buildEntries` signature change → exactly one call site in this file (grep-verified).

## Security Considerations
Published-only fetch; no user input (`q`) reaches GROQ (filtering stays client-side in `SearchClient`).

## Next Steps
P5: unit test file, all five gates, changelog entry.
