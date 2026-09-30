# P1 — Promotion Schema + GROQ Query

## Context Links
- `src/sanity/schemaTypes/article.ts:7-53` (fieldsets A), `:61-67` (image + hotspot), `:75-89` (date + preview)
- `src/sanity/schemaTypes/destination.ts` (`country` reference precedent; `name` string + `slug` required)
- `src/sanity/queries/destinations.ts` (`defineQuery` + `${imageFragment}`) · `src/sanity/fragments/image.ts`
- Registration: `src/sanity/schemaTypes/index.ts` (auto-lists; `sanity.config.ts`/`structure.ts` untouched)

## Overview
Priority: P0 · Status: TODO
Create `promotion` document type (12 fields, bilingual fieldsets) + `PROMOTIONS_QUERY`, register in schema index.

## Key Insights
- `imageFragment` = `asset->{ _id, url, metadata {...} }, alt` → nested image `alt` is returned with zero extra GROQ.
- destination `name` is a plain mono-language string → project `_id, name, "slug": slug.current`; card CTA label comes from i18n `deals.viewTour`, never the name.
- Query uses NO params → test can assert absence of `$` (mirror `site-configuration-query.test.mts:51-53`).
- Expiry deliberately NOT in GROQ (locked): `validUntil` is midnight UTC; `validUntil < now()` would hide a promo ON its last day, breaking "Last day today". JS filter (P2) owns it.

## Requirements
- [ ] Fields: `title_en`/`title_vi` (required), `badgeTag_en`/`badgeTag_vi`, `description_en`/`description_vi` (text rows 3), `discountedPrice` (required > 0), `originalPrice` (optional), `currency` (list VND|USD, required, `initialValue: "VND"`), `bannerImage` (image, `hotspot: true`, nested required `alt`), `validUntil` (date, required), `targetTour` (reference → `destination`, optional), `isActive` (bool, required, `initialValue: true`). NO slug.
- [ ] `fieldsets` identical shape to article.ts (`en`, `vi` collapsed).
- [ ] `preview: { select: { title: "title_en", subtitle: "validUntil", media: "bannerImage" } }`.
- [ ] `PROMOTIONS_QUERY = defineQuery("*[_type == \"promotion\" && isActive == true] | order(validUntil asc) { … }")` projecting all fields + `bannerImage { ${imageFragment} }` + `targetTour->{ _id, name, "slug": slug.current }`.
- [ ] Register: import + `types` array entry in `schemaTypes/index.ts`.

## Architecture
```
Studio (promotion doc, isActive gate)
  └─ PROMOTIONS_QUERY (published perspective, tag sanity:promotion:list)
       ├─ deals page  ── JS expiry filter (P2) ── cards
       └─ search page ── JS expiry filter (P2) ── index entries
```

## Related Code Files
- create: `src/sanity/schemaTypes/promotion.ts`, `src/sanity/queries/promotions.ts`
- modify: `src/sanity/schemaTypes/index.ts`
- delete: none

## Implementation Steps
1. Write `promotion.ts` (~90 lines): copy fieldset block, date field, preview shape from article.ts.
2. `bannerImage` with nested `fields: [defineField({ name: "alt", type: "string", validation: rule.required() })]`; schema comment marks it as the repo's first image-alt precedent.
3. `currency` options list VND/USD + `initialValue: "VND"`; `targetTour` `to: [{ type: "destination" }]` with editor description.
4. Write `promotions.ts` query exactly per projection above (image fragment inside `bannerImage { }`).
5. Register in `index.ts` (alphabetical: article, country, destination, homepage, **promotion**, siteConfiguration, tourPricing) → gate `npx sanity schemas validate` → 0 errors.

## Todo List
- [ ] `promotion.ts` created — all 12 fields + fieldsets + preview, no slug
- [ ] `bannerImage` hotspot + nested required `alt`
- [ ] `currency` enum required (init VND) · `isActive` required (init true) · `validUntil` required date
- [ ] `PROMOTIONS_QUERY` created (defineQuery, imageFragment, targetTour deref, `isActive == true`, `order(validUntil asc)`)
- [ ] `index.ts` registers `promotion`
- [ ] `npx sanity schemas validate` → 0 errors

## Success Criteria
Schema validates 0 errors; query exports and parses with groq-js; Studio auto-lists "Promotions".

## Risk Assessment
- Deleted destination leaves dangling ref → card hides "View tour" when slug missing (P3 guard).
- `initialValue` applies to new docs only — existing docs unaffected (none exist yet).

## Security Considerations
Read path only via `fetchPublished` (published perspective, stega off); no write token in repo; schema holds no secrets.

## Next Steps
P2 builds `src/lib/promotions.ts` + EN/VI messages against this projection shape.
