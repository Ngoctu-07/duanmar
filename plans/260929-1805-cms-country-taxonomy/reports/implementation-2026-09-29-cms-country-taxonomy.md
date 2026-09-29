# Implementation Report — CMS Taxonomy: Region → Localized Country

**Date**: 2026-09-29 · **Plan**: `plans/260929-1805-cms-country-taxonomy/` · **Status**: Complete (100%)

## Approved decisions
- D1 = **deprecate region in place** (listing filter pills / map / search / `$region` tests untouched).
- D2 = **`country` document type + reference** (Studio dropdown; bilingual `{vi,en}` stored once per country).
- D3 = required reference + frontend Vietnam fallback (`destinations.vietnam` i18n) until content assigned.

## Changes
- **New** `src/sanity/schemaTypes/country.ts`: `code` (required, `^[A-Z]{2}$`), `name` object `{vi,en}` both required; preview `name.en` / `name.vi`. Registered in `schemaTypes/index.ts`.
- `destination.ts`: `country` reference (required, authoring-workflow description); `region` description prefixed "Deprecated — legacy filter; display uses Country".
- Queries (4 card/chip feeds): added `category,` + `country->{ "code": code, "vi": name.vi, "en": name.en },` — comma-safe; groq-js parse covered by existing `homepage-about-video-query`/`destination-gallery` checks; `$region` untouched (unit asserts still pass).
- `destination-card.tsx` (client): `useLocale()` + `useTranslations("destinations")` → `country?.[locale] ?? (category==="domestic" ? t("vietnam") : region)`; interface gains optional `country`/`category`.
- Detail chip `[slug]/page.tsx`: same chain server-side (`locale` already from params).
- i18n: `destinations.vietnam` = "Việt Nam" / "Vietnam" (parity).
- **New** `scripts/seed-countries.mjs` (`npm run migrate:countries`): 15 ISO countries, deterministic ids `country-<code>`, never overwrites existing, dry-run default, `--apply` gated on `SANITY_WRITE_TOKEN` (still absent).

## Content status
Admin assigned countries in Studio during the session: **3/3 destinations** carry country refs — vi: "Việt Nam" ×2, "Mỹ"; en: "Vietnam", "The US". Real-branch assertions (not fallback) proven.

## Verification
- **New** `tests/browser/t-country-locale.mjs` (live GROQ, one query-fix mid-flight: project `name.vi/name.en`, not top-level): T1 listing card vi/en + T2 detail chip vi/en == CMS strings, T3 vi≠en parity, T4 zero pageerrors → **25/25**.
- Unit extended (card/chip projections + schema `length(3)` + groq parse) → **18/18**.
- Gates: lint 0 · build 0 · schema **0 errors** · suite **19/20** (sole fail = revalidate env).
- Screenshots: `tests/.output/t-country-01-card-vi.png`, `t-country-02-detail-en.png`.

## Concerns
- Seed script still blocked on `SANITY_WRITE_TOKEN` (harmless now — Studio docs exist manually).
- Orphan: `hcmc` pricing doc remains after its destination was deleted → content cleanup left to editor (test no longer depends on it).

## Docs impact
minor — changelog bullet + plan statuses + this report.
