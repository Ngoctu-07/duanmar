# Phase 3: Footer Red Theme + Knockout Logo Swap

**Plan**: [`plan.md`](plan.md) · **Est**: 1.25h · **Status**: pending (needs Phase 2 asset) · **Files**: 2 modify

## Context Links
- **Current footer** `src/components/layout/footer.tsx` (128 lines): root `border-t bg-muted/50 print:hidden` :28 · brand `BrandLogo size={88}` :32 · wordmark (NO color class) :34 · tagline `text-sm text-muted-foreground` :36 · 3 h3 (NO color, inherit body `text-foreground`) :40/:56/:80 · links `text-lg text-muted-foreground hover:text-foreground transition-colors` :46/:69/:86 · bottom bar `border-t pt-8 text-sm text-muted-foreground` :96, copyright p :97, 4 legal links `hover:text-foreground` :101/:108/:114/:120.
- **Rendered from**: `src/app/[locale]/layout.tsx:4,:35` (global, all routes).
- **Why root `text-white` is mandatory**: wordmark `BrandWordmark` (`brand-wordmark.tsx:5`, no color) + 3 column h3 + copyright inherit body `text-foreground` = rgb(9,9,11) → **2.38:1 on #9f0618 (AA fail)** if only backgrounds change. Single `text-white` on root = DRY fix covering all inheritance.
- **BrandLogo usage audit (grep)**: exactly 2 call sites — `header.tsx:40` (`size={36} priority`) and `footer.tsx:32` (`size={88}`) → `variant` prop swaps footer only, header untouched (D4).
- **Measured contrast** (see plan.md Context): white on `bg-primary` rgb(159,6,24) = **8.36:1**; hover `text-white/80` = **5.66:1** (≥4.5 ✓); `text-white/70` = 4.56 (rejected); current `hover:text-foreground` on red = **2.38:1**. Dark-mode token `--primary` #da534f + white = 3.94:1 — dark unreachable (no toggle; `layout.tsx:34` never sets `.dark`; grep `classList|data-theme|next-themes` = 0) → documented, no code (YAGNI).

## Class Map (exact before → after)
| Element (line) | Before | After |
|---|---|---|
| root `<footer>` (:28) | `border-t bg-muted/50 print:hidden` | `bg-primary text-white print:hidden` (border-t dropped: red↔white block edge self-separates; beige hairline clashes) |
| `BrandLogo` (:32) | `size={88} className="mb-3"` | `size={88} variant="knockout" className="mb-3"` |
| wordmark h3 (:33-35) | `mb-4` (inherits dark) | unchanged — inherits `text-white` from root |
| tagline p (:36) | `text-sm text-muted-foreground` | `text-sm` (inherits white) |
| h3 headings (:40,:56,:80) | `text-2xl font-semibold mb-5` | unchanged (inherit white) |
| column links (:46,:69,:86) | `text-lg text-muted-foreground hover:text-foreground transition-colors` | `text-lg hover:text-white/80 transition-colors` |
| bottom bar (:96) | `... border-t pt-8 text-sm text-muted-foreground ...` | `... border-t border-white/20 pt-8 text-sm ...` (divider ON red, rgba(255,255,255,.2)) |
| copyright p (:97) | none (inherits dark) | unchanged — inherits white |
| legal links (:101,:108,:114,:120) | `hover:text-foreground transition-colors` | `hover:text-white/80 transition-colors` |

## Tasks
1. [ ] `brand-logo.tsx`: add `variant?: "default" | "knockout"` (default `"default"`), `src = variant === "knockout" ? "/images/logo-duanmar-white.png" : "/images/logo-duanmar.png"` — file: `src/components/layout/brand-logo.tsx` (~24→30 lines). Keep `cn("shrink-0 rounded-full", className)` (badge is circular-inscribed; knockout corners already transparent → no visual change).
2. [ ] `footer.tsx`: apply class map row-by-row — file: `src/components/layout/footer.tsx` (128 lines, unchanged count)
3. [ ] Post-edit grep on `footer.tsx`: `muted-foreground|hover:text-foreground` = **0 hits**; `text-white` present on root only (inheritance does the rest)
4. [ ] Verify `print:hidden`, grid markup, `Link`/`a` structure, hrefs, i18n keys all byte-identical (only className strings change)

## Acceptance Criteria
- [ ] `npx tsc --noEmit` 0 (variant prop typed), `npm run lint` 0
- [ ] Visual @1280: red footer, all text white, knockout badge legible at 88px, red visible through lettering/pig (screenshot in m2 test)
- [ ] Header logo unchanged (still solid `logo-duanmar.png`, ≤40px — `m-footer-brand` H2/H5 green)
- [ ] Geometry invariants untouched: `o-footer-refinement` O1a (grid 4 children) / O2b, `q-footer-asym-layout` Q5 ratios, `m-footer-brand` F1-F11 → all green with NO edits to those files
- [ ] `docs`-affecting: none this phase (changelog in P4)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Missed `text-muted-foreground` node → gray-on-red (≈2:1) | High | Full class map above; step 3 grep + m2 asserts every `h3/a/p` = rgb(255,255,255) |
| Root `text-white` forgotten → wordmark/headings dark (2.38:1) | High | Row 1 locks it; m2 asserts `footer` computed color white |
| Header accidentally swapped too | Med | `variant` defaults to solid; only footer passes `knockout`; H2/H5 regression check |
| next/image 404 (asset missing) | Med | Phase 2 dependency enforced; m2 T4 fails on src/alpha |

## Rollback
Revert the 2 files; asset from Phase 2 can remain (harmless orphan) or be removed with P2 revert.

## Next Steps
Phase 4 (tests + gates + docs).
**Status:** PENDING
