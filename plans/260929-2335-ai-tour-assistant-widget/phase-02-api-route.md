# Phase 02 — API Route: `POST /api/assistant` (stream + guards)

**Status**: Complete · **Depends on**: Phase 1 · **Priority**: P1 · **Plan**: [plan.md](./plan.md)

## Overview
Single streaming endpoint mirroring the guard chain of `api/contact`, plus validation, rate limit, and chunked text response.

## Files
- CREATE `src/app/api/assistant/route.ts`

## Contract
- `POST` JSON `{ messages: [{role, content}], locale: "en"|"vi" }`
  - 415 non-JSON → `{error}` · 413 `content-length > 32_000` → `{error}` · 400 invalid JSON → `{error}`
  - 400 validation: `messages` 1..8 array, each `content` string 1..1000 chars, roles ∈ {user,assistant}, first must be `user`, `locale` enum → `{errors:{field:msg}}`
  - 429 rate limit: in-memory Map IP → sliding window 60 req/min (module-level, prune on access; document restart-reset)
  - 200: `Content-Type: text/plain; charset=utf-8`, `Cache-Control: no-store`, body = streamed deltas (dry-run streams too)
- `GET` → 405. `export const runtime = "nodejs"`.

## Implementation steps
1. Guard chain (copy shape from `contact/route.ts`): 415 → 413 → JSON parse → `validateAssistantRequest()` (new pure fn in `src/lib/assistant/assistant-validation.ts`, unit-tested P4).
2. Rate limiter `checkRateLimit(ip)` pure + module state (exported for tests with injectable clock/now).
3. `buildSystemPrompt(locale, await buildGroundingContext(locale))` → `streamAssistant(...)` → wrap async generator into `new ReadableStream` (enqueue encoded deltas, `cancel` → abort upstream via AbortController).
4. Errors post-validation: provider throw → 502 JSON `{error:"assistant unavailable"}` (only if nothing streamed yet); stream errors after start → close stream (client renders partial + error note via widget).
5. Log masked: `[assistant]` locale, messageCount, totalChars, provider mode (gemini|dry-run), latency — **no message content, no key**.

## Success criteria
- curl: `405/415/413/400/429/200` all reproducible.
- 200 streams text; dry-run (no key) streams grounded answer containing live CMS strings (e.g. destination name).
- Unit: validation + rate-limit windows green (P4).

## Risks
- In-memory limiter resets on deploy/restart — accepted (documented gap also true of `/api/contact`).
- `after()` NOT used (streaming response owns the request lifetime).
