# Phase 04 — Tests, regression, code review, docs sync

Context: phases 01–03; repo test harness = `npm test` (unit) + `npm run test:browser` (needs
dev server :3000). Priority: P0 · Status: **done** (approved 2026-09-27)

## Overview

Prove the invalidation mechanism (not CMS content — we cannot publish without Studio login),
then run the full regression gate + review.

## Requirements / test matrix

### New tests

1. **`tests/browser/revalidate-webhook.mjs`** (new browser-suite file, auto-picked by runner):
   - GET `/api/revalidate` → **405**
   - POST, no signature → **401**
   - POST, forged HMAC (`base64(hmac-sha256(secret, ...))` computed with the *exact*
     algorithm read from `node_modules/next-sanity/dist/webhook/index.js` in phase 02) → **401**
   - POST, valid signature → **200** `{ revalidated: true }` + `time` is ISO
   - after valid POST: `/en/explore/destinations/hcm` still **200** and pricing block renders
     (mechanism did not break the page)
   - dev server must run with `SANITY_REVALIDATE_SECRET` set → runner starts checks;
     if env absent the file must **fail with a clear message** (not silently pass)
2. **`tests/unit/fetch-published-cache.test.ts`** (new unit file):
   - `fetchPublished` returns data for a live query (parity with current behavior)
   - failing/unknown query → `null` (fail-open preserved)
   - exported tag builder (if extracted) returns `["sanity", ...extra]` and de-dupes
   - two different params → different cache entries (key collision guard), by asserting
     distinct mocked results via injected fetch? (if not injectable → assert key string
     builder instead; document choice in test)

### Regression (mandatory gate)

- `npm test` (expect 10/10 + new unit file)
- `npm run test:browser` (expect 7/7 incl. new webhook file)
- `npx tsc --noEmit` = 0 · `npx eslint . --max-warnings=0` = 0 · `npx next build` = 0
  (kill dev → build → `rm -rf .next` → restart dev, established project order)

### Freshness proof (manual, user)

- Documented in runbook: publish a price in Studio → page updates within seconds, no redeploy.

## Code review

Dispatch review per workflow (Stage 2 quality + Stage 3 adversarial) on the diff:
`client.ts`, `fetch-published.ts`, `api/revalidate/route.ts`, migrated page call sites,
`.env.example`. Report → `plans/reports/code-review-cache-invalidation-20260927.md`.

## Docs sync

- changelog bugfix entry + plan status → `done` + this test matrix filled in.

## Success criteria

All rows green; no Critical/Major review findings left unfixed (or explicitly deferred by user).

## Risks

- Webhook algorithm mismatch in test → assert against actual `parseBody` source, not docs.
- Dev server env restart needed for secret — coordinate with runner (document in test header).
