# P2 — Promotions Shared Lib + i18n Keys

## Context Links
- Consumers: `src/app/[locale]/deals/page.tsx` (P3), `src/app/[locale]/search/page.tsx` (P4)
- House formatting: `src/lib/pricing.ts:116-129` (`formatPrice` Intl + fraction rule)
- Parity test: `tests/unit/i18n-parity.test.ts` (flattened key equality EN↔VI)
- Plural precedent: `src/messages/en.json:15,20,68` (`{count, plural, one {…} other {…}}`)

## Overview
Priority: P0 · Status: TODO
Pure unit-testable helpers in `src/lib/promotions.ts` (<200 lines, kebab-case) + message surgery: drop `deals.items`, add countdown/empty/CTA keys in BOTH files.

## Key Insights
- Pure functions only → no `"use client"`, no next-intl import inside the lib; page stays RSC.
- Compare dates as `YYYY-MM-DD` strings (both sides UTC ISO) → deterministic; tests inject fixed `now`.
- `formatPromoPrice` must NOT call `getCurrency(locale)` — that locale-flip is exactly the mislabel bug this design avoids; currency comes from the DOC.
- next-intl ICU plural works in messages; VI uses `other` only (`Intl.PluralRules("vi")` → other).
- `daysUntilValid === 0` = last day → UI picks `deals.lastDay` instead of plural key.

## Requirements
- [ ] `src/lib/promotions.ts` exports: `type PromotionRecord` (GROQ projection shape), `type PromotionCard` (view model), `pickPromotionText(promo, locale)`, `isPromotionLive(promo, now?)`, `filterLivePromotions(promos, now?)`, `daysUntilValid(validUntil, now?)`, `formatPromoPrice(value, currency, locale)`, `toPromotionCard(promo, locale)`.
- [ ] Rules: locale `vi` → `_vi` else `_en`; missing/blank VI falls back to EN; non-finite/negative price → `null` (card omits, never NaN/0); missing/malformed `validUntil` → not live; `daysUntilValid` = floor days (0 = today, negative for past).
- [ ] `toPromotionCard` returns `{ id, title, badgeTag, description, price, originalPrice, daysLeft, dateLabel, tourSlug }` — `dateLabel` via `Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })`.
- [ ] REMOVE `deals.items` from `src/messages/en.json` AND `src/messages/vi.json` (lines ~884-909; both files in same edit — parity test).
- [ ] ADD to both: `deals.endsInDays` EN `"{count, plural, one {# day left} other {# days left}}"` / VI `"{count, plural, other {còn # ngày}}"`; `deals.lastDay` "Last day today" / "Hôm nay là ngày cuối"; `deals.empty` (empty state copy); `deals.viewTour` "View tour" / "Xem tour". No `deals.currency` key (Intl renders symbol).
- [ ] KEEP `deals.title` / `subtitle` / `disclaimer` byte-identical (browser L4 asserts title; disclaimer honesty line unchanged).

## Architecture
```
PromotionRecord (GROQ shape, no client leakage)
  ├─ pickPromotionText(promo, locale)  → {title, badgeTag, description}  (vi → en fallback)
  ├─ filterLivePromotions(promos, now) → live only (string date compare)
  ├─ daysUntilValid(validUntil, now)   → integer days (0 = last day)
  ├─ formatPromoPrice(value, currency, locale) → "1.500.000 ₫" / "$100" | null
  └─ toPromotionCard(promo, locale)    → PromotionCard (only shape the card component takes)
```

## Related Code Files
- create: `src/lib/promotions.ts`
- modify: `src/messages/en.json`, `src/messages/vi.json`
- delete: `deals.items` key in both message files

## Implementation Steps
1. Write `promotions.ts` (types + 8 exports, ~140 lines; JSDoc on fail-closed expiry + null price).
2. `formatPromoPrice`: guard `Number.isFinite(value) && value >= 0` else `null`; `Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", { style: "currency", currency, minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: same })` (mirrors `formatPrice` fraction rule).
3. en.json: delete `deals.items` array, insert 4 new keys after `disclaimer`; vi.json: identical structural edit with VI strings.
4. Gate: `npm test` (i18n-parity) + `npx tsc --noEmit`.

## Todo List
- [ ] `src/lib/promotions.ts` created (<200 lines, pure fns, injectable `now`)
- [ ] vi→en fallback chain implemented (blank/missing VI → EN)
- [ ] fail-closed expiry (`undefined`/garbage `validUntil` → false)
- [ ] `formatPromoPrice` null-on-invalid + doc-driven currency
- [ ] `deals.items` removed from en.json AND vi.json
- [ ] 4 new keys added to both files (ICU plural in `endsInDays`)
- [ ] `npx tsc --noEmit` 0 · `npm test` i18n-parity green

## Success Criteria
tsc clean; parity test green (EN/VI flattened keys equal); lib importable as plain functions by unit tests.

## Risk Assessment
- Removing `items` breaks `t.raw("items")` callers → grep shows only `deals/page.tsx` (rewritten P3); search loop removed in P4 (P3/P4 must land together with P2 — single changeset).
- UTC day boundary ±7h for VI users near midnight → accepted, same convention as `article.ts` `initialValue`.

## Security Considerations
No secrets; message files carry UI copy only.

## Next Steps
P3 consumes `filterLivePromotions` + `toPromotionCard` on `/deals`.
