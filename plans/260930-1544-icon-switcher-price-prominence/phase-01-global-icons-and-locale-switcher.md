# Phase 1: Global Icon Upscaling + Locale Switcher Active State

**Plan**: [`plan.md`](plan.md) · **Est**: 1.5h · **Status**: pending · **Files**: 6 modify, 0 create

## Context Links
- **Verified probe (2026-09-30, dev :3000, headless Chromium)**:

| Element | class today | measured | note |
|---|---|---|---|
| header `Search` svg (`header.tsx:74`) | `h-5 w-5` in Button | **16px** | Button `[&_svg:not([class*='size-'])]:size-4` wins (`button.tsx:6`) |
| header icon buttons | `size="icon"` | 36×36 | `button.tsx:27` `icon: "size-9"` |
| quick-access svg (`quick-access-icons.tsx:24`) | `h-5 w-5` (no Button) | 20px | |
| hero input svg (`hero-section.tsx:55`) | `h-4 w-4` | 16px | `pl-10` = 40px clearance, icon at `left-3` |
| switcher group (`locale-switcher.tsx:21`) | `text-xs` | 62×26, btn 32×24, fs 12 | texts render `"en"`/`"vi"` (lowercase, CSS uppercase) |
| assistant trigger (`assistant-widget.tsx:204-214`) | `size="icon"` | **36×36**, svg 16 | NOT 48px as briefed |
| cascade probes | `h-7 w-7` in Button → 16px · `size-7` in Button → 28px · `size-7`+`h-5 w-5` outside Button → 20px · `h-7 w-7` outside → 28px | | |

- **Size rule (locking)**: inside `<Button>` → replace `h-N w-N` with `size-M` (no h/w classes left); outside `<Button>` → `h-M w-M` only.
- `Globe`/`Languages` icon: grep in `src` = **0 matches** — no language-selector icon exists; switcher is text-only (see Decisions).

## Decisions (KISS/YAGNI/DRY)
1. **"+150%" mapping** = user's own example (`w-5`→`w-7`): nominal-20px class → **28px** (`size-7`/`h-7 w-7`); nominal-16px input icons → **24px** (`h-6 w-6`, exactly 150%; keeps `left-3 (12) + 24 = 36 < pl-10 (40)` clearance). Real growth inside Buttons is 16→28 (the 16px baseline is the Button override bug-behavior we are correcting).
2. **Chatbot trigger**: keep `size="icon"` + add `className="size-20"` → twMerge keeps `size-20` = **80px = 222% of actual 36px** (inside user's 200–250% window; briefed 48px base was wrong). Inner `<MessageSquare>` → **`size-10` (40px)**, h/w stripped (else stays 16px).
3. **Switcher active state**: `useLocale()` from `next-intl` (precedent `destination-card.tsx:3`) → `data-active={locale === active}` activates the **already-written but dead** `data-[active=true]:*` rules at `locale-switcher.tsx:28`; add `font-extrabold`/`opacity` variants. **`aria-current="true"` on active — NOT `aria-pressed`** because `c-booking.mjs:111-114` and `s-tour-hero-carousel.mjs:190-193` assert `button[aria-pressed]` outside `#customer-reviews` == 0 on pages whose **global header** renders this switcher. `aria-current` is a global attribute, has zero test collisions (only nav-link readers in `p-tours-category.mjs:74`).
4. **No new Globe icon** (YAGNI): user's "language selector icon" presumes one exists; scaling the two text buttons satisfies "clickability". Adding an icon = new scope → unresolved Q.
5. **Header icon buttons stay `size="icon"` (36px)**: 28px icon fits (4px inset); avoids header geometry churn in 10+ tests. Optional polish after visual QA (`className="size-10"`) — not in default scope.

## Implementation Steps (ordered)
1. **`src/components/layout/header.tsx`**
   - `:74` `<Search className="h-5 w-5" />` → `className="size-7"` (Button context — strip h/w)
   - `:86` `<Luggage className="h-5 w-5" />` → `className="size-7"`
   - `:97` `<Menu className="h-5 w-5" />` → `className="size-7"` (mobile SheetTrigger Button)
   - `:106` sheet `<Search className="h-4 w-4" />` → `"h-6 w-6"` (plain `<Link>`, not Button)
   - `:113` sheet `<Luggage className="h-4 w-4" />` → `"h-6 w-6"`
2. **`src/components/homepage/hero-section.tsx:55`** — `<Search className="absolute left-3 top-1/2 h-4 w-4 …">` → `h-6 w-6` (absolute adornment, no Button).
3. **`src/components/search/search-client.tsx:65`** — same `h-4 w-4` → `h-6 w-6`.
4. **`src/components/homepage/quick-access-icons.tsx:24`** — `h-5 w-5` → `h-7 w-7` (inside `<Card>`/`<Link>`, no Button; navigation tiles in scope).
5. **`src/components/assistant/assistant-widget.tsx`**
   - `:210` `className="rounded-full shadow-soft"` → `className="size-20 rounded-full shadow-soft"`
   - `:213` `<MessageSquare className="h-5 w-5" aria-hidden />` → `className="size-10"` (h/w must be removed)
   - Wrapper `fixed right-4 bottom-4 z-40` (:130) unchanged — 80px box stays inside 375px viewport (x: 279–359), panel `min(92vw,24rem)` unaffected.
6. **`src/components/layout/locale-switcher.tsx`** (only logic change in plan)
   - `:3` add `useLocale` → `import { useTranslations, useLocale } from "next-intl";`
   - after `:10` add `const activeLocale = useLocale();`
   - `:21` container → `className="flex items-center rounded-md border overflow-hidden text-sm font-medium"` (`text-xs`→`text-sm`; **`overflow-hidden` added** so the new active `bg-muted` respects `rounded-md`)
   - `:27-28` button props → add `data-active={locale === activeLocale}` and `aria-current={locale === activeLocale ? "true" : undefined}`
   - `:28` classes → `className="px-3 py-2 font-normal uppercase transition-colors hover:bg-muted text-muted-foreground opacity-60 data-[active=true]:bg-muted data-[active=true]:text-foreground data-[active=true]:opacity-100 data-[active=true]:font-extrabold"`
   - Result ≈ 88×36 group, per-button ≈ 43×36 (was 32×24): `text-sm` (14px), `py-2` → 36px tall ≥32px tap target. Active = `bg-muted` + `text-foreground` + fw 800 + opacity 1; inactive = `text-muted-foreground` + button's own `font-normal` (400, overrides container `font-medium` — user's "normal weight") + opacity 60.
   - Keep `role="group"`, `aria-label`, `type="button"`, `switchLocale` logic, lowercase `{locale}` text (contract: `r-entry-popup-cms.mjs:235` matches `textContent === "en"|"vi"`), both `<button>` elements (not links).

## Acceptance Criteria
- [ ] Desktop `/vi`: header Search + Luggage svgs measure 28×28; hero input svg 24×24; quick-access svgs 28×28 (probed, not eyeballed)
- [ ] Mobile 375: sheet trigger svg 28, sheet link svgs 24, page `scrollWidth <= innerWidth`
- [ ] Trigger measures 80×80 (72–90 window) with 40×40 inner svg; `data-testid="assistant-trigger"` + `aria-expanded` semantics unchanged
- [ ] `/vi` → `vi` button has `aria-current="true"`, fw≥800, opacity 1, bg ≠ transparent; `en` fw<vi, opacity ≤0.65, no `aria-current`; click `en` → path `/en`, states swap
- [ ] Switcher buttons ≥32px tall, container font-size 14px
- [ ] `npm run lint` 0 · `npx tsc --noEmit` 0

## Known minor risk
- 80px trigger sits under the payment-success toast (`payment-success-toast.tsx:11`, `fixed right-4 bottom-4 z-[80]`, `pointer-events-none`) — same corner, cosmetic overlap only, no click blocking.

## Out of scope (audit negatives)
- No `Globe`/`Languages` icon anywhere in `src` (grep=0) → nothing to upscale for "language selector icon"; text-only switcher kept.
- Nav links (`header.tsx:51-62`) are icon-less text → nothing to change.
- `Menu`/`X`/`Send` inside assistant panel (`assistant-widget.tsx:146,198`) = secondary controls, not "primary UI icons" → unchanged.
- Footer/blog/review decorative icons (`heart-button.tsx:70`, `review-*`, marketing pages) → not header/nav/input → unchanged.

## Verify (manual, after edits)
```bash
node tests/browser/g-header.mjs && node tests/browser/a-ux-microinteractions.mjs   # header invariants
# visual: /vi desktop header, /vi 375 sheet, homepage hero + quick access, chatbot trigger, switcher EN/VI
```
**Status:** PENDING
