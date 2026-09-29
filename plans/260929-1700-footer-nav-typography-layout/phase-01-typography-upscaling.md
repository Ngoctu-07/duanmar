# Phase 01 — Typography Upscaling (headings + links + spacing)

**Status**: Complete (100%) · **Depends on**: plan approval · **Priority**: High

## Scope
`src/components/layout/footer.tsx` only — 3 nav columns (Blocks 1–3), not brand/bottom bar.

## Changes
| Element | Current | Target (mild) | Target (strong) |
|---------|---------|---------------|-----------------|
| `<h3>` ×3 (lines 40, 56, 80) | `font-semibold mb-4` (inherit 16px) | `text-2xl font-semibold mb-5` (24px ×1.5) | `text-3xl font-semibold mb-5` (30px ×1.875) |
| Links ×3 lists (lines 46, 69, 86) | `text-sm text-muted-foreground hover:text-foreground transition-colors` | `text-lg …` (18px ×1.29) | `text-xl …` (20px ×1.43) |
| `<ul>` ×3 (lines 41, 57, 81) | `space-y-2` | `space-y-3` | `space-y-3` |

- Keep `hover:text-foreground transition-colors` and `text-muted-foreground` identical.
- Do NOT touch: `BrandWordmark` classes, tagline `text-sm`, bottom bar `mt-8 text-sm`, brand block.
- `<h3>` element + `font-semibold` preserved (F2/O1b/Q8b assert element + order; weight not asserted but keep).

## Verify (after phase)
- Visual: dev server → footer VI + EN, headings noticeably larger, links legible, wrapping OK.
- No horizontal overflow @375 (`scrollW ≤ vw+1`).

## Todo
- [ ] Apply 3 heading class edits
- [ ] Apply 3 link class edits
- [ ] Apply 3 `space-y-2`→`space-y-3` edits
- [ ] Visual check VI/EN
