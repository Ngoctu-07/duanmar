# Phase 01 — Remove Pause (root-cause fix for continuous loop)

**Status**: Complete (100%) · **Depends on**: plan approval · **Priority**: High

## Changes — `src/components/explore/destination-hero-carousel.tsx`
1. Remove props handlers from root div (`:74-77`): `onMouseEnter`, `onMouseLeave`, `onFocusCapture`, `onBlurCapture`.
2. Remove `paused` state (`:31`) and its use in autoplay effect (`:46`, deps `:52`).
3. Keep `reducedMotion` effect + autoplay gate unchanged (sole remaining pause mechanism).
4. Keep clone/snap loop (`:45-64`) untouched — probe-verified working.
5. Update docstring (`:23`): "pauses on hover/focus" → "autoplay is continuous (no hover pause); disabled under prefers-reduced-motion".

## Verify
- Live probe (parked cursor + cursor ON hero): sequence `0→1→2→3(clone)→0` repeats uninterrupted with pointer resting on the hero.
- `aria-hidden` per-slide behavior unchanged.

## Todo
- [ ] Strip pause handlers + `paused` state
- [ ] Docstring update
- [ ] Probe: loop continues while hovered
