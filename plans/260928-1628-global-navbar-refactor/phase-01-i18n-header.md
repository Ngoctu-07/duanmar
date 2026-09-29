# Phase 01 — i18n Keys + Header navItems Refactor

## Context Links
- Plan: `plan.md` decisions 1-3 · Research: `research/research-summary.md` §A
- Files: MODIFY `src/components/layout/header.tsx` (`:11-17`), `src/messages/en.json` + `vi.json` (`common` block `:72-86`)

## Overview
- Priority: high · Status: pending · Progress: 0% · Depends on: approval (given)
- AC1 + AC2: purge legacy links, render exactly 4 in order on desktop AND mobile sheet.

## Requirements
**Functional**
1. Add to `common` in BOTH `en.json`/`vi.json` (append after `search`):
   - `domesticTours` = "Domestic Tours" / "Tour trong nước"
   - `internationalTours` = "International Tours" / "Tour nước ngoài"
   - `blog` = "Blog" / "Blog"
   - `deals` value untouched (VI already exact AC label).
2. Replace `navItems` (`header.tsx:11-17`) with exactly, in order:
   `{ key: "domesticTours", href: "/tours/domestic" }` · `{ key: "internationalTours", href: "/tours/international" }` · `{ key: "deals", href: "/deals" }` · `{ key: "blog", href: "/blog" }`.
   Desktop `:30-40` + sheet `:90-100` both map this array → nothing else changes in the file.
3. Old keys (`explore/planTrip/culture/news`) stay in messages (footer/sitemap consumers) — no value edits.

**Non-functional**: header stays 1 file <200 LOC (107→~107) · no new deps · labels only from `common` namespace (existing `t(item.key)` pattern unchanged).

## Implementation Steps
1. Edit both locale files (keys together → parity test).
2. Replace `navItems` array in `header.tsx`.
3. Verify: `npm run lint` · `npm test` (14/14, parity) · `npm run build` · DOM probe on `http://localhost:3000/vi`: desktop `header nav a` = 4 hrefs in order `[/vi/tours/domestic, /vi/tours/international, /vi/deals, /vi/blog]`; sheet (open hamburger) same 4; legacy hrefs absent from header; footer still shows its headings.

## Todo List
- [ ] 3 keys × both locale files
- [ ] `navItems` replaced (4, exact order)
- [ ] lint / test / build / DOM probe green

## Success Criteria
- `npm run lint` exit 0 · `npm test` **14/14** · `npm run build` exit 0.
- DOM: header nav exactly 4 links, order as specified; mobile sheet identical; grep header has no `/explore`, `/plan-your-trip`, `/culture`, `/news` bare hrefs; `grep -c '"blog"' messages` grows by 2 (one per file) at `common`.
- `git diff tests/` → empty (no test edits in this phase).

## Risk Assessment
- R1 parity fail → keys added to both files in same step · R2 footer/sitemap label regression → zero edits to existing key values (grep `common` diff shows only additions).

## Security Considerations
- No data, no inputs, no new endpoints. Labels are static i18n strings (React-escaped).
