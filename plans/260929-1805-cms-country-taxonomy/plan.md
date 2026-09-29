# CMS Taxonomy Refactor — Replace Static "Region" with Localized "Country" Entity

**Date**: 2026-09-29 · **Type**: Feature (CMS schema + i18n frontend) · **Status**: Complete · **Progress**: 100%

## Requirements
1. Schema: deprecate legacy `region` (North/Central/South VN); add **country** with bilingual entries — every country stores `{ vi, en }` (e.g. `{vi:"Hàn Quốc", en:"South Korea"}`), ISO-based.
2. Authoring: international tour → admin picks country (e.g. Korea); domestic → country defaults to Vietnam.
3. Frontend: cards + detail pages render country per active locale (vi → "Hàn Quốc", en → "South Korea").

## Research (region footprint)
| Layer | Location | Usage |
|---|---|---|
| Schema | `schemaTypes/destination.ts:22` | required select `north/central/south`; preview subtitle |
| Card | `destination-card.tsx:50` | raw `region` + CSS `capitalize` (always EN today: "North") — **client component, no locale hook** |
| Detail chip | `destinations/[slug]/page.tsx:83` | `t(destination.region)` localized ("Miền Bắc") — server, has `locale` from params (:49) |
| Listing filter | `explore/destinations/page.tsx` | `?region=` pills + `REGIONS` + `DESTINATIONS_QUERY($region)` |
| Map / Search | `explore/map`, `search/page.tsx` | region labels / search index |
| Queries | `queries/destinations.ts` ×4 + `homepage.ts` featured | project `region` |
| Unit tests | `tour-category-queries.test.mts:65,97` | asserts `$region` kept + `region` in 4 projections |
| i18n | `destinations.{north,central,south,region}` en+vi | chip/labels |
| Browser | P14/P18 assert badge subsets only — **no test locks region text on card/chip** | safe |

Existing content: 3 destinations (`hcm`,`dn` domestic · `nyc` international), all with legacy `region`, none with country yet. `category` field already exists (default `domestic`) — the authoring workflow builds on it.

## Design decisions (defaults — approved via questions)
- **D1 — Region fate**: *deprecate in place* → `region` field stays (required, visible, description marked "Deprecated — legacy filter") so listing filter pills / map / search keep working untouched; cards + detail switch to country. **Alt**: full replacement (removes region everywhere incl. listing filter pills, map, search → much larger blast radius, test churn).
- **D2 — Country architecture**: *dedicated `country` document type + reference* → real Studio dropdown, bilingual names stored once per country, no per-doc duplication. **Alt**: inline `{vi,en}` object on destination (no join, but free-text, no dropdown, drift risk).
- **D3 — Domestic default**: country field `validation.required()` + description ("Trong nước = Việt Nam") + **frontend fallback**: if `category === 'domestic'` and no country assigned yet → render i18n `destinations.vietnam` ("Việt Nam"/"Vietnam"). Hard schema enforcement (ref must be VN doc) needs a seeded VN `_id` — deferred to seed script (below). Graceful until content is assigned (write token still blocked).

## Design (defaults)
**New `schemaTypes/country.ts`** (document):
- `code`: ISO 3166-1 alpha-2, required, uppercase-2-char validation, unique-ish guidance in description.
- `name`: object `{ vi: string, en: string }` — both `required()`.
- preview: `title: name.en`, `subtitle: name.vi`.
- Registered in `schemaTypes/index.ts` (types array).

**`destination.ts`**:
- Add `country`: `reference` to `country` (search by name), `validation.required()`, description = authoring workflow (international → pick country; domestic → Việt Nam).
- `region`: keep, description prefixed `Deprecated — legacy North/Central/South filter; display uses Country.`
- Preview subtitle unchanged (region still populated) — reference can't be previewed via `->` safely.

**Queries** (add, keep `region` intact): `country->{ "code": code, "vi": name.vi, "en": name.en },` + `category,` to the card/chip feeds: `DESTINATIONS_QUERY`, `DESTINATION_BY_SLUG_QUERY`, `DESTINATIONS_BY_CATEGORY_QUERY`, `FEATURED_DESTINATIONS_QUERY` (comma-safe; groq-js parse enforced by unit test). Extra fields harmless to map/search consumers of `DESTINATIONS_QUERY`.

**Frontend**:
- `Destination` type: `country?: { vi: string; en: string; code?: string } | null; category?: "domestic" | "international";`
- **Card** (client): `useLocale()` (precedent: hero carousel) → `country?.[locale] ?? (category === "domestic" ? t("vietnam") : region fallback)`.
- **Detail chip** (server): `country?.[locale] ?? (category === "domestic" ? t("vietnam") : t(region))` — `locale` already in scope.
- **i18n**: add `destinations.vietnam` → vi `"Việt Nam"`, en `"Vietnam"` (parity).

**Seed script**: `scripts/seed-countries.mjs` (`npm run migrate:countries`) — core ISO set (VN, KR, JP, US, TH, FR, SG …) with vi/en names, deterministic ids (`country-vn`…), dry-run default, `--apply` requires `SANITY_WRITE_TOKEN` (still absent → **blocked, same as existing backfills**). Until then admin creates country docs manually in Studio (any `_id` works — reference is value-based).

## Phases
1. [phase-01](phase-01-schema-country-type.md) — country type + destination.country + region deprecation note + registration + schema validate.
2. [phase-02](phase-02-queries-frontend-i18n.md) — projections, types, card/detail locale rendering, i18n key, seed script.
3. [phase-03](phase-03-tests-gates-docs.md) — new `t-country-locale.mjs` (data-driven vi/en assertions), unit test extensions, all gates, screenshots, changelog, report, statuses.

## Gates
lint 0 · `npm test` **18/18** · `npm run build` 0 · `npx sanity schemas validate` 0 · `npm run test:browser` → **18/19** (new t-file; sole fail = pre-existing `revalidate-webhook` env).

## Files
**Create**: `src/sanity/schemaTypes/country.ts` · `scripts/seed-countries.mjs` · `tests/browser/t-country-locale.mjs` · report.
**Modify**: `schemaTypes/destination.ts` · `schemaTypes/index.ts` · `queries/destinations.ts` · `queries/homepage.ts` · `components/explore/destination-card.tsx` · `explore/destinations/[slug]/page.tsx` · `src/messages/{en,vi}.json` · `tests/unit/tour-category-queries.test.mts` · `package.json` (script) · changelog · statuses.
**Untouched (D1)**: listing filter, map, search, `region` data, all `$region` query params.

## Risks
- Content gap until country assigned (3 docs) → mitigated by D3 fallback + manual Studio assignment listed as user action.
- Preview subtitle still region (cosmetic; reference preview unsupported) — accepted.
- Seed script blocked without `SANITY_WRITE_TOKEN` (pre-existing).
- Unit projection assertions extended, not weakened; `$region` assertions keep passing under D1.

## Success criteria
- Studio: `country` doc type with bilingual entries; destination has required country reference; region marked deprecated.
- `/vi` card+chip show "Việt Nam"/country vi name; `/en` shows "Vietnam"/en name — proven by data-driven `t-country-locale.mjs` for domestic + international docs.
- All gates green.
