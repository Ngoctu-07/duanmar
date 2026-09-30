# Phase 1: Icons + Locale Switcher + Chatbot Downscale (83.33% / 60% + strokes)

**Plan**: [`plan.md`](plan.md) · **Est**: 1h · **Status**: completed · **Files**: 6 modify, 0 create

## Context Links
- Rollback source of truth: `plans/260930-1544-icon-switcher-price-prominence/phase-01-global-icons-and-locale-switcher.md` (probe table + size rule)
- **Size rule (verified by 1544 probe — keep)**: inside `<Button>` → `size-*` ONLY (strip h/w); outside Button → `h-* w-*` ONLY — `src/components/ui/button.tsx:6` carries `[&_svg:not([class*='size-'])]:size-4` (higher specificity; `h-5 w-5` inside Button collapses to 16px)
- Current measured (u-test run 2026-09-30): header/quick svgs 28×28 · adornments/sheet-links 24×24 · trigger 80×80 + inner 40 · switcher group h38/fs14, buttons h36, active fw800, inactive fw400

## Locked decision table (element · before → after · % of current)
| Element | file:line | before | after | % of current |
|---|---|---|---|---|
| header Search | `header.tsx:74` | `size-7` (28) | `size-6 stroke-[1.5]` (24) | 85.7% — nearest step (exact 83.33% = 23.33px) |
| header Luggage | `header.tsx:86` | `size-7` | `size-6 stroke-[1.5]` | 85.7% |
| header Menu (sheet trigger) | `header.tsx:97` | `size-7` | `size-6 stroke-[1.5]` | 85.7% |
| sheet Search link | `header.tsx:106` | `h-6 w-6` (24) | `h-5 w-5 stroke-[1.5]` (20) | **83.3% exact** |
| sheet Luggage link | `header.tsx:113` | `h-6 w-6` | `h-5 w-5 stroke-[1.5]` | 83.3% |
| hero input adornment | `hero-section.tsx:55` | `h-6 w-6` | `h-5 w-5 stroke-[1.5]` | 83.3% |
| /search input adornment | `search-client.tsx:65` | `h-6 w-6` | `h-5 w-5 stroke-[1.5]` | 83.3% |
| quick-access tiles ×5 | `quick-access-icons.tsx:24` | `h-7 w-7` (28) | `h-6 w-6 stroke-[1.5]` (24) | 85.7% — nearest step |
| chatbot trigger | `assistant-widget.tsx:210` | `size-20` (80) | `size-12` (48) | **60% exact** |
| MessageSquare | `assistant-widget.tsx:213` | `size-10` (40) | `size-6 stroke-[1.5]` (24) | **60% exact** |
| switcher group | `locale-switcher.tsx:22` | `text-sm font-medium` | `text-xs` (drop dead `font-medium`) | fs 14→12 = 85.7% |
| switcher buttons (active weight) | `locale-switcher.tsx:31` | `px-3 py-2` + active `font-extrabold` | `px-2.5 py-1.5` + active `font-semibold` | px exact 83.3% (12→10); py nearest step (8→6); fw 800→600 |
- Stroke scope: **13 rendered lucide icons** (header×3, sheet×2, hero, /search, quick×5, assistant MessageSquare). Resulting group height ≈30px (text-xs line box 16 + py 12 + border 2), buttons ≈28px.

## Decisions (KISS/YAGNI/DRY — locked)
1. **Rounding = nearest standard Tailwind step**: 83.33% of 28 = 23.33px → `size-6`/`h-6 w-6` (24px, 85.7%, max drift 0.67px). Alternative stated & rejected: arbitrary `size-[23px]` = exact 83.3% but non-standard, hurts scale legibility. Arbitrary values are reserved for Phase 2 where exact percentages (60/80) fall between steps.
2. **Stroke mechanism = Tailwind arbitrary class `stroke-[1.5]`** appended to the existing icon className. Evidence (probed 2026-09-30): offline TW 4.3.3 compile → `.stroke-1.5` **NOT generated** (default strokeWidth theme = 0/1/2/…) while `.stroke-[1.5]` → `stroke-width: 1.5` ✓; live Chromium → CSS class overrides lucide `stroke-width="2"` presentation attribute (computed `2px` → `1.5px`) ✓. Rejected: `stroke-1.5` (class doesn't exist → silent no-op), `strokeWidth={1.5}` prop (second styling channel beside className sizing), `@theme` strokeWidth addition (global config for one need — YAGNI).
3. **Stroke scope = only the 13 upscale-touched icons** — every other lucide icon keeps default 2 (grep `strokeWidth|stroke-1` in `src` = 0, so no existing stroke customization to respect or conflict).
4. **Switcher weights**: active `font-extrabold`→`font-semibold` (U3/U4 inequality `active.fw > inactive.fw` holds: 600 > 400). Inactive stays `font-normal` (never heavy — no change). Container `font-medium` (:22) is dead code (buttons own `font-normal`) → **remove** (closes 1544 code-review Nit, zero visual change). Rejected: deleting button `font-normal` to make container medium effective (would flip inactive 400→500 — unrequested behavior change).
5. **Chatbot exact 60%**: 80→48 (`size-12`) and 40→24 (`size-6`) both land on standard steps — no rounding. Keep `data-testid="assistant-trigger"`, `aria-*`, `size="icon"` + twMerge override mechanism (verified by 1544: `cn` drops conflicting `size-9`), `rounded-full shadow-soft`. Wrapper `fixed right-4 bottom-4 z-40` + panel untouched (48px box = smaller footprint, reclaims space under the z-[80] toast).
6. **"Structural padding" = audit negative**: 1544 upscaled ONLY switcher `px-2 py-1`→`px-3 py-2` (verified in its phase-01 probe table). Header `h-16`, hero `pl-10`, card `p-4/p-5`, `size="icon"` button geometry were never changed → the only padding rollback is the switcher's. Do NOT invent other padding edits.
7. **Icon buttons stay 36×36** (`size="icon"`): never upscaled by 1544 → excluded from the 83.33% scope; changing them breaks header geometry invariants (u-test U1 `:70`, `g-header`).

## Implementation Steps (ordered)
1. `src/components/layout/header.tsx` — `:74` `className="size-7"` → `"size-6 stroke-[1.5]"`; `:86` same; `:97` same; `:106` `className="h-6 w-6"` → `"h-5 w-5 stroke-[1.5]"`; `:113` same (links, not Button → h/w rule)
2. `src/components/homepage/hero-section.tsx:55` — `h-6 w-6` → `h-5 w-5 stroke-[1.5]` (keep `absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground`; `left-3(12)+20=32 < pl-10(40)` clearance preserved)
3. `src/components/search/search-client.tsx:65` — same transformation
4. `src/components/homepage/quick-access-icons.tsx:24` — `h-7 w-7` → `h-6 w-6 stroke-[1.5]` (covers all 5 tiles via single dynamic `<link.icon>` site)
5. `src/components/assistant/assistant-widget.tsx` — `:210` `size-20` → `size-12`; `:213` `size-10` → `size-6 stroke-[1.5]`
6. `src/components/layout/locale-switcher.tsx` — `:22` `text-sm font-medium` → `text-xs`; `:31` `px-3 py-2` → `px-2.5 py-1.5` and `data-[active=true]:font-extrabold` → `data-[active=true]:font-semibold`. Untouched: `role="group"`, `aria-label`, `data-active`, `aria-current`, `switchLocale`, lowercase `{locale}` text (contract `r-entry-popup-cms.mjs:235`), `opacity-60` inactive, both `<button>`s (not links)

## Acceptance Criteria
- [ ] Probed (not eyeballed): header/quick/sheet-trigger svgs 24×24 · hero + /search adornments + sheet-link svgs 20×20 · trigger 48×48 with inner svg 24×24 · switcher group ≈h30/fs12, buttons ≈h28, active fw600 vs inactive fw400
- [ ] All 13 touched icons: computed `strokeWidth ≤ 1.5`; untouched lucide icons remain 2
- [ ] 375px `/vi`: `scrollWidth ≤ innerWidth`; trigger rect inside viewport; locale click "en" → `/en`, active/inactive flip (fw + opacity + `aria-current`)
- [ ] `npm run lint` 0 · `npx tsc --noEmit` 0

## Out of scope (audit negatives)
- Assistant panel internals (`Menu`/`X`/`Send` at `assistant-widget.tsx:146,198`), footer/blog/review decorative icons, nav text links — never part of 1544 upscales
- No `Globe`/`Languages` icon exists (grep=0, per 1544); switcher stays text-only
- Padding: header `h-16`, hero `pl-10`, cards, `size="icon"` 36px buttons — untouched by 1544 → untouched now

**Status:** COMPLETED
