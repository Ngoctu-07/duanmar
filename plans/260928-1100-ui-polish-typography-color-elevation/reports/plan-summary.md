# Plan Summary — UI Polish: Typography, Color Muting, Component Elevation

**Plan**: `plans/260928-1100-ui-polish-typography-color-elevation/` · **Date**: 2026-09-28 · **Status**: Planning complete, awaiting approval

## Decisions (binding respected; planner-resolved items marked ★)
| # | Decision | Value / choice |
|---|---|---|
| 1 | Brand rename | 35 `src/` hits `DuanMAR`→`DuanMar` + 1 new changelog entry; `docs/`(4) + `plans/`(36) history, git remote, `vietnam-tourism*` untouched |
| 2 | Red (light) | `oklch(0.444 0.177 25.331)` ≈ #9F0618 on `--primary/--ring/--chart-1/--sidebar-primary/--sidebar-ring` (light 5 + dark 5); white↔8.38:1 |
| ★3 | Red (dark) | `oklch(0.62 0.17 25)` ≈ #DA534F — suggested `0.55` FAILS AA (3.39:1 dark card / 3.76 bg); 0.62 = darkest value passing bg 5.04 / card 4.54 / button-text 5.04 |
| ★4 | Elevation mechanism | raw token `--elevation-soft` in `:root` + `@theme inline --shadow-soft` alias + **one** `@layer components .rounded-xl.border` rule covering all 43 idiom sites (0 site edits; opt-out `shadow-none`; bulk-class fallback documented) |
| ★5 | Elevation ladder | controls `shadow-sm` (resting) → cards `shadow-soft` (resting) → `shadow-md` (hover, 3 existing hover sites only); ring removed from `card.tsx:14`; ghost/link flat; overlays + header untouched; no hover on `transition-colors` idiom rows (transition-property conflict) |
| ★6 | Volume | control heights `h-8`→`h-9` family (button default/icon, input, select trigger; `lg`/`icon-lg`→10) — fixes existing `h-8` input vs `h-9` submit mismatch, 8 page CTAs already `h-9`; `--card-spacing` 4→5; idiom floor `p-4`→`p-5` (5 of 6; `w-56` ticker keeps `p-4`) |
| 7 | Font weight | `--font-weight-body: 450` + `@apply font-body` on `body`; 169 `font-medium/semibold/bold` lines untouched; Inter is variable (no `weight` array) |
| 8 | Explicitly unchanged | `--destructive` (both modes), `--chart-2`, `--primary-foreground`, sheet/select-popup shadows, header, dead `navigation-menu.tsx`, dark-mode shadow override (dark mode is dormant — no toggle in `src/`) |

## File-touch estimate
- **Modify**: ~40 files — 32 rename (`src/app/**` pages, `layout.tsx`, `footer.tsx`, `brand-wordmark.tsx`, `en/vi.json`), 1 `globals.css` (phases 2+3+4, +~9 lines → stays <200), 5 `ui/` primitives (`card/button/input/textarea/select`), 3 hover sites, 5 padding sites, `docs/project-changelog.md` (append), plan files.
- **Create**: 0 in `src/`; plan dir (7 files) + `evidence/*.png` (3) + `reports/verification-log.md`.
- **Tests**: 0 edits (0 rename hits; no height/padding/shadow assertions — grep-verified).

## Risks (top 6)
1. Compound-selector rule rejected in review → documented fallback = bulk `shadow-soft` on 43 sites (same tests, bigger diff).
2. `shadow-soft` utility / `font-body` `@apply` fails to compile → built-CSS greps in phase-05 catch it; fallbacks documented (arbitrary `shadow-[var(--elevation-soft)]`; explicit `font-weight: var(--font-weight-body)`).
3. Height bump alignment → bounded (7 non-default sizes, no `h-8` parents outside `ui/`), caught by browser suite + visual pass.
4. Dark `text-primary` on `--muted` = 3.83:1 → no same-element occurrence + dark mode unreachable today (no toggle in `src/`); revisit if a theme toggle ships (≥0.66).
5. Date-sensitive `h4-p4-e2e` / `f-ui` regression → run in phase-05 order; never edit assertions.
6. **No clean git baseline** — single `init` commit, 51 pre-dirty paths (prior plans uncommitted) → diff-based per-phase gates unusable; all gates are grep/count based; no commits without explicit request.

## Open questions for the lead
1. **Elevation mechanism** — approve the single `@layer components` rule (my recommendation), or switch to explicit `shadow-soft` classes on all 43 sites? Cost is either 1 CSS rule or a 32-file diff.
2. **Select trigger in "inputs"** — binding says "buttons/inputs"; I include `select.tsx:43` trigger for form-row consistency (popup untouched). Confirm.
3. **Dark red `0.62`** — confirm replacing the researcher's suggested `0.55` on contrast grounds (table in phase-02).
4. **Baseline commit?** — current tree is fully uncommitted; a `chore`-free WIP commit before implementation would make phase diffs reviewable. Do you want one (I will not commit unless told)?

## Docs impact
minor — `docs/project-changelog.md` append + plan statuses.
