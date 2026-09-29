# Phase 01 — Schema: Country Type + Destination Reference + Region Deprecation

**Status**: Complete (100%) · **Depends on**: plan approval (D1/D2) · **Priority**: High

## Changes
1. **New** `src/sanity/schemaTypes/country.ts` (`defineType` document):
   - `code`: string, required, description "ISO 3166-1 alpha-2 (e.g. VN, KR, US)", validation: `/^[A-Z]{2}$/` custom rule.
   - `name`: object with fields `vi` (required), `en` (required) — bilingual entry per requirement.
   - preview: `{ title: name.en, subtitle: name.vi }`.
2. `schemaTypes/index.ts`: register `country` in `types` array.
3. `schemaTypes/destination.ts`:
   - Add after `category`:
     ```ts
     defineField({
       name: "country",
       title: "Country",
       type: "reference",
       to: [{ type: "country" }],
       description: "Quốc gia / Country. International tour → pick the country (e.g. Hàn Quốc/Korea). Domestic tour → Việt Nam (Vietnam).",
       validation: (rule) => rule.required(),
     })
     ```
   - `region`: add `description: "Deprecated — legacy North/Central/South filter (listing/map). Frontend displays Country."` (field + validation otherwise unchanged).
4. Gate: `npx sanity schemas validate` → 0 errors; Studio schema hot-reloads at `/studio`.

## Verify
- Studio: Destinations → new Country reference dropdown; Country collection creatable with `vi`+`en`; region still present but labeled deprecated.

## Todo
- [ ] country.ts + registration
- [ ] destination.country + region description
- [ ] schema validate 0 errors + Studio spot-check
