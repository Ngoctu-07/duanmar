# Phase 03 — Upscale Primary CTA Buttons (~150%)

**Status**: Complete · **Depends on**: Phase 2 · **Priority**: High

## Standalone CTAs → `px-8 py-4 text-lg`
1. **Explore Now** — `hero-section.tsx:60-62`: `<Button size="lg" className="px-8 py-4 text-lg" …>{t("exploreNow")}</Button>` (explicit classes override size presets).
2. **Contact** — `about-us-section.tsx:41-47`: `className="mt-6 px-8 py-4 text-lg"`.

## Card action button (shows "Explore Now" on homepage featured grid) → D4 choice
- Default (pending Q): ~1.5× current → `px-6 py-3 text-base` on the phase-02 `<span>` (keeps card proportions at 3-col desktop).
- Alternative: same `px-8 py-4 text-lg` everywhere.

## Rules
- No icons inside these buttons (text-only) → nothing to scale proportionally; `gap-4` hero wrapper absorbs growth (check 375px wrap).
- Verify `ui/button.tsx` merges `className` after size classes (tailwind-merge); if not, drop `size="lg"` and use explicit classes only.

## Verify
- Computed style: hero/about button padding ≥16px vertical + font ≥18px; screenshots 1280 + 375 — no overlap/wrap breakage; `j-about-contact` J2 + `n-lightbox` green (href/selector untouched).
