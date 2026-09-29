# Phase 3 — Browser Tests, Pipeline, Backfill Execution, Changelog

**Plan**: [plan.md](plan.md) · **Priority**: High · **Status**: In Progress · **Depends on**: Phase 2

## Context Links
- `tests/browser/p-tours-category.mjs` (22 checks; `isDomestic` null-tolerant at `:46`; live query `:35-36`)
- Homepage section markup: `src/components/homepage/featured-destinations.tsx:22-38` (`section > .container > h2` = `home.featuredDestinations`)
- i18n keys: `home.featuredDestinations` (`en/vi.json:94`), `tours.empty` (`:1139`) — **0 new keys → parity stays 789/789**
- Runners: `tests/run-unit.mjs` (15 files) · `tests/run-browser.mjs` (15 files) — **never edit runners**
- Changelog: `docs/project-changelog.md` (append under `## 2026-09-29`, EOF)

## Overview
Lock the strict contract in the browser suite: strict `isDomestic`, single-nav assertion, homepage featured-section strictness (AC2), then run the full pipeline and the backfill script.

## Key Insights
- Browser test derives expected sets from live GROQ → suite stays green **before** backfill (both tabs expected-empty) and after (exact set equality).
- Homepage check must scope to the FeaturedDestinations section (other sections link to destinations too) via its h2 text.
- `.env.local` has NO `SANITY_REVALIDATE_SECRET` → `revalidate-webhook.mjs` remains the known pre-existing failure (14/15).
- `.env.local` has NO `SANITY_WRITE_TOKEN` → `--apply` requires a token supplied by the operator (unresolved question #1).

## Requirements
- AC1–AC4 each guarded by ≥1 automated check.
- No fabricated CMS data; expectations always read from the live dataset.
- Zero edits to other tests/runners.

## Related Code Files
**Modify**: `tests/browser/p-tours-category.mjs` · `docs/project-changelog.md` · plan status files
**Create**: none
**Delete**: none

## Implementation Steps
1. `p-tours-category.mjs` updates:
   - `:36` live query → add `isFeatured` to projection.
   - `:46` → `const isDomestic = (doc) => doc.category === "domestic";` (strict; comment notes backfill dependency).
   - Add **P19 homepage featured strictness**: goto `/vi`; locate the `<section>` whose `h2` text equals `msg.vi.home.featuredDestinations`; collect `/vi/explore/destinations/*` links inside it; assert (a) every rendered slug ∈ live `isFeatured === true` set, (b) if that set is non-empty, all (max 6) appear, (c) if empty, zero links rendered.
   - Add **P20 single nav**: `document.querySelectorAll('nav[aria-label="Tour category"]').length === 1` on both tours pages (guards layout/section duplication).
   - Keep P1–P18 intact (P7/P8/P9 markup unchanged by design).
2. Run backfill:
   - `node scripts/backfill-tour-filter-fields.mjs` → review planned ops (flag `nyc` → rerun with `--set nyc=international` if operator confirms).
   - If `SANITY_WRITE_TOKEN` available: `--apply`, then re-run dry-run (must report 0 pending ops). Else hand the exact command to the user and note it as Outstanding (suite still green either way).
3. Full pipeline: `npm run lint` → `npm test` (**15/15**) → stop dev → `npm run build` (exit 0, both routes `ƒ`) → start dev `:3000` → `npm run test:browser` (**expect 14/15**, sole failure = pre-existing `revalidate-webhook` missing `SANITY_REVALIDATE_SECRET`; new `p-tours-category.mjs` must be all-green standalone).
4. Sanity Studio check: `/studio/structure/destination` → edit a doc → confirm `Featured` toggle present, `Category` dropdown only 2 options, invalid value rejected by validation.
5. Changelog: `docs/project-changelog.md` EOF entry under `## 2026-09-29` — bullets: `isFeatured` rename + migration script, strict category filter, shared tours layout/persistent tabs; include `Verified:` line (lint/unit/build/browser counts, schema validate) and `Docs impact: minor`.
6. Flip statuses: `plan.md` + phase files → Complete/100%; write `reports/implementation-2026-09-29-tour-filtering-refactor.md` (per `.claude/rules/orchestration-protocol.md` reporting format).

## Todo List
- [ ] Browser test: strict `isDomestic` + `isFeatured` projection
- [ ] Browser test: P19 homepage featured strictness, P20 single-nav
- [ ] Backfill dry-run → apply (if token) → verify 0 pending
- [ ] Full pipeline (lint / unit / build / browser)
- [ ] Studio manual verification (AC1)
- [ ] Changelog + plan status flips + report

## Success Criteria
- `p-tours-category.mjs` all checks pass; unit 15/15; lint 0; build 0; schema validate 0 errors.
- Homepage section renders only `isFeatured === true` docs (P19), domestic/international show exact strict sets (P10/P11/P12).
- Exactly one category nav per tours page; both tabs switch seamlessly.

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| No write token → backfill blocked | Dry-run + documented command; suite green regardless; unresolved question surfaced |
| P19 selector fragility (h2 text) | Scoped by exact i18n string from `vi.json`; fallback: section with `data-*` not added (YAGNI) |
| Post-backfill set mismatch (e.g. `nyc` mis-filed) | Operator reviews dry-run table before `--apply` |

## Security Considerations
- Token never printed/logged/committed; script reads it from env only.
- No `.env*` edits, no secrets in changelog/plan.

## Next Steps
Docs impact: **minor** (changelog only). Outstanding: write-token availability (plan Unresolved Q1).
