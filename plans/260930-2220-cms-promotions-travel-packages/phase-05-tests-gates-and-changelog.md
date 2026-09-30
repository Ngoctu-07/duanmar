# P5 — Tests, Verification Gates, Changelog

## Context Links
- Harness to copy: `tests/unit/article-schema-queries.test.mts` (`check()` + `readFileSync` + dynamic import)
- GROQ safety style: `tests/unit/site-configuration-query.test.mts:47-66` (groq-js `parse`, no `$`, no ` ? `, balanced parens)
- Runner: `tests/run-unit.mjs` (counts FILES: **27 today → 28 after**)
- Browser refs (grep `tests/` for `deals`): `l-navbar.mjs:75` asserts `h1 === vi.deals.title` (KEEP key), `j-about-contact.mjs:69` href only; **no test asserts `deals.items`** → no existing test edits needed.
- Changelog format: `docs/project-changelog.md` latest entries (`### Added` → `**[Feature] …** (plan \`plans/…\`)` → bullets → `Verified: …` → `Docs impact: minor`)

## Overview
Priority: P0 · Status: TODO
One new unit test file covering schema + query + messages + shared lib, then all five gates in order, then changelog entry.

## Key Insights
- Test must be offline: `readFileSync` structural asserts + groq-js `parse` + pure-lib imports (no Sanity network, no clock).
- `isPromotionLive`/`daysUntilValid` take injectable `now` → boundary tests deterministic.
- Existing `i18n-parity.test.ts` enforces EN↔VI key equality automatically; new test pins which keys must exist/ vanish.
- Intl exact strings can vary by Node → assert grouping substrings (`1.500.000`, `1,500,000`, `$100`) not full equality where risky.

## Requirements
- [ ] NEW `tests/unit/promotion-schema-queries.test.mts` (`check()` harness) asserting:
  - schema: `name: "promotion"`; all field names present; `fieldset: "en"` + `fieldset: "vi"`; `hotspot: true` + nested `alt`; currency list has VND+USD + `initialValue: "VND"`; `targetTour` → `type: "destination"`; `isActive` `initialValue: true` + required; `validUntil` type `date` + required; preview select has `title_en`/`validUntil`/`bannerImage`; **no `slug` field**.
  - `index.ts` registers `promotion`.
  - query: exported, groq-js parses; `_type == "promotion"`; `isActive == true`; `order(validUntil asc)`; projects `_id, title_en, title_vi, badgeTag_en, badgeTag_vi, description_en, description_vi, discountedPrice, originalPrice, currency, validUntil, bannerImage, targetTour`; `asset->{ _id, url,` fragment present; `targetTour->{` + `slug.current`; **no `$`**; no ` ? `; balanced parens.
  - messages: `items` absent under `deals` in en+vi; `endsInDays`/`lastDay`/`empty`/`viewTour` present in both; `title`/`subtitle`/`disclaimer` still present.
  - lib: `isPromotionLive` boundary (`validUntil === today` → live; yesterday → dead; `undefined`/garbage → false); `daysUntilValid` (today→0, +3d→3, past→negative); `formatPromoPrice` (VND/vi contains `1.500.000`, VND/en contains `1,500,000`, USD/en contains `$100`, NaN/negative → `null`); locale fallback (VI field blank → EN text).
- [ ] Gates in order: `npx tsc --noEmit` → `npm run lint` → `npm test` (**28/28**) → `npx sanity schemas validate` (0 errors) → `npm run build`.
- [ ] Build prerequisite: **stop dev server first** (port 3000 LISTENING, PID 16856 at plan time — re-check via `netstat`; dev holds `.next`). Restart after build if needed.
- [ ] Browser/ad-hoc check OPTIONAL: no `SANITY_WRITE_TOKEN` → `/en/deals` + `/vi/deals` render `deals.empty` (expected — documented as pre-seeding state, same as itinerary feature).
- [ ] Changelog: append entry to `docs/project-changelog.md` matching last-entry format; `Docs impact: minor`. Do NOT touch unrelated modified working-tree files.

## Architecture
```
promotion-schema-queries.test.mts
├─ readFileSync(promotion.ts, index.ts, en.json, vi.json) → structural asserts
├─ import PROMOTIONS_QUERY → groq-js parse + safety asserts
└─ import src/lib/promotions.ts → behavior asserts (fixed `now`, no network)
```

## Related Code Files
- create: `tests/unit/promotion-schema-queries.test.mts`
- modify: `docs/project-changelog.md`
- delete: none

## Implementation Steps
1. Write the test file (~130 lines, mirror article harness).
2. `npm test` → 28/28 files.
3. `npx tsc --noEmit` and `npm run lint` → `npx sanity schemas validate` → 0 errors.
4. Stop dev on :3000 → `npm run build` → (restart dev) → optional ad-hoc page check (empty state, 0 pageerror).
5. Append changelog entry (feature bullets + plan link + Verified line + Docs impact).

## Todo List
- [ ] `promotion-schema-queries.test.mts` written (schema/query/messages/lib coverage)
- [ ] `npm test` → **28/28**
- [ ] `npx tsc --noEmit` 0
- [ ] `npm run lint` 0
- [ ] `npx sanity schemas validate` 0 errors
- [ ] dev stopped → `npm run build` 0 → dev restarted
- [ ] optional browser check: empty state renders, 0 pageerror
- [ ] changelog entry appended (format matches last entry, plan path linked)

## Success Criteria
All five gates green; test files 27→28; browser `l-navbar` L4 unaffected (`deals.title` kept); changelog updated.

## Risk Assessment
- Build vs dev `.next` contention → stop PID before build, never run both concurrently.
- Substring asserts brittle to query reformatting → copy stable substrings from existing passing tests.
- Intl output variance across Node versions → `contains` assertions over exact equality.

## Security Considerations
No tokens read/used; `.env.local` never opened or committed; changelog contains no secrets.

## Next Steps
Docs impact: minor (changelog + this plan folder). After an editor seeds promotions in Studio, cards go live automatically at next revalidate (webhook or ≤5 min TTL).
