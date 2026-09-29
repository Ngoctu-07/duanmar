# Phase 03 — Tests, Verification Pipeline, Changelog

**Status**: Complete · **Priority**: High · **Depends on**: P1 + P2

## Context Links
- Harness: Puppeteer via `.claude/skills/chrome-devtools/scripts/lib/browser.js` (`getBrowser/getPage/closeBrowser`), `check()` accumulator + `process.exit(1)` on failure, `dismissPromo` (`tests/helpers/promo.mjs`), screenshots → `tests/.output/` (gitignored) — copy boilerplate verbatim from `tests/browser/m-footer-brand.mjs:1-26,49-57,188-194`.
- Runners (DO NOT EDIT): `tests/run-browser.mjs:23-25` globs+sorts `tests/browser/*.mjs` (14 today → **15**; new `p-tours-category.mjs` sorts `o… < p… < revalidate-webhook`) · `tests/run-unit.mjs:17-19` globs `*.test.{ts,mts}` (14 today → **15**, run via `npx tsx`, CSS stub only for `h6-*` `:15`).
- Unit precedent: `tests/unit/fetch-published-cache.test.mts:1-22` (env bootstrap `:4-5`, `check()` pattern) — query module import is safe (destinations.ts imports only `next-sanity`/`groq` identity `defineQuery` + local `imageFragment`; no client/env). Fallback if import chain ever breaks: `readFileSync` the 2 query files + substring asserts.
- i18n contract: `tests/unit/i18n-parity.test.ts:48-58` — counts `:48-50`, missing vi `:52-54`, missing en `:56-58`; today **783/783** → after P2 **789/789**.
- Live-CMS pattern (no fabricated data): `tests/helpers/cms-expectations.mjs:12-20` (`envValue` reads process env then `.env.local` names), `:27-42` (unauthenticated GROQ `https://<projectId>.api.sanity.io/v2026-09-25/data/query/<dataset>` + `AbortSignal.timeout(15000)`).
- Route/SSR contracts: `l-navbar.mjs:71` (`/vi/tours/{domestic,international}` → 200), `:72` (4 distinct h1), `:73` (h1 EXACTLY `vi.tours.domestic.title` / `vi.tours.international.title`), `:37-39`+`:56` (header exactly 4 nav links, desktop + sheet) · `m-footer-brand.mjs:109-115` (footer tours hrefs/labels fixed) · `c-booking.mjs:176-180` (`?tour=ha-noi` → 404) · `g-reviews.mjs:16` (`TOUR_URL` = `/vi/explore/destinations/hcm`), `:154-167` (SSR HTML contains `#customer-reviews`, no not-booked hint).
- Changelog: `docs/project-changelog.md` — `## 2026-09-28` at `:261`, file 350 lines; append `### Added` block at EOF (house precedent). Entry ends `Verified:` + `Docs impact:` lines.
- Baseline gates (from last plan): lint 0 · unit 14/14 · build 0 · browser **13/14** (sole fail = `revalidate-webhook`, missing `SANITY_REVALIDATE_SECRET`, pre-existing, NEVER edit).

## Related Code Files
- **Create**: `tests/unit/tour-category-queries.test.mts` (~60 LOC, no network/env) · `tests/browser/p-tours-category.mjs` (~220 LOC, single file)
- **Modify**: `docs/project-changelog.md` (EOF append) · `plan.md` + 3 phases (Status → Complete, 100%)
- **Delete**: none. **0 edits to existing tests**; never touch `revalidate-webhook.mjs`.

## Unit assertion list (`tour-category-queries.test.mts`, ~15 checks, pure string/contract — no network)
1. `DESTINATIONS_BY_CATEGORY_QUERY` exported, non-empty string.
2. contains `$category` param.
3. strict branch: `category == "international"` present.
4. legacy-tolerant branch: `!defined(category)` present AND `category == "domestic"` present.
5. ordering: `| order(name asc)` present.
6. new-query projection contains `difficultyLevel`.
7. new-query projection contains `isSpecialTour`.
8. `DESTINATIONS_QUERY` projection gained `difficultyLevel`.
9. `DESTINATIONS_QUERY` projection gained `isSpecialTour`.
10. **call-site safety**: `DESTINATIONS_QUERY` does NOT contain `$category` (3 call sites pass `{region}` only) AND still contains `$region`.
11. `DESTINATIONS_BY_SLUG_QUERY` contains the 2 new fields + `$slug`, does NOT contain `$category`.
12. `FEATURED_DESTINATIONS_QUERY` (homepage.ts) contains the 2 new fields, no new params.
13. projections intact: all 4 queries still contain `image {` (imageFragment) or core fields `_id, name, slug, region` (no field lost — `git diff` add-only guarantee).
14. `DESTINATION_SLUGS_QUERY` + `DESTINATIONS_BY_SLUGS_QUERY` untouched (no `$category`, no `difficultyLevel` requirement in slugs query).
15. filter text of new query contains `_type == "destination"`.

## Browser assertion list (`p-tours-category.mjs`, VI live + EN fetch, ~17 checks)
- **P1/P2**: `/vi/tours/domestic` → 200 · `/vi/tours/international` → 200 (goto + `dismissPromo`).
- **P3/P4**: h1 EXACTLY `vi.tours.domestic.title` / `vi.tours.international.title` (duplicates of `l-navbar:73` — cheap contract guard).
- **P5/P6**: EN via in-page `fetch` + `DOMParser` (precedent `l-navbar.mjs:62-70`): `/en/tours/domestic` → 200 + h1 === `en.tours.domestic.title`; `/en/tours/international` → 200 + h1 === `en.tours.international.title`.
- **P7**: tab nav in `main nav` has exactly 2 links: hrefs `["/vi/tours/domestic","/vi/tours/international"]`, labels `[vi.common.domesticTours, vi.common.internationalTours]` (read from `vi.json` at runtime, never hardcoded).
- **P8**: domestic page — `aria-current="page"` on domestic link only (international link has none). **P9**: international page — inverse.
- **P10 (data-driven filter proof, domestic)**: helper `fetchDestinationCats()` (self-contained `envValue` copied from `cms-expectations.mjs:12-20`) → live GROQ `*[_type=="destination"]{"slug":slug.current,category,difficultyLevel,isSpecialTour}`; expected domestic slugs = `category=="domestic" || category===undefined`; rendered card hrefs on page = `main a[href]` matching `^/vi/explore/destinations/[^/]+$` → slug sets must be EQUAL (handles empty set: then assert empty-state copy `vi.tours.empty` present instead).
- **P11**: same for international (strict `category=="international"`; empty ⇒ `vi.tours.empty`).
- **P12**: no-leak guard — zero `international`-only slugs on domestic page AND zero `domestic/undefined` slugs on international page (explicit, even though set-equality implies it).
- **P13**: detail + listing regression: `/vi/explore/destinations` → 200; `/vi/explore/destinations/hcm` → 200 with non-empty h1 AND SSR HTML contains `#customer-reviews` (mirrors `g-reviews.mjs:154-167` — badge chips cannot break reviews SSR).
- **P14 (conditional badges, dataset-driven)**: if any live doc has valid `difficultyLevel` or `isSpecialTour===true` → open that doc's category page, locate its card via `a[href="/vi/explore/destinations/<slug>"]` → closest `[data-slot="card"]`, assert text contains label (`vi.destinations.difficulty.<level>` / `vi.destinations.special`). Else (current likely state: no data) → assert NEITHER page's text contains any of the 5 badge labels (graceful fallback proof) — never assert a badge must exist (no fabricated data).
- **P15**: screenshots `tests/.output/p-tours-01-domestic.png`, `p-tours-02-international.png`.
- **P16**: `pageerror` listener count === **0** on all gotos.
- **P17**: `/vi/explore/destinations/hcm` h1 unchanged after chips (equals live CMS `name` via same helper — or non-empty if query fails: detail records query status in `detail`, fails only on 200-with-empty-h1).

## Implementation Steps
1. Write `tests/unit/tour-category-queries.test.mts`: env bootstrap `:4-5` style not needed (no client import) → `await import("../../src/sanity/queries/destinations.ts")` + `homepage.ts`; 15 `check()`s per list above; exit non-zero on fail (pattern `fetch-published-cache.test.mts:63-64`).
2. Run `node tests/run-unit.mjs` vs baseline → **15/15** (new file + parity 789/789 inside `i18n-parity` run).
3. Write `tests/browser/p-tours-category.mjs`: copy `m-footer-brand.mjs:1-26,49-57,188-194` boilerplate; add local `fetchDestinationCats()` helper (envValue + GROQ URL per `cms-expectations.mjs:27-42`); flow = P1→P4 (domestic) → P7/P8 → P10/P12/P14 → P15 screenshot 01 → P2/P4 international P9/P11/P12/P14 → P15 screenshot 02 → P5/P6 (EN fetch) → P13 (listing/detail) → P16.
4. Run `node tests/browser/p-tours-category.mjs` alone vs dev `:3000`; iterate until all `ok`. If P10/P11 mismatch: dump expected vs rendered sets in `detail` — investigate GROQ/page param before touching thresholds; NEVER hardcode slugs.
5. Full pipeline (mandated order): `npm run lint` (0) → `npm test` (**15/15**) → **stop dev** → `npm run build` (exit 0; verify `ƒ /[locale]/tours/domestic` + `ƒ /[locale]/tours/international`, and `●`/`○` absent on them) → start dev `:3000` → `npm run test:browser` (**15 files → expect 14/15**, sole failure `revalidate-webhook.mjs` = missing `SANITY_REVALIDATE_SECRET`, never edit).
6. Regression eyeball inside suite: `l-navbar` prints all checks passed (4 nav links + h1s), `g-reviews` 30/30, `m-footer-brand` 24/24 — 0 edits to those files (`git diff tests/` shows ONLY the new `p-…` file).
7. Changelog: append at EOF (under `## 2026-09-28` `:261`) a `### Added` block, Vietnamese bullets, house pattern:
   - `- **[CMS/Feature] Mở rộng schema destination + lọc danh mục `/tours/*`** (plan \`260928-2105-cms-tour-attributes-category-filter\`)`
   - sub-bullets: AC1 (`destination.ts` +3 field: `difficultyLevel` enum optional / `isSpecialTour` boolean `initialValue:false` / `category` required enum domestic|international `initialValue:"domestic"`; legacy doc chưa backfill → chặn publish khi sửa — chấp nhận) · AC3 query (NEW `DESTINATIONS_BY_CATEGORY_QUERY` strict/tolerant ternary + 3 query hiện tại mở projection +`difficultyLevel,isSpecialTour`, KHÔNG thêm param → 3 call-site `{region}`/`{slug}` không đổi) · AC2/AC3 UI (`tour-category-section.tsx` pill `<nav aria-current="page">` + grid copy listing + empty `tours.empty`; `tour-attribute-badges.tsx` client null-gated render ở card + detail, chỉ hiện khi có dữ liệu; booking form không đổi) · i18n +6 key ×2 file (parity 789/789) · Tests (NEW unit `tour-category-queries.test.mts` ~15 checks + browser `p-tours-category.mjs` ~17 checks data-driven GROQ live, không fake data, không sửa test cũ)
   - ends: `  - Verified: lint exit 0 · \`npm test\` **15/15** · \`npm run build\` exit 0 (route \`ƒ\` 2 tours) · \`npm run test:browser\` **14/15** (fail duy nhất \`revalidate-webhook\` = env pre-existing) · \`sanity schemas validate\` 0 errors · evidence \`tests/.output/p-tours-01..02.png\`` and `  - Docs impact: minor`
8. Flip statuses: `plan.md` + 3 phases → **Complete / 100%**; write `reports/plan-summary.md` (phases/risks/open questions + actual results).

## Todo List
- [ ] Create `tests/unit/tour-category-queries.test.mts` (~15 contract checks, no network)
- [ ] `node tests/run-unit.mjs` → 15/15
- [ ] Create `tests/browser/p-tours-category.mjs` (~17 checks: 200s, exact h1 VI+EN, pills+aria-current, live-GROQ set equality, no-leak, empty-state, conditional badges, detail/listing regression, screenshots ×2, 0 pageerrors)
- [ ] Standalone run → all ok
- [ ] `npm run lint` 0 → `npm test` 15/15 → stop dev → `npm run build` 0 (`ƒ` both tours routes) → start dev → `npm run test:browser` 14/15
- [ ] Confirm `git diff tests/` = only new files; `l-navbar`/`g-reviews`/`m-footer-brand` untouched & green
- [ ] Append `### Added` changelog block (VN, `Verified:`, `Docs impact: minor`)
- [ ] Flip plan/phase statuses → Complete; write `reports/plan-summary.md`

## Success Criteria
- Unit **15/15**, browser **14/15** (sole pre-existing `revalidate-webhook` env fail), lint 0, build 0 with `ƒ` on both tours routes, `sanity schemas validate` 0 errors.
- Filter proof is data-driven against live dataset (equal slug sets / empty-state), zero hardcoded slugs, zero fabricated CMS data.
- `git diff` on `tests/` = new files only; on `src/` = allow-list only; i18n parity 789/789.

## Risk Assessment
- **Live-dataset drift** during backfill (user edits Studio mid-test) → expected sets recomputed per run from same source as UI (both hit published API within 300s cache window; worst case a fresh doc is in GROQ but not yet in page cache → mitigation: P10/P11 failure detail prints both sets + `_updatedAt` ordering; rerun after cache TTL if transient).
- **Badge labels colliding with other page text** in P14-negative branch → labels chosen distinct (`Tour đặc biệt`, `Cực khó`, …); if collision found at runtime, scope check to card text only.
- **Suite count change 14→15** documented; runners untouched; `p-…` sorts before `revalidate-webhook`.
- **`sanity schemas validate` env assert** → documented `.env.local` sourcing fallback (P1 step 5).

## Security Considerations
- Test reads only public published GROQ endpoint (same as `cms-expectations`), uses `.env.local` **names** only (no secrets committed, no tokens sent); no Studio write token; no `.env` edits; `revalidate-webhook` (secret-gated) untouched.

## Next Steps
- None (terminal phase). Docs impact: minor (changelog EOF + plan statuses + `reports/plan-summary.md`).
