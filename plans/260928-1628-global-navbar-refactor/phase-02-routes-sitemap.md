# Phase 02 — Foundational Routes (`/tours/*`) + Sitemap Entries

## Context Links
- Plan: `plan.md` decisions 4-6 · Research: `research/research-summary.md` §B
- Files: CREATE `src/app/[locale]/tours/domestic/page.tsx`, `src/app/[locale]/tours/international/page.tsx`; MODIFY `src/messages/{en,vi}.json` (new `tours` namespace), `src/app/sitemap.ts`, `src/app/[locale]/sitemap/page.tsx`

## Overview
- Priority: high · Status: pending · Progress: 0% · Depends on: P1 (nav labels)
- AC3: each nav node routes to a distinct page. `/deals` + `/blog` exist → create the two tour pages (static, message-driven — NO CMS schema, NO fake tour inventory).

## Requirements
**Functional**
1. New namespace `tours` × both locales:
   ```
   "tours": {
     "domestic": { "title", "subtitle", "body", "cta" },
     "international": { "title", "subtitle", "body" }
   }
   ```
   Copy: Domestic = Vietnam tours intro + body mentioning full inventory of Vietnam destinations + `cta` = "Explore destinations"/"Khám phá điểm đến". International = intro + honest empty-state body (no international inventory yet — coming soon tone, no fake cards).
2. Pages (each ≤60 LOC, house pattern from `deals/page.tsx`):
   - Server component, static `export const metadata` (title like `"Domestic Tours | DuanMar"` — follow existing `blog/page.tsx:6-9` style), `getTranslations("tours")`.
   - Layout: `container mx-auto px-4 py-16`, centered `h1` + subtitle + body paragraph.
   - Domestic only: CTA `<Button render={<Link href="/explore/destinations" />}>` (reuse header pattern `render={<Link/>}` or plain Link styled as link — copy whatever `deals`/`blog` use if any; else simple Link). `Link` from `@/i18n/navigation` (never next/link).
3. `src/app/sitemap.ts`: append `"/tours/domestic"`, `"/tours/international"` to `routes` (`:8-32`).
4. HTML sitemap page: add 2 links to `discover` group (`:66-78`) with labels `tc("domesticTours")`/`tc("internationalTours")` (keys exist from P1, `tc` = getTranslations("common") already in file).

**Non-functional**: files <200 LOC · static metadata only · theme tokens only (no hex/`red-*`) · no fake data · no new deps · `[...rest]` untouched.

## Implementation Steps
1. `tours` messages ×2 files (together → parity).
2. Create 2 pages (copy `deals/page.tsx` skeleton; differ only in content/CTA).
3. Sitemap edits (XML + HTML).
4. Verify: `npm run lint` · `npm test` · `npm run build` → route table contains `/vi/tours/domestic` + `/vi/tours/international`; `curl -s localhost:3000/vi/tours/domestic` → 200 + h1 differs from international's; `curl localhost:3000/sitemap.xml` contains both new URLs.

## Todo List
- [ ] `tours.{domestic,international}.*` messages ×2 files
- [ ] 2 page files (static metadata, distinct content)
- [ ] `sitemap.ts` routes + HTML sitemap discover group
- [ ] lint / test / build / curl / sitemap.xml green

## Success Criteria
- lint 0 · `npm test` 14/14 · build 0 with both routes in the route table.
- `curl -o /dev/null -w %{http_code}` = 200 for `/vi/tours/domestic`, `/vi/tours/international`, `/en/tours/domestic` ; h1 texts distinct between the two pages; `grep "tours/domestic" sitemap.xml` hits ≥2 (en+vi).
- `wc -l` both pages ≤200; theme sweep 0 hits.

## Risk Assessment
- R1 catch-all swallows new routes → static-segment precedence (verified, build table proves it) · R2 sitemap HTML uses missing key → keys shipped in P1 · R3 copy invents inventory → empty-state wording reviewed against "no fake data" rule.

## Security Considerations
- Static content only; no inputs/endpoints. External link none beyond internal `/explore/destinations`.
