---
title: "Restrict Promo Popup Trigger to Initial Load / Hard Refresh Only"
description: "Session-guard the entry promo modal (empty-deps effect + sessionStorage flag + PerformanceNavigationTiming type) so it opens only on true initial load or hard refresh — never on client-side route/locale transitions."
status: pending
priority: P1
effort: 3h
branch: master
tags: [bugfix, promo-popup, ux, sessionstorage, navigation-timing, next-intl, puppeteer]
created: 2026-09-30
---

# Promo Popup — Initial Load / Hard Refresh Only

**Date**: 2026-09-30 · **Type**: Bugfix (UX) · **Plan ID**: 260930-1740

## Executive Summary
Promo modal re-opens on EN/VI locale toggle (router-derived effect dep) and on every full document load (zero session guard) — intrusive UX. Gate the single mount-time effect with `PerformanceNavigationTiming.type` (`navigate`/`reload` only) + `sessionStorage` flag `hasSeenPopup`; invert the two designed locale-retrigger test assertions (plan 260929-1617) and add load-type coverage in the same test file.

## Context Links
- **Root cause (empirically verified, live :3000 probes this session)**: `src/components/layout/promo-modal.tsx:29-32` `React.useEffect(..., [locale])`, `locale` from `useLocale()` (decl :22). Two gaps: **(a)** `[locale]` is router-derived → re-fires on locale segment change (same instance) AND a remounted instance runs its mount effect anyway (subtree recreation, plan 260929-1617 crux → probe #3 REPRO); **(b)** zero session guard → any full document load re-opens (`'navigate'` typed URL probe #5, `back_forward`, plain `<a>`), `sessionStorage` always `{}` (probe #7). Honest negatives: same-locale soft nav does NOT re-trigger (probe #2 — layout instance persists :layout.tsx:36-40, effect never re-runs); open modal persists across soft nav (probe #4).
- Render: `src/app/[locale]/layout.tsx:36-40` (`imageSrc/width/height/enableEntryPopup` from Sanity `SITE_CONFIGURATION_QUERY`, D2 per-locale chain); early-return `null` at `promo-modal.tsx:35` runs AFTER hooks; dialog controlled `open={open}` (:38).
- Tests: grep `promo-modal` in `tests/` = only `tests/browser/r-entry-popup-cms.mjs` (presence assertions) + helper `tests/helpers/promo.mjs`. R15/R16 (:231-300) assert locale toggle RE-OPENS (designed feature, 260929-1617) → directly conflicts → requirement-driven inversion. `dismissPromo` used by **27** files in `tests/browser/` (grep = 27; +helper +1 scratch `.output/hero-search-check.mjs`). Each file = own process via `tests/run-browser.mjs:36` (`spawnSync node`) → own browser/tab → fresh sessionStorage; `closeBrowser` clears ws session (`browser.js:309-317`).
- Related: `plans/260929-1617` (re-trigger feature now overridden), `plans/260930-1705-ui-downscale-remediation` (DRAFT, unapproved — CMS-reseed reds unrelated to this fix).

## Key Decisions (locked, KISS/YAGNI/DRY)
1. **Trigger rule — Option A (literal user wording: "initial load OR hard refresh")**, one `useEffect` with **empty deps** (req #2: detached from router deps), body runs client-only (SSR-safe):
   ```
   navType = performance.getEntriesByType("navigation")[0]?.type   // undefined if API missing
   if (navType && navType !== "navigate" && navType !== "reload") return   // back_forward/prerender → never
   seen = sessionStorage.getItem("hasSeenPopup")          // try/catch → null (private-mode read error)
   if (navType !== "reload" && seen === "true") return     // flag gates 'navigate' loads only
   if (!showable) return      // showable = enableEntryPopup !== false && !!imageSrc → no flag write when suppressed (decision 4)
   setOpen(true); sessionStorage.setItem("hasSeenPopup", "true")   // try/catch → no-op (private-mode write error → fail-open)
   ```
   **Critical**: empty deps alone would NOT fix it (remounted instance still runs mount effect) — the navType+flag gate is the actual guard; empty deps satisfies req #2 and kills same-instance re-fire.
2. **Remove `useLocale()`/`locale`** — sole usages are decl :22 + dep :32; `useTranslations` stays (`t` at :42, :49). Import line 5 → `import { useTranslations } from "next-intl"`.
3. **Locale toggle no longer reopens** — requirement overrides 260929-1617's designed re-trigger. If Next recreates the subtree on locale change: fresh instance `open=false` + flag set → an open modal **closes** = accepted behavior change. Live asset swap while open remains props-driven.
4. **Flag written only when actually showing** (decision 1 `showable` guard) — keeps `hasSeenPopup` honest. Consequence: disabled→enabled later in the same DOCUMENT won't show (module marker already false anyway? no — marker not set either → a locale REMOUNT while flag unset CAN show; same-doc enable→remount is YAGNI, accepted). *(Review fix: module marker `popupShownThisDocument` added — see risk register.)*
5. **Option A chosen over B**: F5 hard refresh ALWAYS shows (flag only gates repeated `'navigate'` loads) — matches "or hard browser refresh" literally. Option B (once per session incl. reload) → unresolved Q1.

## Trigger truth table (approval target)
| navType | flag | show? | note |
|---|---|---|---|
| `navigate` (first doc load, typed URL) | unset | **YES** + set flag | true initial session load (probe #1) |
| `navigate` (same-tab 2nd doc load) | `"true"` | no | closes probe #5 |
| `reload` (F5) | `"true"`/unset | **YES** (Option A) | hard refresh explicitly allowed (probe #6) |
| `back_forward` / `prerender` | any | no | browser-driven doc loads excluded |
| API missing (`undefined`) | unset / `"true"` | yes only if flag unset | fail-open for capability, still flag-gated |
| soft nav (no new document; instance persists) | any | no | effect `[]` never re-runs (probe #2) |
| soft nav w/ locale-remount (fresh instance) | `"true"` | no | flag gate (probe #3) |
| any, `enableEntryPopup===false`/no asset | any | no, **no flag write** | `showable` guard |

## Phases (disjoint file ownership)
| Phase | Focus | Files |
|---|---|---|
| P1 `phase-01-trigger-guard.md` | guard logic in modal | **MODIFY** `src/components/layout/promo-modal.tsx` |
| P2 `phase-02-test-inversion.md` | invert R15/R16, add R17/R18 | **MODIFY** `tests/browser/r-entry-popup-cms.mjs` |
| P3 `phase-03-gates-and-docs.md` | gates + changelog | **MODIFY** `docs/project-changelog.md` (:511 `### Fixed`, insert before :519) |

## Testing Strategy (exact edits in phase-02)
- **R15 inverted**: dismiss → EN soft toggle → assert `count===0`, path `/en`, marker `__promoI18nNoReload===1`, navType still `navigate`, flag `"true"` (reuse existing 8s wait — a reopen still FAILs the assert).
- **R16 repurposed**: hard `page.reload()` → modal reopens with **EN asset + EN alt** (preserves D2 chain coverage), navType `reload`, marker `null` (full doc); screenshot `r-entry-popup-03-locale-en.png` moves here; dismiss there.
- **NEW R17**: flag `"true"` after first show + persists across toggle/reload. **NEW R18**: same-tab 2nd `goto` (different URL, navType `navigate`) → absent.
- **Risk-free**: R2–R7/R8–R10/R11 semantics unchanged (fresh tab per file). `dismissPromo`: **no change**; correction to scout note — suppressed call costs the full 2s selector timeout (early-return, NOT faster), ≤+2s per call, no assertion depends on it.
- **Regression**: full 30-file suite; only presence-asserting file = r-entry-popup.

## Gates (baselines)
`npm run lint` 0 · `npm test` 26/26 · `npx tsc --noEmit` 0 · `npm run build` 0 (**dev stopped** — CSS-404 incident precedent; restart dev after) · `npm run test:browser` full **30 files**, baseline last full run **18/30**; known pre-existing reds: `b-booking-confirmation-email.mjs`, `revalidate-webhook.mjs` (env) + CMS-reseed hcm-hardcoded (`c-booking, c-payment, d8, f-ui, g-reviews, h4, k, n, p-tours, s-tour-hero`). Proof: (a) `r-entry-popup-cms.mjs` green with new asserts, (b) 27 dismissPromo files no NEW failures attributable to fix, (c) residual failures ⊆ known list **by name**.

## Risk Assessment
| Risk | L/I | Mitigation |
|---|---|---|
| `page.click` on absent close chip waits 30s default → stall after inversion | M/M | dismiss only when modal confirmed present (phase-02 restructure) |
| stale reused tab carries `hasSeenPopup` into r-entry first load (browser.js ws session reconnect :220-233) | L/H | R2 hygiene: no modal + flag pre-set → `sessionStorage.clear()` + `page.reload()` (reload branch) → continue |
| `react-hooks/exhaustive-deps` warn for props read in `[]` effect → lint 0-warn gate | M/L | targeted disable, precedent `promo-modal.tsx:30`; verify via lint |
| dev hydration >8s evades absence window (false green) | L/M | reuse existing 8s waits — same window that reproduces today's reopen |
| drift vs plan 260929-1617 | H/L | requirement explicitly overrides; changelog documents inversion |

## Unresolved Questions
1. **Option A vs B**: reload always re-shows (recommended A, literal wording) vs once-per-session even on F5 (B)?
2. Private-mode `sessionStorage` write failure → fail-open (show; recommended — popup degrades to today's full-load behavior, soft nav still safe) vs fail-closed (never show)?
3. `PerformanceNavigationTiming` API missing → allow-if-flag-unset (recommended fail-open) vs never show?

## TODO
- [ ] P1 guard logic + `lint`/`tsc` · [ ] P2 test inversion green (targeted + full suite) · [ ] P3 gates + changelog · **Docs impact: minor**
