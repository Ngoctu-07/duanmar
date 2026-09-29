# Phase 04 — Body Font Weight 400 → 450

## Context Links
- Binding decision #3 · [plan.md](plan.md)
- `src/app/globals.css` — `@theme inline` `:7-50` (font entries `:10-12`), `@layer base` `:123-133` (`body:127-129`)
- `src/app/layout.tsx:5-13` — `Inter({ subsets: ["latin","vietnamese"], variable: "--font-sans" })`, **no `weight` array → variable font → 450 renders**
- Weight consumers: 169 `font-medium|semibold|bold` lines across `src/` (untouched); `grep "font-normal"` = 0; `grep "font-weight"` in `src/**/*.{ts,tsx,css}` = 0

## Overview
**Priority**: P2 (AC4, brand feel) · **Status**: Pending · **Effort**: ~20 min · **Files**: 1 (`globals.css`) · **New files**: 0

## Key Insights
1. The whole feature is 2 lines: one theme token + one `@apply`. Tailwind v4 exposes `--font-weight-*` as the weight namespace, so `--font-weight-body: 450` **generates the `font-body` utility** (`font-weight: 450`) — no `tailwind.config` needed (none exists).
2. Namespace safety: `font-body` resolves to the weight namespace because no `--font-body` (family) token exists; family utilities stay `font-sans`/`font-brand`/`font-heading` (`globals.css:10-12`).
3. Inheritance does the rest: `body` weight 450 flows to the 116 sized-text lines that currently inherit 400; every explicit `font-medium/semibold/bold` (169 lines) overrides it; form elements inherit via Tailwind preflight `font: inherit`.
4. Headings/brand are unaffected: `--font-heading` still maps to Inter (`:11`), `--font-brand` (Sora) untouched → no layout shift expected beyond sub-pixel glyph thickening (variable Inter has no width change between 400 and 450).
5. Only risk is `@apply font-body` failing to resolve (it must, but be ready): verification greps the **built CSS** for `font-weight:450`, not just the source.

## Requirements
- Functional: body text renders at weight 450 in both locales; headings/labels keep their chosen weights.
- Non-functional: zero `font-weight` hardcodes in tsx; `body` rule stays in `@layer base`; code files <200 lines; tests (incl. `f-ui.mjs:142` `font-semibold` assertion) unchanged and green.

## Related Code Files
- **Modify (1)**: `src/app/globals.css`
- **Create / Delete**: none

## Implementation Steps
1. Add the token as the last entry of `@theme inline` (directly under the `--shadow-soft` alias from phase-03, after `--radius-4xl` at `:49`):
   ```
   --font-weight-body: 450;
   ```
2. Apply it on `body` (`globals.css:127-129`):
   ```css
   body {
     @apply bg-background text-foreground font-body;
   }
   ```
3. Verify resolution:
   ```bash
   npm run build
   grep -o "font-weight:450\|font-weight: 450" .next/static/css/*.css   # must hit (base layer)
   grep -rn "font-normal" src/                                          # still 0
   ```
   Fallback if `@apply font-body` errors: keep the token and write `font-weight: var(--font-weight-body);` in the `body` rule (non-`@apply` form) — same visual result, still token-driven; record the deviation in the changelog line.
4. Visual check: home page paragraphs/list copy at 450 vs headings at 600/700 — confirm "slightly thicker, premium", not bold; check Vietnamese diacritics render (Inter `vietnamese` subset active) and no reflow of the header nav / buttons.
5. Confirm untouched: `grep -rn "font-medium\|font-semibold\|font-bold" src/ | wc -l` → same count as baseline (169).

## Todo List
- [ ] `--font-weight-body: 450` token in `@theme inline`
- [ ] `@apply font-body` on `body`
- [ ] Built-CSS grep proves `font-weight:450`
- [ ] Baseline weight-class count unchanged (169)
- [ ] Visual pass (EN + VI, diacritics, no reflow)

## Success Criteria
- Body copy visibly (subtly) heavier than before; headings/labels unchanged; no layout shift beyond glyph thickness.
- `font-weight:450` present once in built CSS; `grep "font-normal" src/` = 0; no `font-weight` declarations added to tsx.
- `npm run lint` + `npm test` green (no test reads computed font-weight — grep-verified).

## Risk Assessment
- **R1**: `@apply font-body` unknown-utility error → caught at `npm run build`; fallback step 3 documented.
- **R2**: 450 too subtle / too heavy vs intent → single-token rollback; evidence screenshots let the user judge.
- **R3**: line-height/width reflow on dense pages → Inter variable does not change advance widths between 400 and 450; visual pass on `/vi`, `/en`, checkout confirms.
- **R4**: weight leaks into components that should stay 400 (e.g. code blocks) → nothing declares `font-normal` today; if a spot looks wrong, fix locally with an explicit weight class (not by changing the body token).

## Security Considerations
- None — typography token only; no data, auth or network surface.

## Next Steps
- Phase-05: full verification, evidence screenshots, changelog entry, plan status updates.
