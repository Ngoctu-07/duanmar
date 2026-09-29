# Phase 03 — Browser Tests, Gates, Docs

**Status**: Complete (100%) · **Depends on**: Phase 2 · **Priority**: High

## New browser test `tests/browser/t-country-locale.mjs` (next free letter)
Data-driven (no fabricated CMS data — pattern: `s-tour-hero-carousel` live GROQ via `.env.local`):
- Fetch for `hcm` + `nyc`: `{ category, country->{vi,en}, region }`.
- **T1** `/vi` listing card for each doc: `[data-slot="card"]` country span text == expected vi label
  (`country?.vi` → domestic-missing-country → `"Việt Nam"` → international-missing-country → region fallback).
- **T2** `/vi/explore/destinations/<slug>` chip == same vi label.
- **T3** `/en/...` chip == en label (`"Vietnam"` / `"South Korea"` etc.).
- **T4** `/en` listing card == en label.
- **T5** locale switch parity: vi vs en labels differ exactly when country has distinct vi/en.
- **T6** zero uncaught pageerrors. Screenshots: `t-country-01-card-vi.png`, `t-country-02-detail-en.png`.
- Branch gracefully (like P10) when country docs not yet assigned — asserts the D3 fallback instead.

## Unit + browser regressions
- `p-tours-category` (27 checks): P14/P18 assert badge subsets only → must stay green (country text doesn't add badge labels).
- i18n parity test covers new key.

## Gates (ordered)
1. Targeted: `t-country-locale.mjs` + `p-tours-category.mjs` + `tour-category-queries` unit.
2. `npm run lint` → 0.
3. `npm test` → **18/18**.
4. `npm run build` → 0 (stop dev → build → restart).
5. `npx sanity schemas validate` → 0.
6. `npm run test:browser` → **18/19** (sole fail = `revalidate-webhook` env).

## Docs & evidence
- Changelog bullet (VN) under `## 2026-09-29`.
- Report: `reports/implementation-2026-09-29-cms-country-taxonomy.md` (AC table, gates, outstanding).
- Status flips: plan + 3 phases → Complete.
- **Outstanding (user)**: create Country docs in Studio (or run `npm run migrate:countries -- --apply` once `SANITY_WRITE_TOKEN` exists), assign `hcm`/`dn` → Việt Nam, `nyc` → its country (e.g. United States), then re-run `t-country-locale` to flip from fallback branch to real-country branch.

## Todo
- [ ] t-country-locale written + targeted runs
- [ ] Full gates
- [ ] Screenshots vi/en
- [ ] Changelog + report + statuses
