# Phase 2: Knockout Logo Asset Pipeline

**Plan**: [`plan.md`](plan.md) · **Est**: 1h · **Status**: pending (blocks Phase 3) · **Files**: 1 create, 1 modify, 1 generated asset

## Context Links
- **Source**: `public/images/logo-duanmar.png` — 512×512 RGBA (sharp metadata verified). Histogram measured: **21.1% transparent, 50.2% dark (lum<0.2), 25.2% light (lum>0.8)**. Structure (VISUAL verification of source): black ring band + black center disc, WHITE lettering "DỰ ÁN MAR"/"EST. 2026", white stars, white outer circles, WHITE filled pig, dark-red crosshair.
- **Research correction (CRITICAL — formula was inverted)**: briefed formula `alpha×(1−luminance)` empirically yields **41.4% transparent / 46.1% opaque-white** → renders as a **filled white badge with red knockouts**, violating requirement "no background fill, red shows through". Root cause: briefing described source as "white center disc + black pig" — actual is the inverse.
- **Validated formula (locked, D3)**: for each source pixel `(R,G,B,A)` → out = `(255,255,255, round(A × L))` where `L = 0.2126·srgb(R) + 0.7152·srgb(G) + 0.0722·srgb(B)` (WCAG sRGB relative luminance, `srgb(c)=c≤0.04045? c/12.92: ((c+0.055)/1.055)^2.4`). Measured output: **67.4% transparent (a<10), 20.0% opaque-white (a>245), 12.6% semi**. Render composited on `#9f0618` visually verified: white strokes/letters/pig, red shows through ring band + lettering + pig interior, no background fill ✓.
- **Precedent**: `scripts/generate-favicon-set.mjs` (sharp, `compressionLevel: 9, adaptiveFiltering: true`, header docs, fail-fast source read) + npm script pattern `icons:generate` (`package.json:17`). DevDep `sharp ^0.35.5` (`package.json:56`). NOTE: `pngjs` is NOT a dependency (briefing claim wrong) — not needed; `sharp.raw()` suffices.
- **Known transform trade-off**: dark-red crosshair → `L≈0.06` → alpha≈16 ≈ invisible (red-on-red anyway); pig silhouette + ring text remain fully legible (see render). Accepted.

## Tasks
1. [ ] Create `scripts/generate-knockout-logo.mjs` (~60 lines): read `public/images/logo-duanmar.png` via `sharp().ensureAlpha().raw()` → transform per formula → write `public/images/logo-duanmar-white.png` with same PNG params as favicon script; docblock header (source, formula, output, usage, stats) — file: `scripts/generate-knockout-logo.mjs`
2. [ ] **In-script sanity assertions (exit 1, print histogram)** — prevent silently emitting a black/all-white image:
   - `transparentPct (a<10) ≥ 40%` (measured 67.4%)
   - `opaqueWhitePct (a>245) ≥ 10%` (measured 20.0%)
   - source dimensions == 512×512 × 4ch
3. [ ] Add npm script `"logo:knockout": "node scripts/generate-knockout-logo.mjs"` after `icons:generate` — file: `package.json:17`
4. [ ] Run `npm run logo:knockout` → commit generated `public/images/logo-duanmar-white.png` (512×512 only — display size 88px ⇒ 5.9× DPR headroom; 1024 source doesn't exist, upscaling adds nothing → YAGNI)
5. [ ] Determinism check: run twice, `git diff` empty (fixed PNG params)

## Acceptance Criteria
- [ ] Script exits 0 with histogram output printed; assertions trip correctly (temporarily break formula → exit 1 → revert)
- [ ] Generated PNG: corner pixel alpha 0; compositing over `#9f0618` shows white linework, red through ring (spot check — preview written next to output or open in viewer)
- [ ] Re-run deterministic (byte-identical); `npm run lint` 0; no source/test files touched this phase
- [ ] Asset exists BEFORE Phase 3 swap (dependency)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Formula regression re-introduces (1−lum) | High | Histogram bounds (67/20 vs 41/46) make both directions fail; assertion is the gate |
| sharp raw orientation/channel drift | Low | `ensureAlpha()` + explicit 4-channel loop; dimension assert |
| Committing a binary that lint/tsc can't check | Low | Determinism double-run + visual overlay check in acceptance |

## Rollback
Delete generated PNG + script line in `package.json` + script file; footer swap (P3) then 404s → revert P3 too (listed dependency).

## Next Steps
Phase 3 consumes `/images/logo-duanmar-white.png` via `BrandLogo variant="knockout"`.
**Status:** PENDING
