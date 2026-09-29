# Phase 02 — Tests, Verification Pipeline, Changelog

**Status**: Complete · **Priority**: P2 · **Depends on**: P1 (`phase-01-schema-frontend.md`)

## Context Links
- **Plan**: `plan.md` (binding decisions 5, 6 + Global Verification) · sibling: `phase-01-schema-frontend.md`
- **Rules**: `.claude/rules/development-rules.md` (no fake data/mocks to pass builds, lint+tests before ship) · `.claude/rules/documentation-management.md:70-121` (this 12-section structure) · `CLAUDE.md` (compile check after code changes)
- **Helper under edit**: `tests/helpers/promo.mjs` — `dismissPromo` `:1-19`; `waitForSelector('[data-slot="promo-modal"]', { timeout: 10000 })` `:3`; silent `catch → return` `:4-6`; close = `closeSlot` click → Escape fallback `:7-9`; gone-check = promo node AND `dialog-overlay` node both absent `:10-18`. **38 call sites / 14 browser files** (c-booking 6, f-ui 7, g-reviews 4, n-lightbox 4, g-header 3, j-about 3, h4-p4 2, k-review 2, l-navbar 2, c-payment 1, d8-a11y 1, m-footer 1, o-footer 1, p-tours 1; `revalidate-webhook.mjs` 0)
- **Overlay slots**: `src/components/ui/dialog.tsx:29` `data-slot="dialog-overlay"`, `:65` `data-slot={closeSlot}` (promo passes `promo-modal-close`, `promo-modal.tsx:26`)
- **Runners (NEVER edit)**: `tests/run-unit.mjs:17-19` auto-globs `*.test.{ts,mts}` sorted (**15 today → 16**) · `tests/run-browser.mjs:23-25` globs `*.mjs` sorted (**15 today → 16**; `r-entry-popup-cms.mjs` sorts before `revalidate-webhook.mjs` because `-` (0x2D) < `e`)
- **Unit pattern to copy**: `tests/unit/tour-category-queries.test.mts` — dynamic `await import("…queries/….ts")` `:3-12`, `check()` accumulator `:14-25`, substring/GROQ-contract asserts incl. no-ternary + balanced parens `:102-110`, `process.exit(failed===0…)` `:113`. Query module import is safe (only `next-sanity` `defineQuery` + local `fragments/image` — no client/env)
- **Live-CMS pattern to copy**: `tests/helpers/cms-expectations.mjs:12-20` (`envValue` = process env → `.env.local` names), `:27-42` (unauthenticated `https://<projectId>.api.sanity.io/v2026-09-25/data/query/<dataset>` + `AbortSignal.timeout(15000)`); browser-local copy precedent `tests/browser/p-tours-category.mjs:19-43`; harness boilerplate `p-tours-category.mjs:1-54,274-286` (Puppeteer `getBrowser/getPage/closeBrowser`, `check()`, `pageerror` listener, exit-1)
- **i18n**: `promo` namespace `src/messages/{en,vi}.json:1256-1260` — r-test reads `msg.vi.promo.imageAlt` at runtime (parity test `tests/unit/i18n-parity.test.ts:43-58` untouched: **0 new keys**)
- **Changelog**: `docs/project-changelog.md` — `## 2026-09-28` `:261`, file **370 lines**; append `### Changed` at EOF (house precedent, e.g. booking entry `:362-370`). Helper/spec-change precedents: F7 `:270`, B6 `:296`, j-about-contact patch `:321`, booking "sửa test cũ theo spec, có ghi nhận" `:368`
- **Baseline gates**: lint 0 · tsc 0 · unit **15/15 files** · build 0 · browser **14/15** (sole fail `revalidate-webhook.mjs` = `SANITY_REVALIDATE_SECRET` missing in test process, self-reported `:36-40`, pre-existing — NEVER edit)

## Overview
- **Priority**: P2 (terminal phase — tests, full pipeline, changelog, status flips, code review)
- **Current status**: Complete
- **Brief description**: Cut the `dismissPromo` timeout (spec-change), add one GROQ-contract unit test + one data-driven browser test for the CMS-driven popup, run the mandated verification pipeline, append the changelog entry, flip plan statuses, and delegate code review.

## Key Insights
- **Absence becomes the DEFAULT state**: dataset has no `siteConfiguration` doc → after P1 the modal never renders → every one of the 38 `dismissPromo` calls burns the FULL timeout. Untouched: 38 × 10 s ≈ **380 s (6.3 min)** of pure waiting per browser run. With `timeout: 2000`: worst case 38 × 2 s = **76 s**. The edit is mandatory for suite health, not cosmetic.
- **Fast path unchanged**: `waitForSelector` resolves the instant the modal exists → when marketing enables the popup, cost per call stays ~0; 2 s only bounds the absent/late case.
- **r-test must be data-driven**: asserting "modal present" fails today (no doc); asserting "modal absent" fails the day marketing uploads. Fetch the live doc first, derive mode, then branch (precedent: `p-tours-category.mjs` sets, `c-booking.mjs` `SPECIAL` flag).
- **`next/image` rewrites the src**: a remote `cdn.sanity.io` URL renders as `/_next/image?url=<encoded>` — a naive `src.startsWith("https://cdn.sanity.io/")` would ALWAYS fail. Assert `decodeURIComponent(img.src).includes(liveAssetUrl)` + `!src.includes("images/promo-modal.png")` (the literal `cdn.sanity.io` hostname survives `encodeURIComponent` too).
- **Hydration timing**: the modal opens in a post-hydration effect (`promo-modal.tsx:17-20`); negative checks wait a bounded 3 s window for a node that must NOT appear, then count zero — otherwise "absent at snapshot" could pass before hydration even ran.
- **Cache skew (300 s)**: `fetchPublished` (`fetch-published.ts:43`) caches page data while the r-test reads live CMS → publishing a doc can flip mode before the dev server notices. Mitigation: failure detail prints both mode + doc `_updatedAt`; re-run (or restart dev) rather than weaken the assertion.
- **Suite counts are auto-discovered** — no runner edits; totals documented so the pipeline expectations (16/16 unit, 16/17 browser) are unambiguous.

## Requirements
### Functional
- FR1: `tests/helpers/promo.mjs:3` — `timeout: 10000` → `timeout: 2000`. **Timeout line only**; signature, selectors, fallback order, gone-check untouched.
- FR2: NEW `tests/unit/site-configuration-query.test.mts` — 7 GROQ-contract checks on `SITE_CONFIGURATION_QUERY`, no network, no env.
- FR3: NEW `tests/browser/r-entry-popup-cms.mjs` — fetch live `siteConfiguration` via `envValue` + unauthenticated GROQ; branch on derived mode; exact check names below; 0 fabricated data.
- FR4: Changelog EOF `### Changed` entry (VN, house style, `Verified:` + `Docs impact: minor`) documenting the helper timeout as a **spec-change**.
- FR5: Flip `plan.md` + both phase files → Status **Complete** / Progress **100%**; write `reports/plan-summary.md` with actuals.
- FR6: Delegate `code-reviewer` on the final diff.
### Non-functional
- NF1: Gates — lint exit 0 · `npx tsc --noEmit` 0 · unit **16/16** · build exit 0 · browser **16/17** (sole tolerated fail = `revalidate-webhook`; 17 = 15 baseline + `q-footer` (footer feature, same session) + `r-entry-popup-cms`).
- NF2: `promo.mjs` content-inspection vs plan baseline = exactly ONE changed line (`timeout`); file untracked in single-commit tree so no `git diff` line exists — other `git diff tests/` files belong to earlier uncommitted features. New files = 2 (`site-configuration-query`, `r-entry-popup-cms`); `git diff src/` for this feature = P1 allow-list only.
- NF3: No new dependencies, no i18n changes, no runner changes, no edits to any other test.

## Architecture
- **Data flow**:
  ```
  live CMS (published siteConfiguration) ──GROQ──▶ r-entry-popup-cms.mjs
        │  doc? enableEntryPopup!==false? asset.url?
        ▼
  mode = enabled | disabled ──▶ branch assertions vs dev server :3000
        enabled:  modal present → img decodes to live asset.url → close → nav works
        disabled: 0 promo-modal + 0 dialog-overlay after 3s window → nav works
  ```
- **Component interactions**: tests are read-only w.r.t. app code; only `promo.mjs` (shared helper) changes by one token (`10000` → `2000`), which every existing call site inherits with zero code churn.
- **Why no existing test breaks**: 0 existing assertions target modal presence/image (grep `promo-modal` over `tests/` = helper only) → all callers are setup-lines that silently pass either mode.

## Related Code Files
**Create**
- `tests/unit/site-configuration-query.test.mts` (~70 LOC, no network)
- `tests/browser/r-entry-popup-cms.mjs` (~180 LOC, single file)
**Modify**
- `tests/helpers/promo.mjs` — line `:3` only (`10000` → `2000`)
- `docs/project-changelog.md` — EOF append (`### Changed`, under `## 2026-09-28` `:261`, after line 370)
- `plan.md` + `phase-01-schema-frontend.md` + this file + `reports/plan-summary.md` — status flips / actuals
**Delete**: none.
**NEVER touch**: `tests/run-unit.mjs`, `tests/run-browser.mjs`, `tests/browser/revalidate-webhook.mjs`, any other existing test, `public/images/promo-modal.png`, `promo-video.tsx`, `header.tsx`, `src/messages/*`, any `src/` file (P1 owns those).

## Implementation Steps
1. **Helper timeout** — `tests/helpers/promo.mjs:3`: `{ timeout: 10000 }` → `{ timeout: 2000 }`. Verify `git diff tests/helpers/promo.mjs` = that single line.
2. **Unit test** `tests/unit/site-configuration-query.test.mts` — copy harness from `tour-category-queries.test.mts:14-25,112-113`; `await import("../../src/sanity/queries/site-configuration.ts")`; 7 checks with EXACT names:
   1. `SITE_CONFIGURATION_QUERY exported and non-empty`
   2. `singleton accessor: _type == "siteConfiguration" + [0]`
   3. `projects enableEntryPopup`
   4. `projects entryPopupImage with image fragment (url + metadata)`
   5. `no $ params (layout call site passes {})`
   6. `no ternary (GROQ parse safety)`
   7. `balanced parens`
3. **Run unit suite**: `npm test` → **16/16** (15 existing + new; run auto-discovers, no runner edit).
4. **Browser test** `tests/browser/r-entry-popup-cms.mjs` — copy boilerplate `p-tours-category.mjs:1-54,274-286`; local `envValue` (`:19-28` copy); `fetchSiteConfig()` = GROQ `*[_type == "siteConfiguration"][0]{ enableEntryPopup, entryPopupImage{ asset->{ url, metadata{ dimensions{ width, height } } } } }` against `api.sanity.io`; derive `enabled = doc && doc.enableEntryPopup !== false && !!asset.url`; log mode + `_updatedAt`. Flow = R1 → mode branch → screenshot → R11. Check names:
   - **Always**: `R1 live siteConfiguration query succeeds (env projectId + .env.local fallback)` · `R11 zero uncaught pageerrors`
   - **Enabled branch**: `R2 modal [data-slot="promo-modal"] appears after load` (waitForSelector ≤10 s, exactly 1 node) · `R3 modal img decodes to live CMS asset.url (cdn.sanity.io) — never /images/promo-modal.png` (`decodeURIComponent(img.getAttribute("src"))` contains live URL; rejects `images/promo-modal.png`) · `R4 img loaded (naturalWidth>0) + width/height attrs == CMS metadata dimensions` (fallback 1200×800 when metadata absent) · `R5 img alt == vi promo.imageAlt` (read `msg.vi.promo.imageAlt` from `vi.json`) · `R6 close button dismisses modal + overlay` (click `[data-slot="promo-modal-close"]`, wait promo + `dialog-overlay` gone — same gone-predicate as `promo.mjs:10-12`) · `R7 page interactive after dismiss` (click `header a[href="/vi/tours/domestic"]` → pathname lands `/vi/tours/domestic`; SPA nav keeps layout → popup stays closed, `changelog:281`)
   - **Disabled/absent branch**: `R8 zero [data-slot="promo-modal"] after 3s hydration window` (bounded `waitForSelector(…,3000).catch(null)` then count 0) · `R9 zero [data-slot="dialog-overlay"] after 3s hydration window` · `R10 page interactive with popup suppressed` (same header-nav click)
   - Screenshot both modes → `tests/.output/r-entry-popup-01-{enabled|disabled}.png`
5. **Standalone run**: `node tests/browser/r-entry-popup-cms.mjs` vs dev `:3000` until all `ok`. If mode mismatch vs live doc → print doc + `_updatedAt` in `detail`, restart dev (clears 300 s cache), re-run — never hardcode the mode.
6. **Mandated pipeline (exact order)**:
   1. `npm run lint` → exit 0
   2. `npx tsc --noEmit` → 0 errors
   3. `npm test` → **16/16**
   4. **Stop dev on `:3000`** (build wipes `.next` while dev runs — `changelog:13`)
   5. `npm run build` → exit 0
   6. Restart dev: `(npm run dev > /c/Users/Lenovo/AppData/Local/Temp/next-dev.log 2>&1 &)`
   7. `npm run test:browser` → 17 files → expect **16/17**, sole fail `revalidate-webhook.mjs` (missing `SANITY_REVALIDATE_SECRET`, pre-existing, untouched)
   8. Eyeball `/en` + `/vi`: popup behavior matches the live config (absent today = AC3)
7. **Regression proof**: `git diff tests/` shows only the timeout line + 2 new files; existing suites (`f-ui`, `g-reviews`, `p-tours`, `l-navbar`, `m-footer-brand`…) green with 0 edits.
8. **Changelog** — append at EOF (VN, house pattern; full draft in `Success Criteria` context below):
   - Header: `### Changed` then `- **[CMS/Feature] Promo modal CMS-driven: singleton siteConfiguration + server fetch** (plan \`260928-2320-promo-modal-cms-driven\`)`
   - Sub-bullets: AC1 schema+register+singleton structure · AC2 query+layout fetch+props+dynamic `<Image>` (file `promo-modal.png` GIỮ vì còn là poster `promo-video.tsx:8`) · AC3 `null` degradation · Tests (NEW unit 7 checks + NEW r-test data-driven; **spec-change** helper `10000→2000` với math 38×10s≈6.3 phút → 76s, precedent F7/B6/j-about-contact) · ends `  - Verified: …` + `  - Docs impact: minor`
9. **Status flips + summary**: `plan.md` + 2 phases → Complete/100%; write `reports/plan-summary.md` (actual counts, evidence paths, open questions).
10. **Code review**: delegate `code-reviewer` with work context `D:\tour`, reports `D:\tour\plans\reports\`, plan dir path; address blockers before closing.

## Todo List
- [x] `promo.mjs:3` timeout `10000` → `2000` (single-line diff)
- [x] Create `tests/unit/site-configuration-query.test.mts` (7 named checks)
- [x] `npm test` → 16/16
- [x] Create `tests/browser/r-entry-popup-cms.mjs` (R1–R11 per branch, data-driven)
- [x] Standalone r-test → all `ok` (5/5 disabled before publish, 8/8 enabled after)
- [x] Pipeline: lint 0 → tsc 0 → unit 16/16 → stop dev → build 0 → restart dev → browser 16/17 → eyeball
- [x] `git diff tests/` = timeout line + 2 new files only (other diffs = prior uncommitted features, single-commit repo)
- [x] Changelog EOF `### Changed` (VN, `Verified:`, `Docs impact: minor`, helper spec-change noted)
- [x] Flip plan/phase statuses → Complete; write `reports/plan-summary.md`
- [x] Delegate `code-reviewer`; resolve blockers

## Success Criteria
- `npm run lint` exit 0 · `npx tsc --noEmit` 0 · `npm test` **16/16** · `npm run build` exit 0 · `npm run test:browser` **16/17** (sole fail = `revalidate-webhook`, env pre-existing) · `sanity schemas validate` 0 errors (P1 gate, re-confirmed).
- r-test proves BOTH branches against live data (which branch runs depends on the dataset — never hardcoded); enabled branch proves the img is a `cdn.sanity.io` asset and never `/images/promo-modal.png`.
- `git diff` respects the allow-list; 0 edits to runners / other tests / i18n / assets.
- Changelog entry ends with `Verified:` + `Docs impact: minor`.

**Changelog draft (paste, then fill `Verified:` from actuals)**:
```markdown
### Changed
- **[CMS/Feature] Promo modal CMS-driven: singleton `siteConfiguration` + server fetch** (plan `260928-2320-promo-modal-cms-driven`)
  - AC1 schema: NEW `src/sanity/schemaTypes/site-configuration.ts` (`siteConfiguration`, "Site Configuration") — `entryPopupImage` image hotspot optional (title "Promo Modal Asset") + `enableEntryPopup` boolean `initialValue:true` (mô tả: tắt là ẩn entry popup) · register `schemaTypes/index.ts` (4 → 5 type — precedent `changelog:21`) · `structure.ts` singleton item ĐẦU TIÊN `S.document().schemaType('siteConfiguration').documentId('siteConfiguration')` + `.filter()` khỏi `documentTypeListItems()` (title "Content" giữ nguyên)
  - AC2: NEW `src/sanity/queries/site-configuration.ts` (`*[_type=="siteConfiguration"][0]{ enableEntryPopup, entryPopupImage { imageFragment } }`, 0 param, no ternary) · `src/app/[locale]/layout.tsx` (server) `fetchPublished(…, {tags:["sanity:siteconfig"]})` → props `imageSrc` + `width/height` từ `asset.metadata.dimensions` (fallback 1200×800) + `enableEntryPopup` → `promo-modal.tsx` render `<Image src={asset.url}>`, alt giữ i18n `promo.imageAlt` (0 key mới) — hardcode `/images/promo-modal.png` bỏ khỏi modal, **FILE GIỮ** (còn là poster `promo-video.tsx:8`)
  - AC3: `enableEntryPopup === false || !imageSrc` → return **null** (vắng doc / vắng ảnh / false rõ ràng = ẩn; không broken img, không hộp rỗng) — sau khi merge popup TẠM ẩn đến khi marketing upload ảnh trong Studio (EXPECTED)
  - Tests: NEW unit `tests/unit/site-configuration-query.test.mts` (7 contract checks, 0 network) + NEW browser `tests/browser/r-entry-popup-cms.mjs` (data-driven GROQ live: enabled → modal + img là CDN asset + close dismiss + nav hoạt động; disabled/absent → 0 `[data-slot="promo-modal"]` + 0 overlay + nav hoạt động) · **spec-change**: `tests/helpers/promo.mjs` `timeout:10000` → `2000` (38 call sites × 10s ≈ 6.3 phút suite burn khi modal vắng → 76s worst case; fast path giữ nguyên; precedent F7/B6/j-about-contact) — 0 sửa test khác
  - Verified: lint exit 0 · tsc 0 · `npm test` **16/16** · `npm run build` exit 0 · `npm run test:browser` **15/16** (fail duy nhất `revalidate-webhook` = env pre-existing) · `sanity schemas validate` 0 errors · evidence `tests/.output/r-entry-popup-01-*.png`
  - Docs impact: minor (changelog này + plan statuses)
```

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| Modal absent → 38 × full-timeout burn | +6.3 min/run | Helper timeout 2 s (decision 5, FR1) → worst case 76 s; mandatory before first post-P1 browser run |
| Hydration slower than 2 s while popup ENABLED | `dismissPromo` returns early → overlay blocks later clicks → flake | Popup is disabled-by-default (absent) today; local hydration ≪ 2 s after `networkidle2`; if flake observed → bump to 3000 + changelog note |
| r-test mode flips mid-run (300 s `fetchPublished` cache vs live GROQ) | False FAIL | `detail` prints mode + `_updatedAt`; restart dev / re-run; NEVER weaken assertion or hardcode mode |
| `next/image` optimizer URL breaks `startsWith` assert | False FAIL | `decodeURIComponent(src)` contains live `asset.url`; hostname `cdn.sanity.io` also survives encoding |
| Negative-branch check races hydration | False PASS | Bounded 3 s wait for a node that must NOT appear before counting zero |
| Suite totals shift 15→16 both runners | Confusion on gate numbers | Documented everywhere: unit 16/16, browser 15/16 expected |
| `revalidate-webhook` failure mistaken for regression | Noise | Pre-existing, self-reports missing secret `:36-40`; NEVER edit |
| Windows build/dev conflict | Corrupt `.next` | Stop dev before build (`changelog:13`), restart via mandated command |

## Security Considerations
- **Data access**: r-test reads only the public published GROQ endpoint (no token, no write), uses `.env.local` for `projectId`/`dataset` **names** only — no secrets logged or committed.
- **No credential changes**: no new env vars, no Studio token, `revalidate-webhook.mjs` (secret-gated) untouched.
- **No app-surface exposure**: image URL already constrained by `next.config.ts:25` `remotePatterns` allow-list (P1); helper edit changes a test-only timeout.

## Next Steps
- **Dependencies**: P1 complete (query export + live behavior in place) before steps 2–5.
- **Follow-up**: `reports/plan-summary.md` actuals → code review → session close.
- **Operational**: marketing publishes `siteConfiguration` + uploads asset to re-enable the popup; thereafter only the r-test's enabled branch exercises until then (disabled branch is the expected run today).
