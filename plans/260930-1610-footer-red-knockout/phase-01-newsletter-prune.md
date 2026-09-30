# Phase 1: Newsletter CTA Prune

**Plan**: [`plan.md`](plan.md) · **Est**: 0.75h · **Status**: pending · **Files**: 1 modify, 1 delete

## Context Links
- **Render chain (verified)**: `src/app/[locale]/layout.tsx:35` renders `<Footer />` globally; newsletter is NOT in footer — `src/components/homepage/newsletter-cta.tsx:8` `<section className="py-16 bg-primary text-primary-foreground">` with hardcoded EN "Stay Updated" (`:11`) / "Subscribe" (`:22`), rendered ONLY from `src/app/[locale]/page.tsx:5` (import) + `:44` (last block before content ends). Grep `NewsletterCTA|newsletter-cta` across repo = imports/usage only in `page.tsx` (other hits are historical `plans/` + `docs/project-changelog.md:125` — documentation, not code).
- **Test audit (explicit negatives)**: `tests/` grep for `Stay Updated|Subscribe|newsletter|NewsletterCTA` = **0 hits**. `y-homepage-prune.mjs:93` Y3 asserts only `storiesH2.includes(messages.home.featuredDestinations)`; "Stay Updated" surfaces only in Y3's *detail* string (`:94` `storiesH2.slice(0,6)`) — detail changes, assertion result does not. `j-about-contact.mjs:97` (About after Featured) unaffected — order above Stories unchanged. No test counts homepage `h2`/`section` totals.
- **Downstream note**: component is `"use client"` with `lucide-react` `Mail` + `Button` — deletion removes the only homepage client boundary there; no other imports.

## Tasks
1. [ ] Remove `import { NewsletterCTA } from "@/components/homepage/newsletter-cta";` — file: `src/app/[locale]/page.tsx:5`
2. [ ] Remove `<NewsletterCTA />` — file: `src/app/[locale]/page.tsx:44`
3. [ ] Delete `src/components/homepage/newsletter-cta.tsx` (28 lines; zero remaining references — re-grep after delete)
4. [ ] Re-grep gate: `NewsletterCTA|newsletter-cta` under `src/` = 0 hits

## Acceptance Criteria
- [ ] `/`, `/vi`, `/en` render no "Stay Updated"/"Subscribe" text (browser check in P4's `m2-footer-red-knockout.mjs`; manual: homepage ends at `StoriesSection`)
- [ ] `npx tsc --noEmit` 0, `npm run lint` 0, `npm test` 26/26 (no unit touches this file)
- [ ] Existing `y-homepage-prune.mjs` still exits 0 **without modification** (Y3 assertion unaffected; only its detail JSON shrinks) — verified by reading `:88-94`
- [ ] Homepage section order otherwise byte-identical: Hero → QuickAccess → Featured → About → Stories

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Another locale/page imports component | Low | Grep says none; step 4 re-greps post-delete |
| Deleted section breaks text-order expectations in older plans | Low | Plans are historical docs, not executable |

## Rollback
Single `git revert` restores `page.tsx` + component file; no other phase depends on newsletter code.

## Next Steps
Phase 2 (asset) independent; Phase 4 adds the absence assertions (`FORBIDDEN` + m2 T5).
**Status:** PENDING
