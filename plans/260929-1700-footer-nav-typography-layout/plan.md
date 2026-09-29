# Footer Navigation — Typography Upscaling & Layout Redistribution

**Date**: 2026-09-29 · **Type**: Bug-fix / UI remediation · **Status**: Complete · **Progress**: 100%

## Problem
Footer's 3 nav columns ("Tour du lịch", "Liên hệ", "Thông tin") are too small (headings inherit 16px, links `text-sm` 14px) and cluster near center-right leaving large dead space on outer sides.

## Current state (verified research)
- `src/components/layout/footer.tsx` (128 lines): grid `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` → nav columns hug max-content (313px cluster = 25% of grid), `0.5fr` trailing track = 312px right margin @1280, 141px @768.
- Headings: `<h3 className="font-semibold mb-4">` — no `text-*` → 16px inherited.
- Links: `text-sm text-muted-foreground hover:text-foreground transition-colors` = 14px; `ul.space-y-2` = 8px.
- Prior plans (`260928-2223-footer-logo-scale-asym-layout`, `260928-2030-footer-brand-type-column-gaps`) deliberately locked the compact right-hugging cluster; **this plan supersedes those ACs per current user request** (asymmetry ratio + wordmark contracts stay).

## Contract tests (tripwires)
| File | Locked | Impact |
|------|--------|--------|
| `tests/browser/m-footer-brand.mjs` (24 checks) | DOM/content only: 4 children, `h3` titles, hrefs, `mt-8` | **Safe** — font/space changes don't break |
| `tests/browser/o-footer-refinement.mjs` (19 checks) | wordmark 48/36px, tracking/leading/weight, gaps ≤25 (O5a), **cluster ≤55% grid (O5b)** | Geometry risk: **O5b blocks aggressive spread** → threshold amendment needed (0.55 → 0.65) |
| `tests/browser/q-footer-asym-layout.mjs` (20 checks) | logo 88±2, brandGap 48±2, nav gaps 24±2, ratio 1.9–2.1, cluster center ≥+50 right, right margin ≥60 | Gaps OK if `0` track + 24px gap kept; **Q7 right margin ≥60 must hold** at 768/1280 |

## Root cause
1. **Typography**: no `text-*` on headings; `text-sm` on links → below requested 1.5–2× baseline.
2. **Layout**: `auto` tracks collapse nav columns to content width; `0.5fr` trailing track creates right dead space; `1fr` brand track absorbs left slack.

## Remediation

### Phase 1 — Typography (+150–200%)
- Headings: `font-semibold mb-4` → **`text-2xl font-semibold mb-5`** (24px = ×1.5; or `text-3xl` 30px = ×1.875 for strong option).
- Links: `text-sm` → **`text-lg`** (18px ≈ ×1.29; or `text-xl` 20px ≈ ×1.43 for strong option).
- Spacing: `space-y-2` → **`space-y-3`** (12px, +50%); keep `mb-4`→`mb-5` on headings.
- Colors/transition unchanged. Wordmark/tagline/bottom bar untouched (contracts pin them).
- Links wrap naturally (min-content = longest word) → no overflow at 768/375.

### Phase 2 — Layout redistribution
- Grid: `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` → **`md:grid-cols-[minmax(210px,1.5fr)_0_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(64px,0.35fr)]`**
  - Keeps `0` spacer track (brandGap 48 ✓ Q2) + 24px gap (Q3/Q4/Q5 ✓).
  - Proportional `1fr` nav tracks → columns spread ~2.5–3× wider (cluster ≈700–750px vs 313), inter-column content spacing grows visually.
  - `minmax(210px,1.5fr)` brand floor protects wordmark (Q10/O4b); `minmax(64px,0.35fr)` trailing floor keeps right margin ≥60 (Q7/Q13).
  - Asymmetry preserved (cluster center-right ≥+50, Q6 ✓).
- **Contract amendment (requires approval)**: `o-footer-refinement.mjs:108-113` O5b threshold `0.55` → **`0.65`** (cluster ≤65% allows wider spread while still bounding). All other assertions unchanged.
- Verify @1280, @768, @375: measure live, tune fr ratios if any threshold fails (esp. Q7 @768, O5b).

### Phase 3 — Verification & docs
- Gates: `npm run lint` 0 · `npm test` **18/18** · `npm run build` 0 (dev stopped/restarted) · `sanity schemas validate` 0 · `npm run test:browser` **16/17** (sole fail = pre-existing `revalidate-webhook` env) — targeted runs: `m-footer-brand`, `o-footer-refinement`, `q-footer-asym-layout` first.
- Screenshots: footer @1280, @768, @375 (VI + EN) → `tests/.output/footer-typography-*.png`.
- Changelog: Vietnamese bullet under `## 2026-09-29` in `docs/project-changelog.md`.
- Report: `plans/260929-1700-footer-nav-typography-layout/reports/implementation-2026-09-29-footer-nav-typography.md`.
- Plan/phase statuses → Complete.

## Files
- **Modify**: `src/components/layout/footer.tsx` (headings ×3, links ×3 lists, ul spacing, grid class) · `tests/browser/o-footer-refinement.mjs` (O5b `0.55`→`0.65`, 1 line) · `docs/project-changelog.md` · plan statuses.
- **Create**: report file. **Delete**: 0. **i18n**: 0 new keys (parity untouched). **Schema/queries**: 0.

## Risks
- **Tablet @768 binding constraint**: min-content (wrapped "International"/"Information") + brand floor must fit `gridW` — measure before commit; tune fr floors if `overflow > 1` (Q12/O6b/Q14).
- **Mobile @375**: base `grid-cols-2` unchanged; `text-lg` links wrap → `scrollW ≤ vw+1` (h4-p4-e2e) must hold.
- Prior plan ACs superseded (compact cluster, 0.5fr fixed) — documented here as intentional amendment.
- Test-edit policy: prior plans self-bound "0 edits"; this plan requests explicit approval to amend **1 line** (O5b) — no other test touches.

## Decisions for approval
1. **Typography scale**: mild (`text-2xl` headings + `text-lg` links, user's literal example) vs strong (`text-3xl` + `text-xl`, upper bound ×1.875/×1.43).
2. **Layout contract**: amend O5b `0.55`→`0.65` (recommended, enables 2.5–3× spread) vs keep 0.55 (cluster ≤55% = ~2× spread, less redistribution).

## Success criteria
- Headings 24–30px, links 18–20px (≥1.5× baseline), `space-y-3`.
- Nav columns visibly distributed across footer width; dead space reduced but asymmetry (center-right) retained.
- All footer contract tests green (with approved O5b amendment); full gates pass.
