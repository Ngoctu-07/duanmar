# Phase 3 — J2 Rewrite, Full Pipeline, Studio Check, Changelog

**Plan**: [plan.md](plan.md) · **Priority**: High · **Status**: Complete (100%) · **Depends on**: Phase 2

## Context Links
- `tests/browser/j-about-contact.mjs:61-80` (J2: section count/order/CTA/slot + **play button → caption**) · `:163` in `n-lightbox-contact.mjs` (CTA only — unaffected)
- Live-data test pattern: `tests/browser/p-tours-category.mjs:19-43` (envValue + raw GROQ, no fabricated data)
- Runners: `tests/run-unit.mjs` (16→17 files) · `tests/run-browser.mjs` (17 files) — never edit
- Changelog: `docs/project-changelog.md` (append bullets under existing `## 2026-09-29` / `### Changed`)

## Overview
Rewrite J2 to the new contract (data-driven off the live `homepage` doc), run the pipeline, verify in Studio, document.

## Key Insights
- Old J2 asserted the *bug* (missing mp4 → caption); new J2 asserts the *feature*: video⇔CMS URL presence, autoplay attrs, no overlay, poster fallback.
- Poster must be distinguished from random images: scope to `[data-testid="about-promo-video"]`.
- `n-lightbox`, `j` order/CTA checks untouched → collateral risk limited to J2 block.

## Requirements
- J2 checks (all scoped inside the about section):
  1. Keep verbatim: exactly one section · sits after featured destinations · CTA `/vi/contact` · slot present.
  2. **New**: live query `*[_type=="homepage"][0]{aboutUsVideo{asset->{url}}, aboutUsVideoStreamUrl, aboutUsVideoPoster{asset->{url}}}` → expected `videoSrc` (file > URL).
  3. If `videoSrc`: `<video>` exists, `src` contains it, attributes `autoplay`+`loop`+`playsinline` present and `muted` set (attr or property) → "video from CMS + autoplay attrs".
  4. If no `videoSrc`: `<img>` poster inside slot, zero `<video>` → "no CMS video → static poster".
  5. **New**: zero `[data-testid="about-promo-play"]` (overlay removed by design).
  6. Keep screenshot `j2-about-section.png`.
- Pipeline gates as in plan.md Global Verification; Studio manual: Homepage doc shows 3 fields; after user uploads a video → homepage autoplays.

## Related Code Files
**Modify**: `tests/browser/j-about-contact.mjs` · `docs/project-changelog.md`
**Create**: screenshots (existing path refreshed) · `reports/implementation-2026-09-29-about-us-video.md`
**Delete**: none

## Implementation Steps
1. Replace `:71-78` (slot/play/caption block) with data-driven block above (keep section count/order/CTA/slot checks).
2. Add local helper inside the test: `envValue` + `fetchHomepageMedia()` (same shape as `p-tours-category.mjs:19-43`).
3. Run: `npm run lint` → `npm test` (**17/17**) → stop dev → `npm run build` (exit 0) → start dev → `node tests/browser/j-about-contact.mjs` → `npm run test:browser` (**16/17**, sole fail `revalidate-webhook`).
4. `npx sanity schemas validate` (0 errors) + manual `/studio` open Homepage doc (3 fields render, file accept restricts to video).
5. Changelog bullets under `## 2026-09-29` → `### Changed`: schema fields · query projection (0 params) · background autoplay player + poster fallback · J2 contract change (play-button→caption removed = intentional) · `Verified:` counts · `Docs impact: minor`.
6. Flip plan/phase statuses Complete + write report (status block, orchestration protocol).

## Todo List
- [ ] J2 data-driven rewrite (video ⇔ CMS, poster fallback, no overlay)
- [ ] Full pipeline + standalone j-about-contact
- [ ] Studio manual verification (AC1)
- [ ] Changelog + statuses + report

## Success Criteria
- `j-about-contact.mjs` all checks pass; full suite 16/17 (known env fail only); unit 17/17; schema validate 0.
- After user uploads video in Studio: homepage shows autoplaying muted looping video within cache TTL (`revalidate` 300s or webhook `revalidateTag("sanity")`).

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| J2 passes vacuously (no video in CMS → poster branch only) | Poster branch IS the required fallback AC; video branch exercised after user uploads (re-run noted in report) |
| `muted` detection: React sets property not attribute in some cases | assert `video.muted === true` OR attribute present |

## Security Considerations
None (read-only CMS media, trusted editors).

## Next Steps
Docs impact: **minor**. Outstanding: user uploads video/poster to Studio Homepage doc post-deploy.
