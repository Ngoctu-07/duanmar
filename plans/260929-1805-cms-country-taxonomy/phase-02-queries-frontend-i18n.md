# Phase 02 — Queries, Locale-Aware Frontend, i18n, Seed Script

**Status**: Complete (100%) · **Depends on**: Phase 1 · **Priority**: High

## Changes
1. `src/sanity/queries/destinations.ts` — add to `DESTINATIONS_QUERY`, `DESTINATION_BY_SLUG_QUERY`, `DESTINATIONS_BY_CATEGORY_QUERY`:
   `category,` and `country->{ "code": code, "vi": name.vi, "en": name.en },` (comma-separated lines, groq-js-safe).
2. `src/sanity/queries/homepage.ts` — same additions to `FEATURED_DESTINATIONS_QUERY`.
3. `src/components/explore/destination-card.tsx`:
   - Type: `country?: { vi: string; en: string; code?: string } | null;` + `category?: "domestic" | "international";` (keep `region`).
   - `const locale = useLocale();` (import from `next-intl` — precedent: hero carousel).
   - Replace line 50 span content with:
     ```ts
     const countryLabel =
       destination.country?.[locale] ??
       (destination.category === "domestic" ? t("vietnam") : destination.region);
     ```
     (`t` = `useTranslations("destinations")` inside card).
4. `explore/destinations/[slug]/page.tsx` chip (:83): same chain server-side — `destination.country?.[locale] ?? (destination.category === "domestic" ? t("vietnam") : t(destination.region as …))` (`locale`, `t` already in scope).
5. `src/messages/vi.json` + `en.json`: add `destinations.vietnam` = `"Việt Nam"` / `"Vietnam"` (parity).
6. **New** `scripts/seed-countries.mjs`: ISO core list `{code, vi, en}` (~15 countries incl VN/KR/JP/US/TH/FR/SG), deterministic `_id` (`country-<code>`), dry-run prints planned upserts, `--apply` gates on `SANITY_WRITE_TOKEN` (mutation API) with clear "token missing" error (consistent with existing backfill scripts). `package.json`: `"migrate:countries": "node scripts/seed-countries.mjs"`.
7. `tests/unit/tour-category-queries.test.mts`: extend — card/detail queries must include `country->` + `category`; keep existing `region`/`$region` asserts; add groq-js `parse()` over all 4 extended queries (pattern from `destination-gallery.test.mts`).

## Verify
- Unit green; listing/map/search pages still render (region path untouched).
- With country unassigned: card/chip show "Việt Nam"/"Vietnam" (domestic fallback) — no empty chips.

## Todo
- [ ] Projections ×4 + types
- [ ] Card useLocale chain + detail chip chain
- [ ] i18n key (en+vi) + parity
- [ ] Seed script (dry-run verified; apply blocked on token)
- [ ] Unit test extensions green
