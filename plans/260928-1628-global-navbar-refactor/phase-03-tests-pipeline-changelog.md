# Phase 03 — Tests + Full Pipeline + Changelog

## Context Links
- Plan: `plan.md` decision 8 · Research: `research/research-summary.md` §C
- Files: CREATE `tests/browser/l-navbar.mjs`; MODIFY `tests/browser/j-about-contact.mjs` (`:40-41`), `docs/project-changelog.md`, `plan.md` (status)

## Overview
- Priority: high · Status: pending · Progress: 0% · Depends on: P1+P2
- Enforce AC1-3 in the browser suite; flip the two old-spec assertions; run the full pipeline; document.

## Requirements
**Functional**
1. NEW `tests/browser/l-navbar.mjs` (<200 LOC, Puppeteer harness copied from `g-header.mjs`/`g-reviews.mjs`: `check()`, `dismissPromo` after every load, screenshots → `tests/.output`, exit-on-FAIL tail). Checks (≥16):
   - **L1 desktop structure**: goto `/vi` → `header nav a` exactly **4**; hrefs **in order** `["/vi/tours/domestic","/vi/tours/international","/vi/deals","/vi/blog"]`; labels in order = "Tour trong nước","Tour nước ngoài","Ưu đãi & Gói du lịch","Blog".
   - **L2 legacy purge**: header (desktop nav) contains NONE of bare `/explore`, `/plan-your-trip`, `/culture`, `/news`; header `<nav>` count === 4.
   - **L3 mobile sheet**: open hamburger (`header button` with menu sr-only / `SheetTrigger`) → sheet nav = same 4 hrefs in same order; close.
   - **L4 routing distinctness**: each of the 4 hrefs `page.goto` → status 200; page `h1` texts all distinct (4 unique); Domestic h1 ≠ International h1; `/vi/blog` still renders stories heading (existing page intact), `/vi/deals` renders deals heading.
   - **L5 chrome preserved**: search + my-trips entries still in header (`aria-label` "Tìm kiếm"/"Chuyến đi của tôi"); locale switcher present.
   - Screenshot `l-navbar-01.png` (+02 sheet).
2. PATCH `tests/browser/j-about-contact.mjs:40-41`: replace the two checks ("keeps /explore", "keeps /culture") with the new-spec equivalent: header contains `/deals` and `/blog` (or drop to a single `no legacy` check) — keep `:39`/`:54` (no /about) untouched. Net `check(` count may stay equal or +0/-1; document exact edit in changelog (precedent: F7/B6).
3. No edits to any other test. `g-header`, `g-reviews`, `k-review-actions`, `f-ui` must pass unmodified.

**Pipeline (order)**: `npm run lint` → `npm test` (14/14) → `npm run build` → dev :3000 → `npm run test:browser` → **10/11** (only `revalidate-webhook.mjs` fails on missing `SANITY_REVALIDATE_SECRET` — tolerated, do NOT "fix") · `g-header` + `j-about-contact` + `l-navbar` green.

4. Changelog: ONE bullet appended under `## 2026-09-28` `### Added` (house style: dense VN, `·`, plan tag, `Verified:` line, `Docs impact: minor`).
5. `plan.md`: header → Complete, 3 phase rows → `Complete | 100%`, fill Completion Notes (pipeline outputs, j-patch deviation, follow-ups).

## Implementation Steps
1. Write `l-navbar.mjs`; run standalone → all checks pass; `wc -l` <200.
2. Patch `j-about-contact.mjs` (minimal lines); run it standalone → green.
3. Full pipeline in order; capture exact counts for changelog `Verified:`.
4. Append changelog bullet; update `plan.md` statuses + Completion Notes.

## Todo List
- [ ] `l-navbar.mjs` (L1-L5, <200 LOC, ≥16 checks)
- [ ] `j-about-contact.mjs:40-41` patched to new spec
- [ ] lint · test 14/14 · build · test:browser 10/11 · g-header green
- [ ] Changelog bullet + plan.md Complete/100%

## Success Criteria
- `npm run lint` 0 · `npm test` **14/14** · `npm run build` 0.
- `npm run test:browser` → **10/11 files passed**, failed = `revalidate-webhook.mjs` only; `l-navbar` prints `all N checks passed` (N≥16); `j-about-contact` green; `g-header` green (0 edits).
- `wc -l tests/browser/l-navbar.mjs` <200 · `git diff tests/browser/g-header.mjs` empty.
- Changelog: `grep -n "navbar" docs/project-changelog.md` ≥1 hit after `## 2026-09-28`, with `Verified:` + `Docs impact:`.
- `plan.md`: `Status**: Complete`, 3× `| Complete | 100% |`.
- Evidence: `ls tests/.output/l-navbar-*.png` ≥2 files.
- Diff hygiene: allow-list only; theme sweep on new pages = 0; no `*-enhanced`.

## Risk Assessment
- R1 j-patch hides regression → l-navbar now owns the header-link assertions (stronger) · R2 sheet selector brittle → reuse `g-header.mjs` mobile-open approach · R3 promo overlay intercepts clicks → `dismissPromo` after every load · R4 revalidate env failure → tolerated & listed in `Verified:`.

## Security Considerations
- Tests navigate only public pages, seed nothing, no secrets. Changelog/plan contain no tokens.
