# Global Theme Redesign & Brand Identity Migration — Plan

**Date**: 2026-09-27
**Type**: Feature Implementation (palette + brand copy + typography)
**Status**: Complete (2026-09-28) — executed via remediation plan 260927-2345
**Target**: Next.js 16 + Tailwind v4 + shadcn, verify at http://localhost:3000 (port may vary)

## Executive Summary
Migrate the site to a Red/Black/White premium palette (deep crimson `#B91C1C` primary), rename the visible brand from "Vietnam Tourism" to **DuanMAR** (brand + visible copy only), and give the brand wordmark its own display font (Sora) via a shared `brand-wordmark` component. Colors are 100% token-driven — ~446 usages across 64/75 tsx files change with edits confined to `globals.css`.

## Context Links
- **Research**: [research/research-summary.md](research/research-summary.md) (all file:line refs verified)
- **Template**: `plans/templates/feature-implementation-template.md`
- **Rules**: `.claude/rules/documentation-management.md`, `.claude/rules/development-rules.md`
- **Prior art**: `docs/project-changelog.md:14` — font `variable` class MUST be on `<html>` (past P1 bug)
- **Related plan**: `plans/250925-1000-vietnam-tourism-foundation`

## Phases

| # | Phase | File | Status | Progress |
|---|-------|------|--------|----------|
| 1 | Global color palette refactor | [phase-01-global-color-palette-refactor.md](phase-01-global-color-palette-refactor.md) | Complete | 100% |
| 2 | Brand name migration → DuanMAR | [phase-02-brand-name-migration.md](phase-02-brand-name-migration.md) | Complete | 100% |
| 3 | Brand typography (Sora + wordmark) | [phase-03-brand-typography.md](phase-03-brand-typography.md) | Complete | 100% |

**Order is mandatory**: 1 → 2 → 3. Each phase is independently verifiable against the running dev server before the next begins.

## Key Dependencies
- Phase 2 depends on Phase 1 only for visual review (text edits are independent).
- Phase 3 depends on Phase 2: header/footer brand text must already read `DuanMAR` before it is extracted into `src/components/layout/brand-wordmark.tsx`.
- Only NEW files allowed anywhere: `src/components/layout/brand-wordmark.tsx` + this plan dir. All other work edits existing files.
- Code files stay under 200 lines; do not create "enhanced" duplicate files.

## Verification (run after EVERY phase)
```bash
npm run lint
npm run build          # do NOT run while dev server holds .next (see changelog:14)
npm test               # includes i18n en/vi JSON key parity
npm run test:browser   # requires dev server on :3000
```
Plus manual/screenshot pass on `/en` and `/vi` at http://localhost:3000.

## Scope Guardrails
- **In**: `:root`/`.dark`/`@theme` tokens in `src/app/globals.css`; 31 brand/title/logo spots + visible in-site prose in `src/`; `src/messages/{en,vi}.json:1162`; Google Font + wordmark component.
- **Out (do not touch)**: `vietnam-tourism.com` URLs (`sitemap.ts:5`, `robots.ts:12`), `@vietnam-tourism.com` emails, `package.json` `name`, `docs/`, `plans/` history, `.opencode/`.
- **Flagged**: org-name prose — `en.json:417`, `en.json:988`, `about/contact/page.tsx:7`, `vi.json:417/988/336`, `about/page.tsx:6`.

## Open Questions
1. Org-name prose ("Vietnam Tourism Organization") — recommended: leave unchanged (legal/press boilerplate). Awaiting user confirmation.
2. `text-green-700` success color at `booking-payment-section.tsx:161` — recommended: keep (distinct success semantic). Awaiting confirmation.
