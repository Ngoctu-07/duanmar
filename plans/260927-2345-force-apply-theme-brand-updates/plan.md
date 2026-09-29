# [Bug Fix] Force-Apply Theme & Brand Updates — Remediation Plan

**Date**: 2026-09-27 · **Type**: Bug Fix · **Priority**: High · **Status**: Complete (2026-09-28) — all 7 phases executed, 7/7 browser test files pass

## Executive Summary
User executed the Red/Black theme + DuanMAR rebrand prompt but `localhost:3000/vi/booking/checkout?tour=hcm` shows legacy styling and "Vietnam Tourism". **Root cause: the update was never written — only a plan was drafted and awaited approval.** No source edits exist (verified: empty `git diff`, 0 `DuanMAR` hits in `src/`, served CSS == source). Fix = execute the existing feature plan, then force clean rebuild to guarantee fresh assets.

## Context Links
- **RCA**: [reports/root-cause-analysis.md](reports/root-cause-analysis.md)
- **Source of truth (do NOT re-invent)**: `plans/260927-2100-global-theme-redesign-brand-migration/` — [plan.md](../260927-2100-global-theme-redesign-brand-migration/plan.md), [research](../260927-2100-global-theme-redesign-brand-migration/research/research-summary.md)
- **Template**: `plans/templates/bug-fix-template.md`

## Phases (execute verbatim from feature plan)

| # | Phase | Source | Files (intent) | Status |
|---|-------|--------|----------------|--------|
| 0 | Preconditions: re-confirm clean baseline (git/grep/curl) | RCA §Evidence | none — read-only; cache clearing NOT the fix but still done later for freshness | Complete |
| 1 | Global color palette → Red/Black/White | [phase-01](../260927-2100-global-theme-redesign-brand-migration/phase-01-global-color-palette-refactor.md) | `src/app/globals.css` (`:root`/`.dark`/`@theme`) + decorative `--destructive`→`--primary` in ~13 booking/price files; defines missing `--destructive-foreground` | Complete |
| 2 | Brand migration → DuanMAR (35 edit sites) | [phase-02](../260927-2100-global-theme-redesign-brand-migration/phase-02-brand-name-migration.md) | 27 `metadata.title`, `layout.tsx:11`, `header.tsx:27`, `footer.tsx:37,93`, `privacy:8`, `sitemap:7`, `en/vi.json:1162` | Complete |
| 3 | Sora wordmark + `brand-wordmark` component | [phase-03](../260927-2100-global-theme-redesign-brand-migration/phase-03-brand-typography.md) | `layout.tsx` (Sora var on `<html>`), `globals.css` (`--font-brand`), NEW `src/components/layout/brand-wordmark.tsx`, header/footer consume it | Complete |
| 4 | Force clean rebuild | this plan | Stop dev (PID ~8900/:3000 — verify; `taskkill /PID <pid> /F` or `npx kill-port 3000`) → delete `.next/` → `npm run dev` → confirm fresh compile log | Complete |
| 5 | Test execution (mandatory) | this plan | `npm run lint` · `npm run build` (NOT while dev holds `.next`) · `npm test` · `npm run test:browser` (dev up) — report all results | Complete |
| 6 | Evidence of effect | this plan | greps + served-HTML/CSS curl + screenshots of `/vi` and checkout URL | Complete |

Order mandatory: 0 → 1 → 2 → 3 → 4 → 5 → 6. Phase 0 note: cache/HMR proven healthy (served `--primary:#171717` == compiled source) — clearing `.next` alone would change nothing; it is run AFTER edits only to guarantee fresh assets.

## Verification
```bash
grep -rn "DuanMAR" src/                                  # ≥1 (expect 31+ spots)
grep -rni "vietnam tourism" src/                          # exactly 3 approved exceptions
curl -s "http://localhost:3000/vi/booking/checkout?tour=hcm" | grep -c DuanMAR   # >0
curl -s <served-css-chunk> | grep -o '\-\-primary:[^;]*'  # crimson, not #171717
npm run lint && npm run build && npm test && npm run test:browser   # 0 failures
```
Plus screenshots: `http://localhost:3000/vi` and the checkout URL (DuanMAR visible, red CTAs).

## Rollback Plan
All changes stay uncommitted until Phase 5 passes → rollback is `git checkout -- src/ && rm -r src/components/layout/brand-wordmark.tsx` (baseline = single commit `3897afd`). If committed: `git revert <hash>`.

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Dev server port/PID differs from 8900 | Low | Discover via `netstat`/`npx kill-port 3000` |
| `npm run build` clobbers dev `.next` | Med | Stop dev before build; restart after |
| Sora vietnamese subset fails | Med | Fallback per phase-03 (`latin` only), document |
| Over-migration (URLs/emails/package.json) | High | Feature-plan out-of-scope guardrails + Phase 6 greps |

## Decisions already made (do not re-litigate)
Sora brand font; deep crimson `#B91C1C`; split destructive/primary roles; brand + visible-copy-only scope (no domain/email/`package.json`); org-name prose left unchanged.

## Post-Execution Notes
- Sora shipped with `subsets:["latin","latin-ext"]` (no vietnamese subset in Google Fonts metadata); documented in phase-03 + research-summary.
- Pre-existing failures fixed en route: `f-ui.mjs` F7 expected old `text-destructive` (updated to `text-primary`); `h4-p4-e2e.mjs` asserted day+7/+8 without navigating to their month grid (date-dependent, failed after the 23rd of a month); `revalidate-webhook.mjs` needed `SANITY_REVALIDATE_SECRET` (provisioned for dev + test processes, not written to `.env.local`).

## Unresolved Questions
1. Org-name prose (`en.json:417/988`, `about/contact/page.tsx:7`, VI equivalents) — keep unchanged? (recommended: yes)
2. `text-green-700` success at `booking-payment-section.tsx:161` — keep? (recommended: yes)
