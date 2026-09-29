# Phase 02 — Primary Red Tone-Down (Light + Dark)

## Context Links
- Binding decision #1 · [plan.md](plan.md)
- `src/app/globals.css` — light `:root` **59, 71, 72, 80, 85** · dark `.dark` **95, 107, 108, 115, 120**
- Consumers auto-follow (no tsx edits): 54 `text-primary`, 14 `bg-primary`, 10 `bg-primary/10`, 6 `hover:bg-primary/90`, `hero-section.tsx:22` `from-primary/10`, RDP vars `travel-date-field.tsx:27-28`
- Prior palette plan: `plans/260927-2100-.../phase-01-global-color-palette-refactor.md`

## Overview
**Priority**: P1 (AC2, eye-strain) · **Status**: Pending · **Effort**: ~30 min · **Files**: 1 (`globals.css`) · **New files**: 0

## Key Insights
1. Light mode: all 5 red tokens are literally `oklch(0.5 0.19 25)` → one replacement across 5 lines. Resolved hex **#9F0618** (the "≈#991B1B" in the brief is an approximation; the binding is the oklch value).
2. Contrast (computed, verified script): white↔#9F0618 = **8.38:1** (AA ✓, was 6.63:1); `text-primary` on white 8.38 ✓; on light `--muted` 7.64 ✓; `hover:bg-primary/90` + white text = 7.23 ✓; `text-primary` on `bg-primary/10` tint = 6.94 ✓; focus `ring/50` on white improves 2.58 → **2.90** (still slightly under 3:1 — pre-existing, not a regression).
3. **Dark mode is the trap**: `.dark` `--primary-foreground` is `oklch(0.141 …)` (near-black) — buttons use DARK text on primary, and `text-primary` must clear 4.5:1 on `--background`(#09090B), `--card`(#171719) and `--muted`(#2F2F30). The suggested `oklch(0.55 0.17 25)` fails (3.39 / 3.76 / 2.86).

| Dark candidate | #hex | vs bg #09090B | vs card #171719 | vs muted #2F2F30 | verdict |
|---|---|---|---|---|---|
| 0.55 0.17 25 (suggested) | #C13C3B | 3.76 ✗ | 3.39 ✗ | 2.86 ✗ | rejected |
| 0.58 | #CB4644 | 4.27 ✗ | 3.85 ✗ | 3.25 ✗ | rejected |
| 0.60 | #D24C49 | 4.64 ✓ | 4.18 ✗ | 3.53 ✗ | rejected |
| **0.62 0.17 25 (CHOSEN)** | **#DA534F** | **5.04 ✓** | **4.54 ✓** | 3.83 ✗ | accepted |
| 0.68 (current) | #EF6661 | 6.39 ✓ | 5.76 ✓ | 4.86 ✓ | kept only if muted use found |

4. Chosen **`oklch(0.62 0.17 25)`**: darkest value that keeps AA on bg + card + button-text while visibly muting the red (0.68 → 0.62). Residual: `text-primary` directly on `--muted`/`--accent`/`--secondary` = 3.83:1 — same-line grep found **no** `bg-muted` + `text-primary` pair, and **dark mode is dormant** (no theme toggle, no `.dark` applier anywhere in `src/`). Documented as monitored edge, not a blocker.
5. `--destructive` light `oklch(0.577 0.245 27.325)` / dark `oklch(0.704 0.191 22.216)` **stay** (split-role convention: decoration = primary, errors = destructive); `--primary-foreground` white stays; `--chart-2` light `oklch(0.72 0.14 25)` **stays** (lighter ramp tint, still legible — computed 2.63:1 vs white is fine for a chart fill, it is not text).

## Requirements
- Functional: 5 light + 5 dark token lines replaced; every `text-primary`/`bg-primary` consumer follows automatically.
- Non-functional: no hardcoded hex added to any tsx; `--destructive`/`--chart-2`/`--primary-foreground` byte-identical after edit; contrast ≥4.5:1 for text pairs in light mode (all listed) and ≥4.5:1 for dark bg/card/button pairs.

## Related Code Files
- **Modify (1)**: `src/app/globals.css`
- **Create / Delete**: none

## Implementation Steps
1. Light `:root` — replace `oklch(0.5 0.19 25)` → `oklch(0.444 0.177 25.331)` at:
   - `:59` `--primary`, `:71` `--ring`, `:72` `--chart-1`, `:80` `--sidebar-primary`, `:85` `--sidebar-ring`
   - Guard: `grep -n "oklch(0.5 0.19 25)" src/app/globals.css` → 5 hits before, **0 after**.
2. Dark `.dark` — replace `oklch(0.68 0.17 25)` → `oklch(0.62 0.17 25)` at:
   - `:95` `--primary`, `:107` `--ring`, `:108` `--chart-1`, `:115` `--sidebar-primary`, `:120` `--sidebar-ring`
   - Guard: `grep -n "oklch(0.68 0.17 25)" src/app/globals.css` → 5 hits before, **0 after**.
3. Freeze-list check (must be byte-identical): `--destructive` (`:67`), `--chart-2` (`:73` light, dark equivalent), `--primary-foreground` (`:60`), dark `--primary-foreground`.
4. Re-run the contrast script (`plans/…/reports/` note or ad-hoc node) and paste final ratios into phase-05 evidence notes.
5. Visual review of tinted surfaces on `/vi` + `/en`: `bg-primary/10` eyebrow blocks, hero gradient `from-primary/10`, selected RDP day, primary CTA buttons — confirm "muted, not vibrant" and no loss of legibility.
6. Smoke: `npm run lint` + `npm run build` (type/CSS sanity) — full suite in phase-05.

## Todo List
- [ ] Replace 5 light token lines + guard grep (5 → 0)
- [ ] Replace 5 dark token lines + guard grep (5 → 0)
- [ ] Freeze-list diff check (destructive / chart-2 / primary-foreground unchanged)
- [ ] Contrast ratios recorded (light + dark table)
- [ ] Visual pass on `bg-primary/10`, hero gradient, RDP selected day, CTA buttons
- [ ] `npm run lint` + `npm run build`

## Success Criteria
- `grep -c "oklch(0.5 0.19 25)"` and `grep -c "oklch(0.68 0.17 25)"` in `globals.css` = 0; new values present exactly 5× each.
- White↔primary ≥ 4.5:1 (8.38); dark bg/card/button pairs ≥ 4.5:1.
- No tsx file modified in this phase.

## Risk Assessment
- **R1**: `--ring` darkening weakens focus visibility → measured 2.58 → 2.90 on white (improvement); accept, note in changelog.
- **R2**: `--chart-1` follows primary → chart series shift darker; `--chart-2` unchanged keeps the ramp readable. No chart components found in `src/components` (grep empty) → low impact.
- **R3**: dark `text-primary` on muted surfaces <4.5 → mitigated by (a) no same-element occurrence, (b) dormant dark mode; if a dark toggle ships later, bump dark primary to ≥0.66.
- **R4**: eye-strain AC judged subjectively → evidence screenshots in phase-05 for user sign-off.

## Security Considerations
- Color tokens only. No auth/data/URL impact; `--destructive` untouched so error affordances keep their tested contrast.

## Next Steps
- Phase-03 edits the same file — run after this so both diffs stay separable.
