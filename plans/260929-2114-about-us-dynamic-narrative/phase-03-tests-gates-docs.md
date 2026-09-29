# Phase 03 — Tests, Gates, Docs

**Status**: Complete · **Depends on**: Phase 2 · **Priority**: High

## New `tests/browser/v-about-narrative.mjs` (data-driven, live GROQ `narrativeStory_en/_vi`)
- Fetch both block arrays from `homepage`.
- **Empty both** (current expected state): `about-narrative` absent on `/vi` AND `/en`; old placeholder substrings absent ("trusted gateway", vi equivalent from git history/localization — assert via rendered body NOT containing the removed key's text, read from git? No — simply assert testid absent + zero pageerrors + title/CTA still present).
- **Locale filled**: rendered `p` count == block count; container has `leading-relaxed`; `strong` count == count of `strong` marks in payload; `ul/ol` present iff list blocks exist; vi page uses vi ?? en fallback (assert expected payload choice by comparing to GROQ);
- zero pageerrors; screenshots `v-about-narrative-*.png` only when filled.
- Regression: `j-about-contact` (34/34), `n-lightbox-contact` (27/27).

## Unit
- `homepage-about-video-query.test.mts` extended in P1; i18n key removal covered by parity test (both locales dropped).

## Gates (ordered)
1. Targeted `v`, `j`, `n`.
2. lint 0 → `npm test` 18/18 → stop dev → build 0 → schema validate 0 → restart dev → `npm run test:browser` **20/21** (sole fail = `revalidate-webhook` env).

## Docs
- VN changelog bullet under `## 2026-09-29` (+ Fixed note if key removal touches parity test).
- Report `reports/implementation-2026-09-29-about-us-dynamic-narrative.md`; plan + 3 phases → Complete.
- Outstanding: editor fills `narrativeStory_vi/_en` in Studio (no write token for scripted content).
