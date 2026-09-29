# Plan Summary — Promotional Modal CMS-Driven (Dynamic Campaign Asset)

**Date**: 2026-09-28 · **Plan**: `plans/260928-2320-promo-modal-cms-driven/` · **Status**: Complete (100%)

## Scope
Refactor the entry promotional modal from a hardcoded `public/images/promo-modal.png` to a CMS-managed campaign asset: NEW Sanity **global singleton** `siteConfiguration` (`entryPopupImage` image + `enableEntryPopup` boolean, default true) so marketing swaps or disables the popup between campaigns without a deploy. `src/app/[locale]/layout.tsx` (server) fetches via `fetchPublished` + passes props; `promo-modal.tsx` (client) renders the dynamic asset and returns **`null`** when disabled or no image (AC3 graceful degradation — no broken img, no empty box). Plus: helper timeout spec-change, 2 new tests, full pipeline, changelog. 0 deletes, 0 new deps, 0 i18n changes.

## Phases
| # | Phase | Deliverable | Status |
|---|-------|-------------|--------|
| 1 | `phase-01-schema-frontend.md` | `site-configuration.ts` schema + register `index.ts` (4→5) + `structure.ts` singleton-first + `.filter()` dedupe · NEW `queries/site-configuration.ts` · layout server fetch (`tags:["sanity:siteconfig"]`) → props (`imageSrc`, `width/height` from `metadata.dimensions` fallback 1200×800, `enableEntryPopup`) · `promo-modal.tsx` props + `null` guard (after hooks) + dynamic `<Image>`. Gates: `sanity schemas validate` / tsc / lint. | **Complete 100%** |
| 2 | `phase-02-tests-pipeline-changelog.md` | `promo.mjs:3` `timeout 10000→2000` (spec-change) · NEW `tests/unit/site-configuration-query.test.mts` (7 checks) · NEW `tests/browser/r-entry-popup-cms.mjs` (R1–R11 data-driven live GROQ) · mandated pipeline (lint → tsc → unit **16/16** → stop dev → build → restart dev → browser **16/17** → eyeball) · changelog EOF `### Changed` · status flips · `reports/plan-summary.md` · code-review delegation. | **Complete 100%** |

## Binding decisions (do not re-ask)
1. **Fetch = server** in `layout.tsx` via `fetchPublished(SITE_CONFIGURATION_QUERY, {}, {tags:["sanity:siteconfig"]})`; client gets plain props; NO client-side GROQ / raw `client.fetch`.
2. **Toggle semantics**: show only when `enableEntryPopup !== false && imageSrc`; absent doc / absent image / explicit false → `null`; schema `initialValue:true` = "default true" for newly created docs.
3. **Schema**: `siteConfiguration` (file `site-configuration.ts`), title "Site Configuration"; `entryPopupImage` (image, hotspot) + `enableEntryPopup` (boolean, `initialValue:true`); register in `index.ts`; `structure.ts` FIRST singleton item (fixed `documentId('siteConfiguration')`) + filter from auto list; list title stays "Content".
4. **Alt text**: keep i18n `promo.imageAlt` (0 new keys → parity untouched); width/height from CMS metadata; `className` stays `h-auto w-full rounded-lg`.
5. **Helper timeout**: `tests/helpers/promo.mjs:3` `10000 → 2000` (spec-change, changelog-documented per precedent F7 `changelog:270` / B6 `:296` / j-about-contact `:321` / booking `:368`); fast path unchanged; Do NOT change call signature/behavior otherwise.
6. **Tests**: 1 unit query-contract file + 1 data-driven browser file; **zero** edits to existing tests except the helper timeout line.
7. **Out of scope (YAGNI)**: no dismiss persistence/storage, no schedule/frequency, no video asset type, no image `alt` subfield, no `promo-video` poster change, no i18n changes, no new deps.

## Risks
- **No `siteConfiguration` doc in dataset** → popup hidden by default after merge. **EXPECTED per AC3**; marketing uploads in Studio to re-enable. Changelog must call this out.
- **Suite-timeout math**: 38 `dismissPromo` call sites × 10 s ≈ **6.3 min** burned per run if modal absent → decision 5 caps worst case at **76 s**; fast path (modal present) unchanged. Helper edit is mandatory, not cosmetic.
- **Singleton = first-in-repo pattern**: structure needs BOTH `S.document()` item AND `.filter()` (else doc listed twice); registration miss = invisible Studio type (past bug `changelog:21` → count must go 4→5).
- **`next/image` optimizer URL**: rendered `src` is `/_next/image?url=<encoded>` → r-test must assert via `decodeURIComponent`, not `startsWith("https://cdn.sanity.io/")`.
- **300 s `fetchPublished` cache vs live GROQ** in r-test → mode skew after a Studio publish; rerun/restart dev, never hardcode mode.
- **`revalidate-webhook`**: expected sole browser failure (missing `SANITY_REVALIDATE_SECRET`, pre-existing) — never edit.

## Verification gates (mandated order)
`npm run lint` (0) → `npx tsc --noEmit` (0) → stop dev `:3000` → `npm test` (**16/16**) → `npm run build` (0) → restart dev `(npm run dev > /c/Users/Lenovo/AppData/Local/Temp/next-dev.log 2>&1 &)` → `npm run test:browser` (**15/16**, sole fail `revalidate-webhook`) → eyeball `/en` + `/vi` → `sanity schemas validate` 0 errors → `git diff` vs allow-list → code-review delegation.

## File allow-list
- **Create**: `src/sanity/schemaTypes/site-configuration.ts` · `src/sanity/queries/site-configuration.ts` · `tests/unit/site-configuration-query.test.mts` · `tests/browser/r-entry-popup-cms.mjs` · plan dir (4 files)
- **Modify**: `src/sanity/schemaTypes/index.ts` · `src/sanity/structure.ts` · `src/app/[locale]/layout.tsx` · `src/components/layout/promo-modal.tsx` · `tests/helpers/promo.mjs` (timeout line ONLY) · `docs/project-changelog.md` · plan files
- **Delete**: 0. **NEVER**: `public/images/promo-modal.png` (poster `promo-video.tsx:8`), runners, `revalidate-webhook.mjs`, other tests, `header.tsx`, i18n files, `promo-video.tsx`.

## Docs impact
minor — changelog EOF `### Changed` (VN, `Verified:`, `Docs impact: minor`) + plan status flips + this summary.

## Open questions (defaults chosen — flag only to override)
1. Singleton `documentId` = `siteConfiguration` · cache tag = `sanity:siteconfig` · intrinsic fallback 1200×800 · helper timeout = 2000 ms.
2. r-test "page interactive" = header nav link (`/vi/tours/domestic`) clickable/navigating after load.
3. Which r-test branch runs today — **answer: BOTH**. First standalone run = **disabled/absent** (no doc, 5/5). Marketing then published the doc + a 1376×768 asset (18:17Z) mid-session → subsequent runs take **enabled** branch (8/8). Mode derived live, never hardcoded.

## Actual results (post-implementation)
- **P1**: schema 24 LOC (`site-configuration.ts`) · registry types 4→5 · `structure.ts` singleton-first via `S.listItem().child(S.document()…)` — direct `S.document()` item rejected by `tsc` (TS2322, not a list item) → listItem+child pattern (deviation from plan sketch, same behavior) · `sanity schemas validate` 0 errors/0 warnings · tsc 0 · lint 0.
- **P2**: helper diff = one line (`10000`→`2000`) · unit **16/16** (new file 7/7) · build 0 (dev stopped/restarted) · browser **16/17** files (suite grew 15→17: +`q-footer` from footer feature, +`r-entry-popup`; sole fail `revalidate-webhook` env) · r-test standalone **5/5 disabled** (pre-publish) + **8/8 enabled** (post-publish, R4 added bounded CDN-load wait — image raced `naturalWidth` on first enabled run) · evidence `tests/.output/r-entry-popup-01-enabled.png` (eyeball: campaign asset from cdn.sanity.io renders, close button top-right).
- **Incidents**: `p-tours` failed once inside the cold suite run (no check-level FAIL printed → fatal path) then passed standalone 22/22 and in warm suite re-run → transient (cold compile/network), not caused by feature.
- **Code review**: **DONE — APPROVE with minor** (0 P1, 1 P2, 7 P3). P2 = root-layout CMS fetch lacks request timeout (hang mode; recorded in plan.md Key Risks as follow-up — `AbortSignal.timeout` hardening outside this allow-list). P3s actioned: r-test R1 real-failure path + wait guard, changelog call-site count 38→39, plan docs browser counts → 16/17, NF2 claim reworded; P3s deferred: VI description gloss, Studio eyeball evidence (structure verified by tsc + reviewer), `Promise.all` micro-latency.
- **Deviations**: structure listItem+child (tsc) · R4 load wait + R1 try/catch (test hardening, check names/meaning unchanged) · browser totals documented as **16/17** (plan estimated 15/16 — pre-dated footer feature's `q-footer` file in same session) · planning-stage citation corrections (4 stale line numbers in pre-session partial draft).
