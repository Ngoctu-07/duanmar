# Phase 02 — Remove Pagination Dots + Dead Code + i18n

**Status**: Complete (100%) · **Depends on**: Phase 1 · **Priority**: High

## Changes
1. `destination-hero-carousel.tsx`:
   - Delete dots container block (`:106-125`) — no buttons/indicators rendered.
   - Remove now-dead: `cadence` state (`:35`) + `setCadence` call, `active` computation (`:68`), `useTranslations` import + `const t` (only consumer was dot `aria-label`).
   - Keep `use client`, Image, cn, autoplay/snap effects, clone rendering, `data-testid`.
   - File stays well under 200 lines (~75 expected).
2. `src/messages/en.json` + `src/messages/vi.json`: delete `destinations.slideLabel` from BOTH (parity test asserts identical key sets; only consumer was the removed dots).

## Verify
- Carousel renders with zero `<button>` descendants (probe/evaluate).
- `npm test` i18n parity green.
- No remaining references: `grep -rn "slideLabel\|cadence\|paused" src tests` → 0 hits.

## Todo
- [ ] Delete dots block + dead code
- [ ] Remove `slideLabel` from en.json + vi.json
- [ ] Grep clean + parity test
