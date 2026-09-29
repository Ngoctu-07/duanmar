# Phase 01 — Global Color Palette Refactor (Red / Black / White)

**Date**: 2026-09-27 · **Priority**: P0 · **Status**: Complete · **Est**: 0.5 day

## Context Links
- **Research**: [research/research-summary.md](research/research-summary.md) §1
- **Plan**: [plan.md](plan.md)
- **Rules**: `.claude/rules/development-rules.md`
- **Key file**: `src/app/globals.css` (129 lines — stays <200 after edit)

## Overview
Rewrite the design tokens so the whole site turns Red/Black/White: sophisticated deep crimson primary, soft-black text, white breathing backgrounds. Because color is 100% token-driven, this phase is almost entirely a single-file edit; the ~446 token-class usages in 64/75 tsx files repaint with **zero tsx edits**.

## Key Insights
- `:root` (L50-83) holds the palette; `@theme inline` (L7-48) maps tokens → Tailwind classes; base layer (L119-129) applies `border-border outline-ring/50` and `bg-background text-foreground`.
- `.dark` block (L85-117) is **dead** — no theme toggle exists, `.dark` never applied. Decision: keep it but sync values (low cost, prevents future drift).
- `--destructive` is already red and used decoratively ~14 spots → split roles: decorative → `--primary`; `--destructive` reserved for errors (hotter purer red, hue ≈ 27).
- `--destructive-foreground` is **undefined** → real contrast bug at `src/components/booking/travel-date-field.tsx:169`.
- Only 2 hardcoded colors exist (`text-green-700`, `bg-black/10`) — both recommended to keep.

## Requirements
### Functional
- [x] `--primary` = deep crimson ≈ `oklch(0.50 0.19 25)` (`#B91C1C`), elegant not neon
- [x] `--foreground`/heavy text = soft black `#18181B`
- [x] Backgrounds white / negative space, high contrast, breathable
- [x] Warm-neutral harmony for muted/secondary/accent/border/input (hue ≈ 60-80, low chroma)
- [x] `--destructive` kept distinct for errors only; decorative red uses migrate to `--primary`
- [x] Define `--destructive-foreground` (bug fix) in `:root`, `.dark`, and `@theme inline`
- [x] Retune `--chart-1..5`, `--sidebar-*` to the brand ramp

### Non-functional
- Contrast ≥ 4.5:1 for body text and CTA (white-on-crimson and crimson-on-white), ≥ 3:1 for focus/non-text
- No tsx file edits required for color (except the destructive→primary migration in Phase 1 step 6)
- `globals.css` remains < 200 lines

## Architecture
```
:root tokens  ──►  @theme inline (--color-*)  ──►  Tailwind utilities (bg-primary, text-muted-foreground…)
     │                                                     │
     └─► .dark (synced, unused today)                      └─► ~446 usages / 64 tsx repaint automatically
@layer base (border-border, outline-ring/50, bg-background) ──► global chrome
```

## Related Code Files
**Modify**
- `src/app/globals.css` — `:root` L50-83, `.dark` L85-117, `@theme inline` L7-48
- Decorative `--destructive` → `--primary` spots (8 files, see research §1.4): `booking-contact-section.tsx:27`, `booking-date-section.tsx:38`, `booking-difficulty-section.tsx:32`, `booking-payment-section.tsx:99,154`, `booking-pricing-section.tsx:38,72`, `booking-summary.tsx:79,82`, `my-trips-detail.tsx:76`, `price-block.tsx:28,73`, `price-range.tsx:20`, `travel-date-field.tsx:27,28,60,167,169,171`
- `components.json` — optional: shadcn `baseColor` → `red` for future `shadcn add`

**Create**: none. **Delete**: none.

## Implementation Steps
1. In `src/app/globals.css` `@theme inline`, add `--color-destructive-foreground: var(--destructive-foreground);` (next to L28).
2. Replace `:root` L51-82 with the exact token table:

| Token | Value | ≈ Hex | Notes |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `#FFFFFF` | unchanged |
| `--foreground` | `oklch(0.141 0.005 285.823)` | `#18181B` | soft black (zinc-900) |
| `--card`, `--popover` | `oklch(1 0 0)` | `#FFFFFF` | unchanged |
| `--card-foreground`, `--popover-foreground` | `oklch(0.141 0.005 285.823)` | `#18181B` | |
| `--primary` | `oklch(0.50 0.19 25)` | `≈ #B91C1C` | deep crimson |
| `--primary-foreground` | `oklch(1 0 0)` | `#FFFFFF` | 6.5:1 on primary |
| `--secondary` | `oklch(0.968 0.006 75)` | `≈ #F6F5F2` | warm off-white |
| `--secondary-foreground` | `oklch(0.205 0.005 285)` | `≈ #2E2E33` | |
| `--muted` | `oklch(0.968 0.006 75)` | `≈ #F6F5F2` | |
| `--muted-foreground` | `oklch(0.52 0.015 60)` | `≈ #79726B` | ~5.5:1 on white |
| `--accent` | `oklch(0.968 0.006 75)` | `≈ #F6F5F2` | |
| `--accent-foreground` | `oklch(0.205 0.005 285)` | `≈ #2E2E33` | |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#DC2626` | unchanged — errors only |
| `--destructive-foreground` | `oklch(1 0 0)` | `#FFFFFF` | **NEW — fixes bug** |
| `--border`, `--input` | `oklch(0.915 0.006 75)` | `≈ #E8E6E2` | warm hairline |
| `--ring` | `oklch(0.50 0.19 25)` | `≈ #B91C1C` | crimson focus (solid `border-ring` carries 3:1) |
| `--chart-1` | `oklch(0.50 0.19 25)` | crimson | |
| `--chart-2` | `oklch(0.72 0.14 25)` | light crimson | |
| `--chart-3` | `oklch(0.42 0.02 285)` | slate | |
| `--chart-4` | `oklch(0.62 0.02 75)` | warm gray | |
| `--chart-5` | `oklch(0.86 0.03 80)` | cream | |
| `--radius` | `0.625rem` | unchanged | |
| `--sidebar` | `oklch(0.985 0.004 75)` | | |
| `--sidebar-foreground` | `oklch(0.141 0.005 285.823)` | | |
| `--sidebar-primary` | `oklch(0.50 0.19 25)` | crimson | |
| `--sidebar-primary-foreground` | `oklch(1 0 0)` | | |
| `--sidebar-accent` | `oklch(0.968 0.006 75)` | | |
| `--sidebar-accent-foreground` | `oklch(0.205 0.005 285)` | | |
| `--sidebar-border` | `oklch(0.915 0.006 75)` | | |
| `--sidebar-ring` | `oklch(0.50 0.19 25)` | | |

3. Sync `.dark` (keep block, mirror roles): `--primary: oklch(0.68 0.17 25)` + `--primary-foreground: oklch(0.141 0.005 285.823)` (lighter crimson + dark text for legibility on dark bg); `--destructive-foreground: oklch(0.141 0.005 285.823)`; foreground `oklch(0.985 0 0)`; secondary/muted/accent `oklch(0.269 0.005 285)`; border/input keep existing alphas; sidebar mirrors light-mode values with dark surfaces.
4. Migrate decorative `--destructive` → `--primary` in the files listed in research §1.4 (eyebrow labels, price figures, `CheckCircle2`, rdp accent vars, calendar day states). Leave semantic error uses on `--destructive` (`booking-field.tsx:22`, `aria-invalid:*` in ui primitives).
5. Leave `text-green-700` (`booking-payment-section.tsx:161`) and `bg-black/10` (`sheet.tsx:31`) as-is.
6. Optional: `components.json` `baseColor` → `red`.
7. Run verification commands, then screenshot `/en` + `/vi`: home, booking, pricing, my-trips, a destination detail.

## Todo List
- [x] `@theme inline`: add `--color-destructive-foreground`
- [x] `:root`: apply full token table above
- [x] `.dark`: sync values (keep block)
- [x] Migrate decorative destructive → primary (13 files)
- [x] Confirm `travel-date-field.tsx:169` now renders white-on-red correctly
- [x] Visual pass: home / booking / pricing / my-trips / detail
- [x] `npm run lint` · `npm run build` · `npm test` · `npm run test:browser`

## Success Criteria
- [x] White bg + `#18181B` body text; primary CTAs deep crimson (≈`#B91C1C`), not neon
- [x] Contrast ≥ 4.5:1: white↔primary, foreground↔background, muted-foreground↔background, white↔destructive (measure via DevTools or WebAIM)
- [x] Focus ring visibly brand-colored and ≥ 3:1 (solid `border-ring`)
- [x] Zero tsx edits needed beyond the destructive→primary migration
- [x] `npm run lint`, `npm run build`, `npm test`, `npm run test:browser` all pass with 0 failures
- [x] `globals.css` < 200 lines

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| Contrast regression on buttons/badges | Med | Verify the table's computed ratios; adjust L by ±0.02 |
| White-on-crimson CTA fails AA | High | `#B91C1C` = 6.5:1 — re-measure after any tweak |
| Dead `.dark` block drifts | Low | Keep + sync now (recommended, low cost) |
| Migrating too many destructive uses | Med | Only migrate decorative list; keep `role="alert"`/`aria-invalid` red |
| `--ring` at `/50` alpha too faint | Low | Solid `border-ring` (full opacity) provides the 3:1 edge; verify visually |

## Security Considerations
- No auth/data impact. Tokens are static CSS — no user input, no secrets.
- Do not commit `.env*` or keys (none involved).

## Next Steps
- → Phase 02 (brand name migration), independent of color but review together on the dev server.
- Follow-up: docs update (`docs/project-changelog.md`, roadmap) after all 3 phases.

---

**Decisions already made (do not re-litigate)**: deep crimson primary ≈ `#B91C1C` / `oklch(0.50 0.19 25)`; soft black `#18181B`; split destructive roles (decorative → `--primary`, errors stay `--destructive`); keep `.dark` block but sync; brand + visible copy only scope.
