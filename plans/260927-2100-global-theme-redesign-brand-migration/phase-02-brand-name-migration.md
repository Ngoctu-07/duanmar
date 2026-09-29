# Phase 02 — Brand Name Migration → DuanMAR

**Date**: 2026-09-27 · **Priority**: P0 · **Status**: Complete · **Est**: 0.5 day

## Context Links
- **Research**: [research/research-summary.md](research/research-summary.md) §2 (full spot list + line numbers)
- **Plan**: [plan.md](plan.md)
- **Rules**: `.claude/rules/development-rules.md`, `.claude/rules/documentation-management.md`
- **Tests**: `tests/unit/i18n-parity.test.ts` (en/vi key parity + valid JSON), `tests/browser/g-header.mjs`

## Overview
Replace the visible brand "vietnam tourist" / "Vietnam Tourism" with **DuanMAR** across the 31 brand/title/logo spots and the visible in-site prose inside `src/`. Scope is **brand + visible copy only** — URLs, emails, package name, sitemap/robots baseUrl, docs, plans, and org-name prose stay untouched.

## Key Insights
- 31 category-(a) spots = 4 global (`layout.tsx:11`, `header.tsx:27`, `footer.tsx:37`, `footer.tsx:93`) + 27 `metadata.title` `"… | Vietnam Tourism"` files (research §2.1 table).
- 5 MIXED files need hand judgment (research §2.2): `about/contact/page.tsx:6,7`, `privacy/page.tsx:6,8`, `sitemap/page.tsx:6,7`, `en.json:1162`, `vi.json:1162`.
- 4 prose lines refer to **the site** → in scope: `privacy/page.tsx:8`, `sitemap/page.tsx:7`, `en.json:1162`, `vi.json:1162`. Total edit sites = **35**.
- Org-name prose refers to **the organization** → out of scope, flagged (research §2.3).
- No test asserts brand strings (0 hits in `tests/`); only JSON validity/parity matters.
- `public/` is empty — no favicon/manifest/logo assets; brand is plain text in header/footer.

## Requirements
### Functional
- [x] All 31 brand/title/logo spots read `DuanMAR`
- [x] 4 visible prose mentions of the site rebranded (incl. `en.json:1162`, `vi.json:1162` subtitle)
- [x] English + Vietnamese stay in sync (key parity preserved; no keys added/removed)
- [x] `grep -rni "vietnam tourism" src/` returns ONLY the 3 approved exceptions

### Non-functional
- **Do NOT touch**: `src/app/sitemap.ts:5`, `src/app/robots.ts:12`, `@vietnam-tourism.com` emails, `package.json` `name`, `docs/`, `plans/` history, `.opencode/`
- Valid JSON after edit (`npm test` enforces parity)
- No `public/` asset changes needed (none exist)

## Architecture
```
src/app/layout.tsx:11  ─► site-wide <title> default
metadata.title ×27     ─► per-page SEO titles  ─► SERP (SEO-visible change)
header.tsx:27 / footer.tsx:37,93 ─► visible UI wordmark (rendered text)
src/messages/{en,vi}.json:1162    ─► i18n subtitle (parity-tested)
privacy:8 / sitemap:7             ─► visible metadata descriptions
```

## Related Code Files
**Modify (35 edit sites)**
- Global 4: `src/app/layout.tsx:11`, `src/components/layout/header.tsx:27`, `src/components/layout/footer.tsx:37`, `src/components/layout/footer.tsx:93`
- Titles 27: `src/app/[locale]/` → `about:5`, `about/careers:6`, `about/contact:6`, `about/press:6`, `accessibility:6`, `blog:7`, `business-mice:7`, `culture:6`, `deals:5`, `explore/destinations:16`, `explore/destinations/[slug]:39`, `explore/events:7`, `explore/festivals:7`, `explore/itineraries:10`, `explore/itineraries/[slug]:41`, `explore/map:12`, `explore/things-to-do:6`, `explore/things-to-do/[category]:29`, `news:7`, `news/[...slug]:24`, `plan-your-trip:6`, `plan-your-trip/[guide]:34`, `privacy:6`, `search:12`, `sitemap:6`, `support:7`, `trade:7`
- Prose 4: `privacy/page.tsx:8`, `sitemap/page.tsx:7`, `src/messages/en.json:1162`, `src/messages/vi.json:1162`

**Create**: none. **Delete**: none. (Wordmark component arrives in Phase 03.)

## Implementation Steps
1. Mechanical title replacement: `"… | Vietnam Tourism"` → `"… | DuanMAR"` across the 27 title files + `src/app/layout.tsx:11` (title becomes `DuanMAR`).
   - Dynamic titles (`${x} | Vietnam Tourism`) in `[slug]`, `[...slug]`, `[guide]`, `[category]` — same suffix swap.
2. UI wordmark: `header.tsx:27` → `<span className="text-xl font-bold">DuanMAR</span>`; `footer.tsx:37` → `DuanMAR`; `footer.tsx:93` → `© {year} DuanMAR. {tf("rights")}`. (Phase 03 extracts these into `brand-wordmark`.)
3. Hand-edit MIXED files:
   - `privacy/page.tsx:8` → `"How the DuanMAR website handles your data and the rules for using this site"`
   - `sitemap/page.tsx:7` → `"Every section of DuanMAR in one place"`
   - `src/messages/en.json:1162` → `"Every section of DuanMAR in one place"`
   - `src/messages/vi.json:1162` → `"Mọi phần của DuanMAR tại một nơi"`
4. **Leave untouched** (out of scope): `about/contact/page.tsx:7`, `en.json:417`, `en.json:988`, `vi.json:336/417/988`, `about/page.tsx:6`, sitemap/robots URLs, `package.json` name.
5. Run brand-consistency greps (must yield exactly the 3 approved exceptions):
```bash
grep -rni "vietnam tourism" src/
# allowed: about/contact/page.tsx:7, messages/en.json:417, messages/en.json:988
grep -rni "vietnam tourist" src/     # expect 0
grep -rn "vietnam-tourism" src/app/sitemap.ts src/app/robots.ts   # unchanged
```
6. Run verification commands; manual pass on `/en` + `/vi`: header wordmark, footer, page `<title>` on 5+ pages, HTML sitemap, privacy, search.

## Todo List
- [x] 27 `metadata.title` → `DuanMAR`
- [x] `src/app/layout.tsx:11` title → `DuanMAR`
- [x] `header.tsx:27`, `footer.tsx:37`, `footer.tsx:93` → `DuanMAR`
- [x] `privacy/page.tsx:8`, `sitemap/page.tsx:7` → `DuanMAR`
- [x] `en.json:1162` + `vi.json:1162` → `DuanMAR`
- [x] Confirm 3 approved exceptions are the only remaining hits
- [x] `npm run lint` · `npm run build` · `npm test` · `npm run test:browser`

## Success Criteria
- [x] `grep -rni "vietnam tourism" src/` → exactly 3 hits, all in the approved exception list
- [x] `grep -rni "vietnam tourist" src/` → 0 hits
- [x] 31/31 brand spots migrated; 4/4 in-scope prose lines migrated
- [x] Browser tab titles on `/en` and `/vi` show `… | DuanMAR`
- [x] Header + footer show `DuanMAR` on desktop and mobile sheet
- [x] `npm test` passes (en/vi JSON valid + key parity intact)
- [x] `npm run lint`, `npm run build`, `npm run test:browser` → 0 failures
- [x] `git diff src/app/sitemap.ts src/app/robots.ts package.json docs/` → empty

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| SEO title change (`"… \| Vietnam Tourism"` → `"… \| DuanMAR"`) | Med | Intended; 27 titles change at once — note for changelog/release |
| Invalid JSON breaks i18n parity test | High | Edit only value strings; `npm test` validates immediately |
| Over-migration into org-name/URLs | High | Approved-exception list + explicit out-of-scope table |
| Vietnamese subtitle consistency | Med | `vi.json:1162` changed in same step; parity test |
| Missed dynamic title templates | Med | 4 dynamic files (`[slug]`, `[...slug]`, `[guide]`, `[category]`) grepped explicitly |

## Security Considerations
- No secrets/keys involved. Do not touch `@vietnam-tourism.com` email addresses or external URLs (avoid breaking real contact/legal links).
- No auth, no data flows affected; metadata strings only.

## Next Steps
- → Phase 03 (Sora brand typography + `brand-wordmark` extraction).
- Follow-up: update `docs/` changelog + roadmap after all 3 phases (docs impact: minor).

---

**Decisions already made (do not re-litigate)**: brand → **DuanMAR**; scope = brand + visible copy only (31 spots + in-site prose incl. `…json:1162`); org-name prose + URLs + emails + `package.json` + sitemap/robots untouched (flagged as open question); deep crimson/`#18181B` palette from Phase 01; Sora wordmark in Phase 03.
