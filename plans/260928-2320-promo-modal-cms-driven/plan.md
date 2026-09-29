# Promotional Modal CMS-Driven (Dynamic Campaign Asset) — Plan

**Date**: 2026-09-28 · **Type**: Feature (Sanity singleton schema + server fetch + client refactor + tests) · **Status**: Complete · **Progress**: 100%

## Executive Summary
Add a new Sanity **global singleton** `siteConfiguration` (`entryPopupImage` image + `enableEntryPopup` boolean, default true) so marketing swaps or disables the entry promo asset without a deploy. `src/app/[locale]/layout.tsx` (server) fetches it via `fetchPublished` and passes `imageSrc/width/height/enableEntryPopup` as props; `promo-modal.tsx` returns **`null`** when the toggle is off or no image exists (no broken `<img>`, no empty box). Hardcoded `/images/promo-modal.png` leaves the modal only — the file STAYS (poster of `promo-video.tsx:8`).

## Context Links
- **Reports**: `reports/plan-summary.md` · phases: `phase-01-schema-frontend.md`, `phase-02-tests-pipeline-changelog.md`
- **Modal**: `src/components/layout/promo-modal.tsx` (43 LOC) — `"use client"` `:1`, no props, `useState` `:15`, post-hydration `setOpen` `:17-20` (SSR eslint-disable `:18`), `<Dialog>` `:23`, `DialogContent data-slot="promo-modal"` `:25` + `closeSlot="promo-modal-close"` `:26`, hardcoded `<Image>` `:30-37` (src `:31`, `priority` `:35`, `className` `:36`), alt `t("imageAlt")` `:32`
- **Mount**: `src/app/[locale]/layout.tsx` (22 LOC) — import `:5`, `<PromoModal />` `:19` (last child inside `NextIntlClientProvider` `:15`), unconditional, zero props
- **i18n**: `src/messages/{en,vi}.json:1256-1260` = `promo.{title,imageAlt,close}` (both files 1260 LOC) — key parity enforced by `tests/unit/i18n-parity.test.ts:43-58`
- **CMS**: NO singleton exists (grep `documentId|singleton` in `src/sanity/` = 0). `structure.ts` (7 LOC) = `S.list().title('Content').items(S.documentTypeListItems())` `:5-7`. Registry `schemaTypes/index.ts` (9 LOC) `types: [destination, homepage, post, tourPricing]` `:8` — **past bug** `docs/project-changelog.md:21` (forgotten register = invisible in Studio)
- **Recipe precedent**: image field `schemaTypes/homepage.ts:24-29` (`type:"image"` `:27`, `options:{hotspot:true}` `:28`) · boolean `schemaTypes/destination.ts:34-41` (`type:"boolean"` `:37`, `initialValue:false` `:40`) · singleton-shaped query `queries/homepage.ts:4-11` (`*[_type=="homepage"][0]{…}`) · fragment `fragments/image.ts:1` (`asset->{ _id, url, metadata { lqip, dimensions } }, alt`)
- **Fetch plumbing**: `lib/fetch-published.ts:30-45` — `unstable_cache` `revalidate:300` `:43`, global `SANITY_TAG` `:7` + `sanityTags()` `:20-22`, fail-open `.catch(()=>null)` `:44`; `lib/client.ts:11` `useCdn:false`; `api/revalidate/route.ts:33` `revalidateTag("sanity","max")` (entity tags informational-only). Call-site style `explore/destinations/page.tsx:36` `{ tags: ["sanity:pricing:all"] }`
- **CDN/image**: `next.config.ts:25` `cdn.sanity.io` already in `images.remotePatterns`; `lib/image.ts:8` `urlFor` exists but **unused anywhere** → follow the `asset.url` convention
- **Tests**: 0 assertions on modal presence/image (grep over `tests/` = 0) · `tests/helpers/promo.mjs:3` `waitForSelector(…,{timeout:10000})`, silent return `:4-6`, **38 call sites / 14 browser files** · unit GROQ-contract pattern `tests/unit/tour-category-queries.test.mts` · live-CMS pattern `tests/helpers/cms-expectations.mjs:12-20,27-42` (`envValue` + `.env.local` fallback, unauthenticated `api.sanity.io`)
- **Runners**: `tests/run-unit.mjs:17-18` auto-discovers `*.test.{ts,mts}` (15 today) · `tests/run-browser.mjs:23-24` globs `*.mjs` (15 today)

## Binding Decisions (chosen — do not re-ask)
1. **Fetch = server**: `layout.tsx` calls `fetchPublished(SITE_CONFIGURATION_QUERY, {}, { tags: ["sanity:siteconfig"] })` and passes `imageSrc` + `width`/`height` (from `asset.metadata.dimensions`, fallback 1200×800) to `<PromoModal />`. Client renders `if (enableEntryPopup === false || !imageSrc) return null`. **NO** client-side GROQ / raw `client.fetch` outside `fetchPublished`.
2. **Toggle semantics**: show only when `enableEntryPopup !== false && imageSrc`. Absent doc / absent image / explicit `false` → `null`. Schema `initialValue:true` supplies "default true" for newly created docs.
3. **Schema**: `siteConfiguration` (file `site-configuration.ts`), title "Site Configuration"; fields `entryPopupImage` (image, hotspot, optional) + `enableEntryPopup` (boolean, `initialValue:true`, description states it gates the entry popup). Register in `index.ts`; `structure.ts` gets the **first** singleton item (fixed `documentId('siteConfiguration')`) + `.filter()` it out of `documentTypeListItems()`; list title stays "Content".
4. **Alt text**: keep i18n `promo.imageAlt` → **0 new i18n keys** → parity untouched. `className` stays `h-auto w-full rounded-lg`; width/height come from CMS metadata so aspect ratio never distorts.
5. **`dismissPromo` timeout**: `tests/helpers/promo.mjs:3` `timeout:10000` → `timeout:2000` (spec-change, changelog-documented per precedent F7/B6/j-about-contact). Call signature/behavior otherwise unchanged; fast path still returns instantly when the modal is present.
6. **Tests**: NEW `tests/unit/site-configuration-query.test.mts` (6-8 query-contract checks, no network) + NEW `tests/browser/r-entry-popup-cms.mjs` (data-driven on the live `siteConfiguration` doc). Zero edits to existing tests **except** the one helper timeout line.
7. **Out of scope (YAGNI)**: no dismiss persistence/storage, no schedule/frequency, no video asset type, no `alt` subfield on the image, no `promo-video.tsx` change, no i18n changes, no new dependencies.

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Depends on | Verification |
|---|-------|--------|----------|-----------|-----------|--------------|
| 1 | Singleton schema + register + structure + query + server fetch + `PromoModal` refactor | Complete | 100% | [phase-01](phase-01-schema-frontend.md) | — | `sanity schemas validate`, `npx tsc --noEmit`, lint |
| 2 | Helper timeout + 2 new tests + full pipeline + changelog + status flips + code review | Complete | 100% | [phase-02](phase-02-tests-pipeline-changelog.md) | P1 | unit **16/16**, browser **16/17**, build exit 0 |

## File Allow-List (exact)
- **Create (4 + plan dir)**: `src/sanity/schemaTypes/site-configuration.ts` · `src/sanity/queries/site-configuration.ts` · `tests/unit/site-configuration-query.test.mts` · `tests/browser/r-entry-popup-cms.mjs` · plan dir (this + 2 phases + `reports/plan-summary.md`)
- **Modify (7)**: `src/sanity/schemaTypes/index.ts` · `src/sanity/structure.ts` · `src/app/[locale]/layout.tsx` · `src/components/layout/promo-modal.tsx` · `tests/helpers/promo.mjs` (**`timeout` line ONLY**) · `docs/project-changelog.md` (EOF `### Changed` under `## 2026-09-28` `:261`) · plan files
- **Delete: 0.** **NEVER**: `public/images/promo-modal.png` (poster `promo-video.tsx:8`), `revalidate-webhook.mjs`, `tests/run-unit.mjs`, `tests/run-browser.mjs`, any existing browser/unit test (except the helper timeout line), `header.tsx`, `src/messages/*`, `promo-video.tsx`.

## Global Verification (every phase)
`npm run lint` (exit 0) → `npx tsc --noEmit` (0 errors) → `npm test` (**15 unit files today → 16 with the new file → expect 16/16**) → **stop dev `:3000`** → `npm run build` (exit 0) → restart dev `(npm run dev > /c/Users/Lenovo/AppData/Local/Temp/next-dev.log 2>&1 &)` → `npm run test:browser` (**17 files with `q-footer` + `r-entry-popup-cms` → expect 16/17**, sole tolerated fail = pre-existing `revalidate-webhook` env issue) → eyeball `/en` + `/vi`.

## Key Risks
- **No `siteConfiguration` doc exists in the dataset yet** → after this lands the modal renders nothing. **EXPECTED per AC3** (graceful degradation); marketing uploads the asset in Studio to switch it back on. **RESOLVED mid-session**: doc published 18:17Z with 1376×768 asset → enabled branch live (8/8).
- **Suite-timeout math**: 39 `dismissPromo` call sites × 10 s ≈ **6.5 min** burned per browser run if left alone → decision 5 (2 s) caps worst case at ≈ 39×2 s = **78 s**; modal-present fast path unchanged (exercised 39× in the enabled suite run).
- **Singleton is a first-in-repo pattern** → `structure.ts` `.filter()` must remove `siteConfiguration` from `documentTypeListItems()` or the doc is listed twice; singleton placed first via `S.listItem().child(S.document()…)` (`tsc` rejects bare `S.document()` as list item → deviation from sketch, same behavior).
- **Registration miss** (`changelog:21`) → schema exists on disk but Studio shows nothing; verify by counting `types` (4 → 5).
- **Cache staleness**: `fetchPublished` caches 300 s (`:43`) while the browser test reads live CMS → a swap inside that window can flake `r-entry-popup-cms`; re-run rather than weaken the assertion.
- **[Review follow-up, P2] Root-layout CMS fetch has no request timeout**: `fetch-published.ts` fail-open catches fast rejections only; a hung `api.sanity.io` connect would stall every locale route on each 300 s cache miss (low likelihood, high blast radius — the root-layout fetch is new blast surface). Hardening outside this feature's allow-list: `abortSignal: AbortSignal.timeout(3000)` in the shared fetch layer + regression note in changelog when done.

## Unresolved Questions
None blocking (all 7 decisions binding). Defaults chosen, flag only if they should differ: singleton documentId `siteConfiguration` · cache tag `sanity:siteconfig` · intrinsic fallback 1200×800 · r-test "page interactive" = header nav link clickable after load.
