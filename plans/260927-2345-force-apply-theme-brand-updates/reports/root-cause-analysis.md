# Root Cause Analysis — Theme/Brand Update Not Reflected

**Date**: 2026-09-27 · Work context `D:\tour` · Symptom URL: `http://localhost:3000/vi/booking/checkout?tour=hcm`

## Symptom
User ran the Red/Black global theme + "DuanMAR" rebrand prompt; page still shows legacy grayscale styling and "Vietnam Tourism". User suspects: wrong config file, replacement only in hidden assets, build/HMR cache.

## Evidence (verified)
1. **Git**: `git status --porcelain` → only `?? plans/260927-2100-global-theme-redesign-brand-migration/` (untracked). `git diff --stat` → empty. `git log --oneline` → single commit `3897afd init`. `git stash list` → empty. → **Zero code changes exist in the working tree or history.**
2. **Source still legacy**: `src/app/globals.css:57` → `--primary: oklch(0.205 0 0)` (grayscale). `grep -rn "DuanMAR" src` → 0 hits.
3. **Brand untouched**: `src/components/layout/header.tsx:27`, `footer.tsx:37,93`, `src/app/layout.tsx:11` all still "Vietnam Tourism".
4. **Live output matches source**: `curl localhost:3000/vi/booking/checkout?tour=hcm` → 6× "Vietnam Tourism", 0× "DuanMAR". Served CSS chunk `--primary: #171717` == compiled form of `oklch(0.205 0 0)` → **dev server output matches source; compile/HMR pipeline healthy, not stale.**
5. **No theme/brand edit anywhere in git history.**

## Suspects — disproven
| Suspect | Verdict |
|---|---|
| Wrong config file | **No** — Tailwind v4 CSS-first: palette lives in `src/app/globals.css` (`:root` L50-83 + `@theme inline` L7-48); no `tailwind.config.js`, no theme provider (research §1.1). Correct target, simply never edited. |
| Replacement only in hidden assets | **No** — brand is plain source text: `header.tsx:27`, `footer.tsx:37,93`, `layout.tsx:11`, 27 `metadata.title`, `en/vi.json:1162`; `public/` is empty (research §2.4). Targets are real source files, all unchanged. |
| Build/HMR cache stale | **No** — served `--primary: #171717` is exactly the compiled output of the current source `oklch(0.205 0 0)`; served HTML == source. Pipeline fresh; clearing `.next` alone would change nothing. |

## Root Cause
**The update was never written to the working tree.** Only the feature plan was drafted (`plans/260927-2100-global-theme-redesign-brand-migration/`, untracked, status "Planning — ready to execute") and it was awaiting approval — no implementation occurred. The prompt's outputs were never applied; nothing downstream (build, HMR, assets) is at fault.

## Fix (linked plan)
Execute the feature plan phases verbatim (color palette → brand migration → Sora wordmark), then force clean rebuild + tests + evidence capture. See [../plan.md](../plan.md) Phases 0-6.

## Impact
- Severity: High (feature completely absent) · Root cause category: process (plan approved? no — execution never started), not code defect.
- No data/security impact; no rollback risk (baseline = `3897afd`, changes uncommitted until tests pass).

## Unresolved Questions
1. Confirm org-name prose stays unchanged (recommended: yes).
2. Confirm `text-green-700` success color kept (recommended: yes).
