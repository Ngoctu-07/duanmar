# Phase 2 — Locale-Switch Re-trigger (isOpen = true)

**Context**: plan [plan.md](plan.md) · Inputs: Phase 1 binding
**Priority**: High · **Status**: Complete (100%) · **Depends on**: Phase 1

## Overview
Guarantee the modal re-opens with fresh locale props the instant the user toggles EN/VI — no reload, no manual refresh.

## Key Insights
- Two mechanisms may already combine: (a) `[locale]` dynamic-segment key change recreates the subtree → mount effect re-runs; (b) even without remount, the layout re-executes RSC → new `imageSrc` props flow down.
- Explicit effect covers both + documents intent: `const locale = useLocale()` → `useEffect(() => setOpen(true), [locale])` (fires on mount *and* on locale change of the same instance).
- Re-show must not fight dismissal: closing in locale A, switching to B re-opens (brief-required); closing in B keeps it closed until next switch (no persistence, YAGNI preserved).

## Requirements
- AC1: after `PromoModal` is dismissed, clicking the other locale in the header switcher results in `open === true` within the same soft navigation (≤ ~1s), image = Phase-1 chain for the new locale.
- AC2: no full page reload (`window.location` navigation forbidden) — observable as no document reload (perf/memory markers or simply: React state survival is *expected to reset*, reload absence proven by test continuing in same JS context without `page.goto`).
- AC3: switching locale while modal is open keeps exactly **1** modal instance (no duplicates).
- AC4: 0 new i18n keys; existing `promo.*` keys unchanged.

## Related Code Files
- Modify: `src/components/layout/promo-modal.tsx` (effect `:24-27`, add `useLocale` import)
- Reference: `src/components/layout/locale-switcher.tsx:12-15` (switcher), `hero-section.tsx:19` (`useLocale` precedent)

## Implementation Steps
1. `import { useLocale } from "next-intl";` in promo-modal; `const locale = useLocale();`.
2. Replace mount-only effect with `React.useEffect(() => { setOpen(true); }, [locale]);` — keep the existing eslint-disable comment (dialog must open post-hydration), updated reason text.
3. No other changes: `imageSrc`/width/height arrive via re-executed layout props; `Dialog` already controlled by `open`.
4. Manual smoke: dismiss → click `en` → modal reappears with EN asset → close → click `vi` → reappears with VI asset; verify no browser reload (DevTools/console continuity or quick DOM check).

## Todo List
- [ ] useLocale + effect keyed on locale
- [ ] manual smoke both directions

## Success Criteria
Lint 0 · unit 18/18 unchanged · smoke shows instant re-open in both directions with matching assets.

## Risk Assessment
Effect re-opening while user mid-scroll after switch — accepted (brief-mandated). Duplicate-instance risk only if Next double-mounts subtrees; browser test asserts `count === 1`.

## Security Considerations
None (client state only, no storage).

## Next Steps
→ Phase 3 (automated tests + pipeline).
