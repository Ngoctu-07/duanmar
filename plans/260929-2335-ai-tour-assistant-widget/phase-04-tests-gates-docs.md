# Phase 04 — Tests + Gates + Docs

**Status**: Complete · **Depends on**: Phase 3 · **Priority**: P1 · **Plan**: [plan.md](./plan.md)

## Overview
Unit + browser coverage (keyless dry-run), full gate cycle, docs close-out.

## Unit tests (runner 21 → 23/24)
1. `tests/unit/assistant-grounding-prompt.test.mts`
   - grounding: all 4 query sources present in exports, no `$` params, groq-js parse each query, field caps applied (truncate ≥200 chars input → ≤300 out), budget guard slices at cap.
   - prompt: locale switch (en/vi instructions differ), contains refusal rule + deep-link rule, context injected once.
   - provider dry-run: yields ≥2 chunks, includes CMS string + config note; `isAssistantConfigured()` false without key (delete env in test).
2. `tests/unit/assistant-validation-rate-limit.test.mts`
   - validation: 400 cases (empty messages, >8, >1000 chars, bad role, first≠user, bad locale), happy path.
   - rate limiter: 60 pass → 61st = 429 signal; window slides with injected clock; prune of stale IPs.

Run pattern: `npx tsx tests/unit/<file>.test.mts` per file (fresh module per file — used by likes/email tests).

## Browser test (suite 26 → 27 files)
`tests/browser/i-ai-assistant.mjs` (letter `i` free):
- **I1** trigger visible on `/vi` (aria-label `assistant.open`), 0 pageerror baseline.
- **I2** click → panel opens, header title + greeting = `assistant.greeting` VI.
- **I3** type "Điểm đến nào có ở VN?" → send → streaming completes, reply non-empty.
- **I4** reply is **grounded**: contains ≥1 live CMS destination name (query `DESTINATIONS_QUERY` in test) and a site deep link (`/vi/explore/destinations/`); contains dry-run config note (keyless env) — assert either/or so test survives later key provisioning? → assert `grounded strings OR "configure" note`, and always assert destination name present (context echo).
- **I5** `Escape` closes; reopen shows same session.
- **I6** API guards: GET 405, text/plain wrong → 415, oversized → 413, bad schema → 400 `{errors}`.
- **I7** `/en` variant: greeting EN + reply follows `locale:"en"`.
- **I8** mobile 375×812: panel ≤ viewport, no horizontal scroll; 0 pageerrors.

## Gate cycle (single combined run)
1. `npm run lint` → 0
2. `npm test` → 23/24+
3. stop dev → `npm run build` → 0 → `npx sanity schemas validate` → 0 errors → restart dev (`nohup npm run dev > /tmp/tour-dev.log 2>&1 &`)
4. `npm run test:browser` → **26/27** (sole fail = `revalidate-webhook`, missing `SANITY_REVALIDATE_SECRET` — pre-existing, never fix)

## Docs close-out
- NEW `docs/ai-assistant.md`: architecture, env (`GEMINI_API_KEY`, `ASSISTANT_MODEL`), dry-run behavior, rate limits, prompt-injection stance, troubleshooting.
- `.env.example`: +`GEMINI_API_KEY`, +`ASSISTANT_MODEL` (commented default `gemini-3.5-flash-lite` (2.5-flash retired)).
- `docs/project-changelog.md` `## 2026-09-29`: bullet (Added).
- plan/phase statuses → Complete 100%; report → `plans/260929-2335-ai-tour-assistant-widget/reports/implementation-2026-09-29-ai-tour-assistant.md`.
- Outstanding section: real key provisioning (dry-run until then), Studio content none required.

## Success criteria
All gates above green; widget verified live on both locales; no scope creep into booking flow.
