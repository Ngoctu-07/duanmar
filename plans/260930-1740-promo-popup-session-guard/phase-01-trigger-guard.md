# Phase 01 — Trigger Guard in PromoModal

**Status**: Pending · **Priority**: P1 · **Plan**: [plan.md](./plan.md)

## Overview
Replace the router-coupled effect `useEffect(..., [locale])` with an empty-deps, once-per-mount effect gated by `PerformanceNavigationTiming.type` + `sessionStorage.hasSeenPopup`. Removes `useLocale`. Single file, ~20 lines changed.

## Context Links
- Target: `src/components/layout/promo-modal.tsx` (60 lines — stays <200)
  - :5 `import { useLocale, useTranslations } from "next-intl"` · :21 `useTranslations("promo")` · :22 `const locale = useLocale()` · :29-32 effect · :35 early return `null` · :38 controlled `<Dialog open={open}>`
  - :30 precedent: `// eslint-disable-next-line react-hooks/set-state-in-effect -- dialog must open post-hydration to avoid SSR mismatch`
- Caller: `src/app/[locale]/layout.tsx:36-40` — props server-resolved (Sanity) at first render; no prop-later-async case → empty deps safe
- Probes this session (live :3000): #3 locale-toggle REPRO (both same-instance re-fire + remount paths), #5 second-doc-load REPRO, #7 `sessionStorage` always `{}`
- eslint: `eslint.config.mjs` = `next/core-web-vitals` + `next/typescript`, plugin `eslint-plugin-react-hooks@7.1.1`; lint baseline **0 (0 warnings)** — see step 4

## Related Code Files
**Modify**: `src/components/layout/promo-modal.tsx` — **Create/Delete**: none. `src/app/[locale]/layout.tsx` untouched (contract unchanged).

## Implementation Steps
1. Import (line 5): drop `useLocale` → `import { useTranslations } from "next-intl"`; delete line 22 (`const locale = useLocale()`).
2. Before the effect, derive (after `useState` :23): `const showable = enableEntryPopup !== false && !!imageSrc` — reuse it in both the effect and the render early return (`if (!showable) return null` replaces :35). DRY: one definition of "popup allowed", effect guard + render guard cannot diverge.
3. Replace effect :25-32 (comment block + body) with — semantics per plan.md truth table (Option A):
   ```tsx
   // Opens exactly once per document-load decision (plan 260930-1740): only on a TRUE
   // initial session load (PerformanceNavigationTiming type "navigate" with no prior
   // hasSeenPopup flag) or a hard browser refresh ("reload"). Empty deps = never re-runs
   // on client-side route/locale transitions; the flag covers remounts (locale segment
   // change recreates the subtree). Replaces the [locale] re-trigger of plan 260929-1617.
   React.useEffect(() => {
     if (!showable) return
     const navType = performance.getEntriesByType("navigation")[0]?.type   // client-only, effect = SSR-safe
     if (navType && navType !== "navigate" && navType !== "reload") return // back_forward/prerender: never
     let seen = null
     try { seen = sessionStorage.getItem("hasSeenPopup") } catch { seen = null }      // private-mode read → fail-open
     if (navType !== "reload" && seen === "true") return
     // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog must open post-hydration to avoid SSR mismatch
     setOpen(true)
     try { sessionStorage.setItem("hasSeenPopup", "true") } catch { /* private-mode write → fail-open */ }
     // eslint-disable-line react-hooks/exhaustive-deps  -- only if reported; see step 4
   }, [])
   ```
   - `undefined` navType (API missing): falls through navType check → flag-gated → yes only if flag unset (fail-open capability, plan decision).
   - Flag set at SHOW time (not dismiss): "hasSeenPopup" = has been displayed; dismiss timing adds nothing (YAGNI).
4. Run `npm run lint`. If `react-hooks/exhaustive-deps` warns on `showable` read inside `[]` deps: keep empty deps (behavior is deliberate — props are final at mount) and place a targeted disable on the reported line (precedent :30). Do NOT widen deps to `[showable]` — that reintroduces a re-run channel.
5. Run `npx tsc --noEmit` + `npm test` (26/26, unaffected — no unit test touches promo: `tests/unit/` has no promo file).

## Success Criteria / Acceptance
- [ ] `promo-modal.tsx`: zero `useLocale`/`locale` references; single effect, deps `[]`; `showable` used by effect + render guard
- [ ] Behavior matches plan.md truth table (validated by phase-02 tests)
- [ ] `npm run lint` 0 (0 warnings) · `npx tsc --noEmit` 0 · `npm test` 26/26

## Risk / Rollback
- One-file revert (`git checkout -- src/components/layout/promo-modal.tsx`) restores old behavior; no data/migration coupling; phase-02 test revert is independent.
- Failure mode named: reading props inside `[]` effect → stale if props changed post-mount. Mitigated: props come from server-fetched site config at first render (layout.tsx:36-40), no post-mount prop mutation path exists.

## Next Steps
Phase 02 (`phase-02-test-inversion.md`) — R15/R16 inversion + new checks (depends on this).
