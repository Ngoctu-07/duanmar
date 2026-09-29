# Phase 01 — Brand Rename `DuanMAR` → `DuanMar`

## Context Links
- Binding decision #4 · [plan.md](plan.md)
- Source of truth: `src/components/layout/brand-wordmark.tsx:3,5` (single UI source) + `footer.tsx:96` + 28 `metadata.title` spots + `src/messages/{en,vi}.json:1162`
- Prior rename plan: `plans/260927-2100-global-theme-redesign-brand-migration/phase-02-brand-name-migration.md`
- Changelog history to protect: `docs/project-changelog.md` lines 264, 265, 268, 271

## Overview
**Priority**: P2 (cosmetic/copy, but user-accepted AC1) · **Status**: Pending · **Effort**: ~15 min · **Files**: 32 (edit) · **New files**: 0

## Key Insights
1. Exactly **35 hits** of `DuanMAR` in `src/` (verified grep), **0** in `tests/`, `0` pre-existing `DuanMar` → rename is a pure string swap, zero test coupling.
2. Breakdown: 28 `metadata.title` (incl. `src/app/layout.tsx:17`), 4 dynamic titles (`` `${x} | DuanMAR` ``), `privacy/page.tsx:6,8`, `sitemap/page.tsx:6,7`, `brand-wordmark.tsx:3,5`, `footer.tsx:96`, `en.json:1162`, `vi.json:1162`.
3. i18n parity test (`tests/unit/i18n-parity.test.ts`) compares **keys only**, not values → JSON value swap is safe.
4. Same string exists 4× in `docs/` and 36× in `plans/` — those are history and stay untouched. `DuanMAR` also appears only inside `src/`, `docs/`, `plans/` repo-wide (verified: no hits in `public/`, `sanity/`, config).
5. Scope guard: `vietnam-tourism` identifiers (package name `vietnam-tourism`, `vietnam-tourism.com` URLs, sitemap/robots, git remote) are unrelated to this string — grep gates prove non-touch.

## Requirements
- Functional: every user-visible brand string reads `DuanMar` (metadata titles, footer copyright, wordmark, privacy/sitemap prose, EN/VI subtitle).
- Non-functional: `src/` grep `DuanMAR` = 0, `DuanMar` = 35; `docs/`+`plans/` counts unchanged (4 / 36); `npm test` parity green; no comment/trailing-whitespace churn beyond the swapped string.

## Related Code Files
- **Modify (32)**: all files returned by `grep -rl "DuanMAR" src/` (28 `src/app/**/page.tsx`, `src/app/layout.tsx`, `src/components/layout/{brand-wordmark,footer}.tsx`, `src/messages/{en,vi}.json`)
- **Create**: none
- **Delete**: none

## Implementation Steps
1. Baseline capture (for the diff gate):
   ```bash
   grep -rn "DuanMAR" src/ | wc -l      # expect 35
   grep -rn "DuanMAR" docs/ | wc -l     # expect 4 (baseline, must not change)
   grep -rn "DuanMAR" plans/ | wc -l    # expect 36 (baseline, must not change)
   ```
2. Capture the target file list first (the working tree has NO clean baseline commit — 51 paths already dirty from prior plans — so `git diff` cannot isolate this phase; grep lists are the gate):
   ```bash
   grep -rl "DuanMAR" src/ | sort > /tmp/rename-before.txt   # expect 32 files
   ```
3. Bulk replace scoped to `src/` only (word-safe, case-exact):
   ```bash
   grep -rlZ "DuanMAR" src/ | xargs -0 sed -i 's/DuanMAR/DuanMar/g'
   ```
   Fallback if `sed -i` misbehaves on this Git-Bash build: node one-liner over `grep -rl "DuanMAR" src/` files with `content.split("DuanMAR").join("DuanMar")`.
4. Verify gates:
   ```bash
   grep -rn "DuanMAR" src/ | wc -l      # 0
   grep -rn "DuanMar" src/ | wc -l      # 35
   grep -rln "DuanMar" src/ | sort | diff - /tmp/rename-before.txt   # no diff (same 32 files)
   grep -rn "DuanMAR" docs/ | wc -l     # 4 (unchanged)
   grep -rn "DuanMAR" plans/ | wc -l    # 36 (unchanged)
   grep -rn "vietnam-tourism" package.json   # unchanged
   grep -rn "DuanMAR" tests/ sanity/ public/ # 0 hits (never existed)
   ```
5. Spot-check the 7 non-title hits (`brand-wordmark.tsx:3,5`, `footer.tsx:96`, `privacy:8`, `sitemap:7`, `en.json:1162`, `vi.json:1162`) read correctly in Vietnamese context (`"Mọi phần của DuanMar tại một nơi"`).
6. Smoke: `npm run lint` + `npm test` (parity) — defer full browser suite to phase-05.

## Todo List
- [ ] Capture baseline grep counts (35 / 4 / 36) + target file list (32)
- [ ] Run scoped bulk replace in `src/`
- [ ] Re-run verification gates (0 / 35 / 4 / 36 + file-list diff)
- [ ] Spot-check 7 non-title hits + wordmark render
- [ ] `npm run lint` + `npm test`

## Success Criteria
- `grep -rn "DuanMAR" src/` → 0; `DuanMar` → 35 across the same 32 files; `docs/`=4 and `plans/`=36 unchanged.
- `grep -rl "DuanMar" src/` file list identical to pre-replace list — proves no file outside `src/` was touched (working tree has no clean baseline, so grep gates replace `git diff` gates).
- Lint + unit tests (11/11) green.

## Risk Assessment
- **R1**: partial replace leaving a mixed brand string → mitigation: 0/35 count gates + `grep -rln "DuanMar" src/ | wc -l` = 32.
- **R2**: `sed -i` creating backup files (BSD-style) → mitigation: `grep -rl` output checked for `*-e`/`-*` artifacts; node fallback if seen.
- **R3**: accidental edit outside `src/` → mitigation: `docs/`/`plans/` counts before/after + file-list diff; `package.json`/`.git/config` grep.
- **R4**: dirty baseline (51 paths already modified, single `init` commit) means this phase's edits are mixed into an uncommitted tree → mitigation: rely on the count gates above, and do **not** commit (repo rule: commit only on explicit request).

## Security Considerations
- Copy-only change: no secrets, no auth, no URLs rewritten. Git remote and `vietnam-tourism.com`/`@vietnam-tourism.com` identifiers explicitly excluded (grep-verified).

## Next Steps
- Phase-02 (color tokens) — independent; runs after so per-phase grep gates stay separable.

