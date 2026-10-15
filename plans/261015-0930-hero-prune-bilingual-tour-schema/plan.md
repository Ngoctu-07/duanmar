# Hero Shortcut Prune + Bilingual Tour Schema — Plan

## Status: in_progress

## 1. Prune hero shortcut
- Delete `quick-access-icons.tsx` (sole How-to-Book card, redundant with header nav). Remove import + `<QuickAccessIcons/>` from `[locale]/page.tsx`. Remove now-unused `quickLinks` ns from en/vi messages.

## 2. Schema localization (`destination.ts`)
- `name` (tour title), `description` (overview): `{vi required, en optional}` objects. Slug source → `name.vi`, preview → `name.vi`.
- `itinerary[]`: `dayTitle {vi req, en opt}`, `meals {vi/en opt}`, `details {vi: blocks, en: blocks}` (same block rules, no headings). Preview → `dayTitle.vi` / `meals.vi`.
- New optional: `highlights`, `inclusions`, `exclusions` = `{vi: string[], en: string[]}`.
- GROQ unchanged (field names identical, objects project whole). TS row types updated at readers.
- Backfill: `scripts/backfill-destination-localization.mjs` (dry-run default, `--apply` with token), string → `{vi}`; + `migrate:localization` npm script.

## 3. Frontend hydration (resolve at data boundary, presentational props stay strings)
- `lib/bilingual-string.ts`: add legacy-tolerant `resolveLocaleString` (active → vi → en), `resolveLocaleList`, `resolveLocaleBlocks`.
- Detail page (`explore/destinations/[slug]` — actual route; `/tours/[slug]` does not exist): resolve name/desc/itinerary/highlights/inclusions; render highlights + included/excluded sections (new `destinations.highlights/included/excluded` i18n keys).
- Card (client, useLocale), checkout, search entries, tour-search haystack (both locales), assistant grounding.
- Tests: update itinerary schema/preview assertions, add bilingual + fallback cases.

## Success
- tsc/eslint clean, unit 36/36, `/en`+`/vi` 200, no `quickLinks` refs, Studio schema valid.
