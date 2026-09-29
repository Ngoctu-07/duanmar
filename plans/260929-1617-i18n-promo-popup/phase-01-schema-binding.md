# Phase 1 — Studio Schema (popupImage_vi/_en) + Query + Locale Binding

**Context**: plan [plan.md](plan.md)
**Priority**: High · **Status**: Complete (100%) · **Depends on**: —

## Overview
Add per-locale promo image fields to `siteConfiguration`, project all three assets in one 0-param query, and select the right one server-side with the D2 fallback chain.

## Requirements
- AC1: `siteConfiguration` gains `popupImage_vi` + `popupImage_en` (image, hotspot, grouped in a `popup` fieldset); `entryPopupImage` **kept** (D1); Studio preview/structure untouched; schema validate 0 errors.
- AC2: `SITE_CONFIGURATION_QUERY` projects `entryPopupImage`, `popupImage_vi`, `popupImage_en` with `imageFragment`; still **0 `$` params**, no ` ? `, balanced parens (unit-tested).
- AC3: `layout.tsx` picks `popupImage_<locale> ?? entryPopupImage ?? otherLocale ?? null` via `getLocale()`; width/height metadata read from the chosen asset (fallbacks 1200/800 kept).

## Related Code Files
- Modify: `src/sanity/schemaTypes/site-configuration.ts` (fieldset + 2 fields)
- Modify: `src/sanity/queries/site-configuration.ts` (+2 projections)
- Modify: `src/app/[locale]/layout.tsx` (`getLocale()` + chain + width/height)
- Reference only: `src/sanity/schemaTypes/post.ts:7-10` (fieldset precedent), `src/lib/news-content-provider.ts:44` (pick pattern)
- Delete: none

## Implementation Steps
1. Schema: add `fieldsets: [{ name: "popup", title: "Promo Popup" }]` on the type; two image fields with `fieldset: "popup"`, `options: { hotspot: true }`, descriptions noting locale + fallback order.
2. Query: append the two projections (comma-separated like `destinations.ts` — GROQ requires commas between attributes).
3. Layout: `const locale = await getLocale();` (import from `next-intl/server`); derive
   `popupImage = siteConfig?.[\`popupImage_${locale}\`] ?? siteConfig?.entryPopupImage ?? siteConfig?.[locale === "vi" ? "popupImage_en" : "popupImage_vi"] ?? null`
   (ternary is **JS**, fine — only GROQ forbids ` ? `); width/height from that object; pass to `PromoModal` unchanged (no new props).
4. Type safety: `siteConfig` is `any`-ish from `fetchPublished` — bracket access OK; no interface changes.

## Todo List
- [ ] schema fields + fieldset
- [ ] query projections
- [ ] layout locale selection chain
- [ ] gates: lint, unit, schema validate

## Success Criteria
Lint 0 · `npm test` 18/18 (existing `site-configuration-query` checks untouched pass) · schema 0 errors · `/vi` and `/en` load with correct `img[src]` for whichever asset exists (manual curl/DOM check).

## Risk Assessment
Removing nothing → zero regression risk on live popup. Cross-locale fallback only fires when the locale field AND legacy field are both empty.

## Security Considerations
Read-only projections; no new env/secrets.

## Next Steps
→ Phase 2 (re-trigger).
