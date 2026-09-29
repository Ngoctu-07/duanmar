# Phase 1 — Frameless Styling, +20% Sizing, Overlay Close Chip

**Plan**: [plan.md](plan.md) · **Priority**: High · **Status**: Complete (100%) · **Depends on**: —

## Context Links
- `src/components/ui/dialog.tsx:39-81` (`DialogContent` signature `:39-50`, popup classes `:56-57`, close btn `:63-77`)
- `src/components/layout/promo-modal.tsx:34-48` (`DialogContent` call, `Image` `:40-47`)
- Sole other consumer: `src/components/reviews/review-image-lightbox.tsx:27-44` (no `closeLabel`/`closeSlot` customization beyond defaults)

## Overview
AC1 frameless (`p-0 bg-transparent border-0 shadow-none`, image edge-to-edge) + AC2 `w-[min(90vw,50.4rem)]` (+20% desktop, 90vw cap elsewhere) + AC3 dark overlay X chip — all via className merge on the promo call site.

## Key Insights
- twMerge resolves every override (same conflict group), so no conditional logic is needed.
- `closeClassName` must be an **optional** prop with the current classes as base → zero diff for lightbox.
- Image radius must equal container radius (`rounded-lg` → `rounded-xl`) to avoid a transparent seam at corners.

## Requirements
- Content box: padding 0, background transparent, border width 0, no shadow; image fills it edge-to-edge.
- Width: `min(90vw, 50.4rem)`; `max-h-[80vh]` retained; viewport never exceeded.
- Close: same slot/position, dark translucent chip (`bg-black/60 text-white border-0`), hover `bg-black/80`; `aria`/`sr-only` label untouched.
- Lightbox/other dialogs: byte-identical rendered classes.

## Related Code Files
**Modify**: `src/components/ui/dialog.tsx` · `src/components/layout/promo-modal.tsx`
**Create / Delete**: none

## Implementation Steps
1. `dialog.tsx` — extend props type with `closeClassName?: string` (after `showCloseButton`), default `undefined`; close Button becomes
   `className={cn("absolute top-2 right-2 bg-card", closeClassName)}`.
   - With no `closeClassName`, `cn` returns the same string as today → identical DOM.
2. `promo-modal.tsx` — `DialogContent` gains:
   - `className="w-[min(90vw,50.4rem)] border-0 bg-transparent p-0 shadow-none"`
   - `closeClassName="border-0 bg-black/60 text-white hover:bg-black/80 hover:text-white focus-visible:ring-white/60"`
3. `promo-modal.tsx` — `Image` className `h-auto w-full rounded-lg` → `h-auto w-full rounded-xl` (edge-to-edge, corners match container radius).
4. Keep `DialogTitle className="sr-only"` (a11y, layout-neutral), `data-slot`/`closeSlot`/`closeLabel` unchanged.
5. File-size check: dialog.tsx 116 → ~118 LOC, promo-modal 53 → ~56 LOC (both ≪200).
6. Gates: `npm run lint` → `npm test` (16/16) → dev server smoke: `/en` screenshot at 1280/768/375 → confirm no white frame, ~806px width @1280, dark X chip, close still dismisses, ESC still closes, lightbox (`g-reviews` image click) unchanged.

## Todo List
- [ ] `closeClassName` optional prop on `DialogContent`
- [ ] Promo modal className overrides (frameless + 50.4rem)
- [ ] Image `rounded-lg` → `rounded-xl`
- [ ] Gates: lint, unit, visual smoke (3 viewports)

## Success Criteria
- `getComputedStyle` on `[data-slot="promo-modal"]`: `padding: 0px`, `background-color: rgba(0,0,0,0)`, `border-width: 0px` @1280 → width ≈806px.
- Promo X renders as dark chip over image; lightbox dialog frame unchanged.
- lint 0 · unit 16/16 · no console/page errors.

## Risk Assessment
- twMerge edge case (`w-[min(...)]` arbitrary vs arbitrary): both arbitrary `w-` values, later wins — verified by smoke width measurement.

## Security Considerations
None (presentation only).

## Next Steps
Phase 2 — tests, pipeline, changelog.
