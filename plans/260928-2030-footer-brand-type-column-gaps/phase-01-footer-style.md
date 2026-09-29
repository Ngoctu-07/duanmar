# Phase 01 — Footer Style: AC1 Brand Wordmark + AC2 Column Gaps

**Status**: Complete · **Priority**: High · **Depends on**: — (self-contained; P2 verifies)

## Context Links
- Target file: `src/components/layout/footer.tsx` (128 LOC) — edit ONLY `:30` (grid classes) and `:34` (BrandWordmark className).
- Shared wordmark: `src/components/layout/brand-wordmark.tsx:4-6` — `cn("font-brand", className)`, sizing comes from call-site; **DO NOT EDIT** (header `header.tsx:36` shares it, unaffected if untouched).
- Brand block structure: `:31` `col-span-2 md:col-span-1` → `:32` `<BrandLogo size={44} className="mb-3" />` → `:33` `<h3 className="mb-4">` → `:34` wordmark → `:36` tagline `text-sm text-muted-foreground`.
- House display-type precedent: `src/components/homepage/hero-section.tsx:37` `text-4xl md:text-6xl font-bold tracking-tight`; header `header.tsx:36` `text-xl font-bold` (20px baseline for 200–300% math).
- Arbitrary grid track precedent: `src/components/ui/card.tsx:27` `grid-cols-[1fr_auto]` (Tailwind v4.3.3, `@theme inline` only, stock type scale — `text-4xl`=36px, `text-5xl`=48px; Sora `--font-brand` variable 100–800 → `font-bold`=700 real).
- Test contract that constrains markup: `tests/browser/m-footer-brand.mjs:28-47` (direct children of `footer .grid`), `:103` exactly 4, `:104-108` title order, `:135-139` brand=child0 logo+tagline, `:140` `footer .mt-8 a`, `:86+97` no overflow @1280.

## Overview
- **Priority**: High · **Status**: Complete · **Effort**: ~15 min (2 class strings)
- AC1: wordmark 200–300% vs 16px baseline → 36px (225%) mobile / 48px (300%) md+, styled (`leading-none`, `tracking-tight`, `font-bold`), integrates with logo+tagline, no column break.
- AC2: 3 nav lists drastically tighter horizontally on **desktop + tablet** (32→24px gaps AND nav tracks max-content so cluster hugs right); mobile grid untouched.

## Key Insights
- Today `grid grid-cols-2 md:grid-cols-4 gap-8` gives 4 equal `1fr` tracks (288px @1280) while nav content ≈120px → dead space = "spread". Fix = `auto` tracks (max-content) + smaller `gap-x`.
- `1fr` (brand) absorbs all slack → brand track grows, nav group right-hugs; brand `min-content` floor = unbreakable wordmark ≈190px @48px, which is exactly why AC1 requires AC2 (≥190px brand track at md).
- `md:gap-x-6` (24px) overrides base `gap-x-6` (same value — explicit, harmless); `gap-y-8` (32px) untouched by `md:` → vertical rhythm unchanged.
- `auto` tracks never cause grid overflow until min-content (longest word) exceeded → locale width variance (EN/VI) degrades gracefully, not into overflow.

## Requirements
- **AC1**: footer wordmark = `text-4xl md:text-5xl font-bold tracking-tight leading-none` on `BrandWordmark` call-site; `<h3 className="mb-4">` wrapper kept; text exactly `DuanMar`; logo (`mb-3`) + tagline unchanged.
- **AC2**: `footer.tsx:30` → `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1fr_auto_auto_auto] md:gap-x-6`.
- Invariants: exactly 4 direct children of `footer .grid`, order brand→tours→contact→info, classes `grid` + `mt-8` literal, no wrapper divs.
- Non-goals (YAGNI): no `globals.css`/`--text-*` tokens, no header change, no `brand-wordmark.tsx` change, no mobile layout change beyond `gap-x` 32→24.

## Architecture (short)
Layout data flow: `footer.tsx` grid (2 cols mobile / `[1fr auto auto auto]` md+) → child 0 brand lockup (`BrandLogo` + `h3 > BrandWordmark` + tagline) sized by call-site classes; children 1–3 nav lists become max-content tracks → free space all flows to `1fr` brand → nav cluster occupies 313px (measured) hugging right edge @xl (was ~928px spread).

## Related Code Files
- **Modify**: `src/components/layout/footer.tsx` (`:30`, `:34`)
- **Create**: none in this phase
- **Delete**: none
- **Read-only**: `brand-wordmark.tsx` · `header.tsx` · `globals.css` · `tests/browser/m-footer-brand.mjs`

## Implementation Steps
1. Open `src/components/layout/footer.tsx:30`; replace class string `grid grid-cols-2 md:grid-cols-4 gap-8` → `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1fr_auto_auto_auto] md:gap-x-6` (keep literal `grid`, keep element/attributes identical).
2. Open `:34`; replace `<BrandWordmark className="font-semibold" />` → `<BrandWordmark className="text-4xl md:text-5xl font-bold tracking-tight leading-none" />` (h3 `:33` `mb-4` untouched; text still renders `DuanMar` via shared component).
3. Visual sanity at :3000 (dev): `/vi` at 1280 — wordmark clearly dominant, 3 nav columns clustered right, brand lockup intact; at 768 same; at 375 wordmark 36px on its own full-width row above tagline.
4. Compile check per `.claude/rules/primary-workflow.md`: `npm run lint` (exit 0) then `npm run build` (exit 0; restart dev server if it was running — build conflicts with dev `.next`).
5. Contract smoke: `node tests/browser/m-footer-brand.mjs` (dev :3000) → 24/24 ok (proves F1–F10 + H5 overflow intact).

## Todo List
- [x] Edit `footer.tsx:30` grid classes (AC2 string)
- [x] Edit `footer.tsx:34` BrandWordmark className (AC1 string)
- [x] Visual check 1280 / 768 / 375 on `/vi`
- [x] `npm run lint` → exit 0
- [x] `npm run build` → exit 0 (dev stopped during build)
- [x] `node tests/browser/m-footer-brand.mjs` → 24/24
- [x] Hand off to P2 (tests + changelog)

## Success Criteria
- Footer wordmark computed font-size: 36px mobile, 48px md+ (225%/300% of 16) and ≥ header 20px; negative letter-spacing, line-height = font-size, weight 700.
- Nav-to-nav horizontal gap = 24px @md+; nav cluster = 313px measured (≤55% of grid width) @1280; brand `1fr` absorbs slack; mobile `grid-cols-2` + `col-span-2` brand unchanged.
- No horizontal overflow at 375×812 / 768×1024 / 1280×900; `m-footer-brand.mjs` 24/24; lint + build exit 0.
- Diff confined to `footer.tsx:30,:34` (2 lines).

## Risk Assessment
- **48px wordmark overflow @375**: none expected (140px word in 343px track) — guarded by P2 O7.
- **AC1↔AC2 coupling**: ship both together in this phase (single commit) — if AC2 class reverted, AC1 can push md grid past container.
- **`auto` tracks too wide @768 (locale max-content)**: shrink-to-min-content prevents overflow; worst case cluster tighter than 24px gaps — acceptable (AC2 = compact).
- **`md:` not matching at viewport 768 w/ scrollbar**: layout falls back to mobile 2-col until 784px-equivalent — visually still acceptable; P2 O6 bumps viewport to 800 if `matchMedia` fails (test-only guard, no product code).

## Security Considerations
None — pure style/class change. No markup semantics, hrefs, i18n keys, or storage touched.

## Next Steps
- P2: `tests/browser/o-footer-refinement.mjs` + full pipeline + `docs/project-changelog.md` + status flips → `reports/plan-summary.md`.
