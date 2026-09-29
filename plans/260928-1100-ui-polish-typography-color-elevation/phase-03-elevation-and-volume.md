# Phase 03 — Elevation & Spatial Volume

## Context Links
- Binding decision #2 · [plan.md](plan.md)
- `src/app/globals.css` — `@theme inline` 7–50 (`--radius-4xl`:49) · `:root` 52–86 (`--radius`:77) · `@layer base` 123–133
- `src/components/ui/card.tsx:14` (ring + `--card-spacing`) · `input.tsx:11` · `textarea.tsx:9` · `select.tsx:43` (trigger) / `select.tsx:85` (popup, untouched) · `button.tsx:6,23,26,29,34` · `sheet.tsx:56` (untouched)
- Idiom survey (verified): **43** `rounded-xl border` sites / **32** files → 15×`p-6`, 15×`p-5`, 6×`p-8`, 6×`p-4`, 1 no-padding (`destinations-map.tsx:56`); 9 of them already carry `hover:bg-*`
- Hover sites: `destination-card.tsx:29`, `experience-categories.tsx:36`, `quick-access-icons.tsx:22` (all already `transition-shadow`)
- Tests: `tests/browser/f-ui.mjs:142` asserts `font-semibold`+`text-primary` only; `tests/unit/h6-render-capacity.test.mts:109-110` asserts `--rdp-day-*` px only — **no test asserts height, padding or shadow** (grep-verified)

## Overview
**Priority**: P1 (AC3 core) · **Status**: Pending · **Effort**: ~1.5 h · **Files**: ~12 · **New src files**: 0 · **Depends**: phase-02 (shared `globals.css`)

## Key Insights
1. **Elevation system (layered, not flat, not gaudy)** — one ladder, three rungs:
   `shadow-sm` (controls, resting) → `shadow-soft` (cards, resting, new token) → `shadow-md` (hover lift, built-in).
   Overlays keep their heavier `shadow-lg`/`shadow-md` (sheet/select popup) — untouched per binding.
2. **Token plumbing**: the idiom rule needs a *CSS variable*, `card.tsx` needs a *utility class*. Tailwind v4 `@theme inline` values are inlined into utilities, so a single name used in both places is fragile. Use the repo's existing color pattern: raw token `--elevation-soft` in `:root` (always emitted, plain CSS) + alias `--shadow-soft: var(--elevation-soft)` in `@theme inline` (creates the `shadow-soft` utility) + rule reads `var(--elevation-soft)`. One definition, two consumers, plus a free `.dark` hook.
3. **Page-card mechanism — DECISION: one `@layer components` rule**, not 43 edits:
   ```css
   @layer components {
     .rounded-xl.border { box-shadow: var(--elevation-soft); }
   }
   ```
   Why: DRY/KISS (elevation for the idiom declared once), guaranteed 43/43 coverage (no missed site), 32-file diff avoided, self-documenting ("`rounded-xl` + `border` IS the page-card idiom"), and opt-out stays possible — utilities layer beats components layer, so `shadow-none` at a site always wins. Test risk: **zero** (no test reads box-shadow). Fallback if review rejects class-name coupling: bulk-insert `shadow-soft` into all 43 className strings (same gates, same tests).
4. **Hover lift scope**: only the 3 existing `hover:shadow-*` sites get `shadow-md` (they already own `transition-shadow`). Do **not** add hover shadows to the 9 `transition-colors` idiom rows — `transition-colors` and `transition-shadow` both set `transition-property`, so combining them is order-dependent (one silently dies), and static sections must not lift on hover. Matches binding ("re-point 3 existing sites").
5. **Card double-edge**: `card.tsx:14` `ring-1 ring-foreground/10` → `shadow-soft` (binding). The 43 idiom sites keep their `border` (that IS their edge) and gain shadow — no element ends up with border+ring+shadow.
6. **Volume — control heights**: booking form today pairs `h-8` `Input` with an `h-9` submit (`booking-form.tsx:153`), and 8 page CTAs are already raw `h-9` (`accessibility:51`, `business-mice:46,61`, `privacy:75`, `support:63`, `trade:46,61`, `travel-date-field:174`). Standardizing primitives at **`h-9`** fixes an existing mismatch, adds 4px tap target (a11y), and is the "premium volume" step. Only 7 non-default size usages exist repo-wide (3 `icon` in a flex header row, 2 `lg`, 2 `sm`) and no `h-8`/`size-8` containers exist outside `ui/` → alignment risk is bounded. `lg`/`icon-lg` move to `h-10`/`size-10` so the size ladder stays distinct (unused: `xs`, `icon-sm`, `icon-xs`).
7. **Volume — padding**: raise the idiom floor `p-4` → `p-5` (5 sites; the 6th is a fixed `w-56` ticker where +8px would wrap text) and bump Card's own spacing token 4 → 5 (16 → 20px) — one token lifts `py`, `gap` and footer padding for all 3 `Card` usages at once (DRY). `p-5/p-6/p-8` already read as generous → left alone (YAGNI).

## Requirements
- Functional: tokens + rule live in `globals.css`; `Card` loses its ring and gains `shadow-soft`; 3 hover re-points; resting `shadow-sm` on solid button variants + `Input`/`Textarea`/select trigger; height/padding bumps.
- Non-functional: no hardcoded hex in tsx; `select.tsx` is exactly 200 lines → **edit classes in place, no line growth**; `globals.css` stays <200 lines; all 11 unit + 7 browser tests green; no new comments.

## Related Code Files
- **Modify**: `src/app/globals.css` · `src/components/ui/card.tsx` · `button.tsx` · `input.tsx` · `textarea.tsx` · `select.tsx` · `src/components/explore/destination-card.tsx:29` · `src/components/homepage/experience-categories.tsx:36` · `src/components/homepage/quick-access-icons.tsx:22` · padding sites: `src/app/[locale]/about/press/page.tsx:47`, `src/app/[locale]/support/page.tsx:46`, `src/components/booking/booking-payment-section.tsx:77`, `src/components/my-trips/my-trips-client.tsx:77`, `src/components/search/search-client.tsx:87`
- **Create**: none · **Delete**: none (dead `navigation-menu.tsx` explicitly skipped)

## Implementation Steps
1. **Token** — append inside `:root` after `--radius` (`globals.css:77`):
   ```
   --elevation-soft: 0 1px 2px rgb(0 0 0 / 0.04), 0 4px 12px -2px rgb(0 0 0 / 0.06);
   ```
2. **Utility alias** — add as last entry of `@theme inline` (after `--radius-4xl`, `:49`):
   ```
   --shadow-soft: var(--elevation-soft);
   ```
3. **Idiom rule** — new block after `@layer base` (`:133`, end of file):
   ```css
   @layer components {
     .rounded-xl.border {
       box-shadow: var(--elevation-soft);
     }
   }
   ```
4. **Card** — `card.tsx:14`: `ring-1 ring-foreground/10` → `shadow-soft`; `[--card-spacing:--spacing(4)]` → `[--card-spacing:--spacing(5)]` (leave `data-[size=sm]:--spacing(3)`).
5. **Hover re-point**: `destination-card.tsx:29` and `experience-categories.tsx:36` `hover:shadow-lg` → `hover:shadow-md`; `quick-access-icons.tsx:22` already `hover:shadow-md` → verify only. Gate: `grep -rn "hover:shadow-lg" src/` → 0, `hover:shadow-md` → 3.
6. **Button** — `button.tsx`: add `shadow-sm` to variant strings `default`, `outline`, `secondary`, `destructive` (**not** `ghost`, **not** `link`); sizes: `default` `h-8`→`h-9`, `icon` `size-8`→`size-9`, `lg` `h-9`→`h-10`, `icon-lg` `size-9`→`size-10` (base string already has `transition-all` → hover bg animates; no hover-shadow added per binding).
7. **Inputs** — `input.tsx:11` `h-8`→`h-9` + add `shadow-sm`; `textarea.tsx:9` add `shadow-sm` (no fixed height to change); `select.tsx:43` `data-[size=default]:h-8`→`h-9` + add `shadow-sm` (popup `:85` untouched; `data-[size=sm]:h-7` untouched).
8. **Padding floor** `p-4` → `p-5` at the 5 listed sites; `src/components/homepage/events-ticker.tsx:34` keeps `p-4` (fixed `w-56`).
9. **Verify**:
   ```bash
   grep -rn "ring-1 ring-foreground/10" src/components/ui/card.tsx   # 0
   grep -rn "hover:shadow-lg" src/                                   # 0
   grep -c "rounded-xl border" -r src/ | grep -v ":0" | wc -l        # 32 files, sites still 43 (rule is CSS-side)
   grep -rn "h-8\|size-8" src/ --include=*.tsx                       # only ui/ leftovers (none expected)
   ```
   then `npm run build` and grep `.next/static/css/*.css` for `.shadow-soft` and `box-shadow:0 1px 2px` (proves token + utility compiled).
10. **Visual**: hover a destination card / experience tile / quick-access tile (lift), scroll a listing page (page cards float softly, single edge), booking form (inputs+buttons same height, subtle resting shadow), dark-mode spot check via devtools `document.documentElement.classList.add("dark")` (shadow may go near-invisible — expected, documented).

## Todo List
- [ ] `:root --elevation-soft` token
- [ ] `@theme inline --shadow-soft` alias
- [ ] `@layer components` idiom rule
- [ ] `card.tsx:14` ring → `shadow-soft` + spacing 4 → 5
- [ ] 3 hover sites re-pointed to `shadow-md`
- [ ] `button.tsx` variant shadows + `h-9`/`size-9`/`h-10`/`size-10`
- [ ] `input.tsx` / `textarea.tsx` / `select.tsx` trigger shadows (+ heights)
- [ ] 5 padding sites `p-4` → `p-5`
- [ ] Grep gates + built-CSS check (`.shadow-soft` present)
- [ ] Visual pass (light + dark spot check)

## Success Criteria
- Page cards and `Card` render a soft resting shadow with **no** doubled ring edge; 3 interactive cards lift to `shadow-md` on hover with animation.
- Buttons/inputs show a subtle resting shadow; form rows align at 36px; `ghost`/`link` remain flat; overlays unchanged.
- Gates green: `ring` removed, `hover:shadow-lg`=0, 43 idiom sites intact, no stray `h-8`.
- Built CSS contains `.shadow-soft` + the `.rounded-xl.border` rule; `npm run lint`/`npm test`/`npm run test:browser` all green.

## Risk Assessment
- **R1**: review rejects compound selector (class-name coupling) → fallback ready: bulk-add `shadow-soft` to the 43 className strings; identical tests, larger diff.
- **R2**: `shadow-soft` utility fails to compile (inline `var()` value) → fallback: non-inline `@theme { --shadow-soft: … }` or `shadow-[var(--elevation-soft)]` in `card.tsx`; caught by the built-CSS grep in step 9.
- **R3**: height bump misaligns a row → bounded (only 7 non-default sizes; no `h-8` parents outside `ui/`; header icon buttons sit in `flex items-center`); caught by visual pass + `g-header`/`h4` browser tests.
- **R4**: `select.tsx` hits the 200-line cap → in-place class edits only; `npm run lint` + `wc -l` gate.
- **R5**: `p-4`→`p-5` reflows a tight row → content at those sites is short labels; verified in evidence screenshots.
- **R6**: dark cards lose shadow (black on near-black) → **accepted** (card `oklch(0.205)` already separates from bg `oklch(0.141)`; dark mode also dormant). 1-line `.dark { --elevation-soft: … }` hook exists if review wants it later.
- **R7**: tests asserting sizes/padding/shadows break → grep-verified none exist; only `font-semibold`+`text-primary` (`f-ui.mjs:142`) and RDP day px (`h6` unit) are asserted, both untouched.

## Security Considerations
- CSS-only change. No auth/data/routing impact; evidence screenshots must be taken from a fresh browser profile with `localStorage` cleared (no prior booking PII), consistent with the existing evidence flow.

## Next Steps
- Phase-04 (font weight) then phase-05 (full verification + evidence + changelog).
