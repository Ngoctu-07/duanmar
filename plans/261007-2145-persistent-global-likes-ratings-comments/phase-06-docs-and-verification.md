# Phase 06 — Documentation & verification

## Context Links
- `docs/project-changelog.md` (append feature entry), `docs/vietnam-tourism-website-framework.md` (only if it documents likes/reviews flows — verified: no current localStorage flow docs)
- `docs/ai-assistant.md` (IP trust assumption note — reword only if the helper moved files)
- `.claude/rules/documentation-management.md` (changelog/roadmap triggers), `development-rules.md` (pre-commit: lint + tests)

## Overview
- **Priority**: P1
- **Status**: Not started
- **Description**: Record the refactor in project docs and run the full verification gate (lint, typecheck, build, unit, browser) before handing off.

## Key Insights
- Verification order matters: `tsc` fast-fail → lint → unit → build → browser (needs `npm run dev`).
- Changelog style in this repo: `[Feature]`/`[Refactor]` bullet with plan id, file/LOC deltas, test counts, verification line (follow entries near lines 288-315).

## Requirements
- [ ] Changelog entry for plan `261007-2145-persistent-global-likes-ratings-comments` (schema, routes, client changes, migration, tests, verification numbers).
- [ ] Docs impact statement: `Docs impact: minor` (changelog + possible one-line framework note).
- [ ] All gates green: lint 0, tsc 0, build 0, unit 100%, browser 100%.

## Architecture
Not applicable (documentation/verification only).

## Related Code Files
**Create**: none
**Modify**: `docs/project-changelog.md` (+ `docs/ai-assistant.md` / `docs/vietnam-tourism-website-framework.md` only if wording is now wrong)
**Delete**: none

## Implementation Steps
1. `npx tsc --noEmit` → fix any type errors.
2. `npm run lint` → 0 errors (no new warnings from touched files).
3. `npm test` → all unit files pass; record count.
4. `npm run build` → exit 0; confirm `/[locale]/blog`, `/[locale]/blog/[slug]`, `/[locale]/explore/destinations/[slug]` are dynamic (`ƒ`) and the 3 API routes are present.
5. `npm run dev` + `npm run test:browser` → all browser files pass; record counts and screenshots (`tests/.output`).
6. Manual spot checks (curl): POST like 200/400/413/429, GET likes batch 200, GET reviews 200 (no `authorEmail`), POST review 400 on bad payload, DELETE foreign review 403, GET ratings avg correct.
7. Append changelog entry; update `plans/…/plan.md` phase statuses to Complete.
8. Optional: `/ck:code-review` on the diff before commit (per primary workflow step 3).

## Todo List
- [ ] tsc / lint clean
- [ ] `npm test` green
- [ ] `npm run build` green + route dynamism verified
- [ ] `npm run test:browser` green
- [ ] curl smoke of new endpoints
- [ ] `docs/project-changelog.md` entry
- [ ] plan statuses updated

## Success Criteria
- All commands exit 0 with recorded numbers in the changelog entry.
- No doc contradicts the new behavior (localStorage references for likes/reviews removed or marked migrated).

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Build-time page data baking stale counts | Medium | cookie read forces dynamic; verify `ƒ` markers in build log |
| Browser suite depends on running dev server | Low | documented pre-step; runner already validates :3000 |

## Security Considerations
- Confirm no secrets/env values committed; `data/` stays gitignored; changelog contains no PII or cookies.

## Next Steps
- Commit (conventional message, e.g. `refactor: persist likes, ratings and comments in sqlite`) only when explicitly requested.
