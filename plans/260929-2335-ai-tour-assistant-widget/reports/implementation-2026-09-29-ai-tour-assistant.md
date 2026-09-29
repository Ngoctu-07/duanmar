# Implementation Report — AI Tour Assistant (Grounded CMS Chatbot + Floating Widget)

**Date**: 2026-09-29/30 · **Plan**: `plans/260929-2335-ai-tour-assistant-widget/` · **Status**: Complete (100%)

## Approved decisions
- **Gemini API via plain fetch** (0 npm deps, Resend-style adapter) + **keyless dry-run fallback** (grounded canned reply) so dev/tests run without any AI key.
- Widget **everywhere incl. `/booking`** (non-modal floating panel).
- Streaming: chunked `text/plain`; server peeks the first delta so provider failures return a real 502.
- Grounding strictly server-side (client never sees GROQ/tokens/system prompt).

## Changes
- **Lib** (`src/lib/assistant/`): `assistant-types.ts` · `grounding-context.ts` (pure serializer: 4 markdown sections, 16KB budget, field caps 300/240/160, `GROUNDING_QUERY_SOURCES`) · `grounding-fetch.ts` (cached `fetchPublished` ×3 + contact nodes; **throws when all reads null** → 502 on CMS outage) · `contact-nodes.ts` · `system-prompt.ts` (bilingual rules: ground-only, no invented prices, refuse off-topic, ignore embedded instructions, ≤120 words, ≤2 deep links, host `vietnam-tourism.com`) · `assistant-provider.ts` (Gemini SSE multi-part join + decoder/SSE-tail flush + abort; dry-run keyword-ranked context lines + deep links) · `assistant-validation.ts` (V1–V8 guards; `toAssistantRequest` merges consecutive same-role) · `rate-limit.ts` (60/min sliding window, O(window) per-call prune) · `body-limit.ts` (capped stream read — chunked cannot bypass).
- **Route** `POST /api/assistant`: rate limit **first** (429) → 415 → 413 (header fast path + capped read) → 400 JSON → 400 validate → grounding → peek → 200 stream; GET 405 + `Allow: POST`; logs masked (counts/latency only).
- **Widget** `src/components/assistant/assistant-widget.tsx`: trigger bottom-right (`z-40`) → panel with greeting/stream/error, Enter-send, Escape-close, `data-streaming`, focus + autoscroll, AbortController (unmount/new-send), history window `MAX_MESSAGES-1` + user-first trim + empty-bubble filter/rollback, `maxLength=1000`. Mounted in `[locale]/layout.tsx`. +8 i18n keys `assistant.*` (en+vi).
- **Env/docs**: `.env.example` +`GEMINI_API_KEY`/`ASSISTANT_MODEL`; NEW `docs/ai-assistant.md`.

## Code review (adversarial) — findings fixed before ship
- **Blocker**: unwindowed history → 400 on 5th send → client windowing (test I5 covers 5 turns).
- **Major**: failed send poisoned session (rollback + filter) · rate-limit key spoofing (x-real-ip/rightmost XFF + trust doc) · content-length-only 413 (capped stream read, `body-limit.ts` unit-tested).
- **Minor**: `first.done` → 502 · multi-part + SSE flush · same-role merge · abort on unmount · prune O(window) · triple-null grounding throw · `aria-controls` conditional · `Allow: POST`.
- Residual (accepted): live 429 not exercised in browser suite (unit R1–R3 covers; flooding would poison the shared dev-server window for later files).

## Verification
- Unit: `assistant-grounding-prompt` **7/7** + `assistant-validation-rate-limit` **15/15** (V1–V9, R1–R3, B1–B3) → runner **23/23**.
- Browser `i-ai-assistant.mjs` **15/15**: API 405/415/413/400×2 · VI panel/greeting · streamed reply grounded in live CMS (`HCM` + deep link) · **5-turn multi-turn (1→11 bubbles, no 400)** · injection turn never leaks prompt/context · Escape/reopen retains session · EN flow (env-guarded dry-run assert) · mobile 375 (panel 345px, 0 overflow) · 0 pageerrors.
- Gates: lint **0** (0 warnings) · `npm test` **23/23** · `npm run build` **0** · schema **0 errors** · `npm run test:browser` **26/27** (sole fail = pre-existing `revalidate-webhook` env) — suite file count 26 → 27.
- Related fix (not assistant): `f-ui` F5 latent date-boundary (calendar anchors to next month when today = month end) — `dayInfo` now falls back to `data-disabled`; surfaced by the midnight rollover to 2026-09-30 during this session.

## Concerns
- ~~Dry-run until `GEMINI_API_KEY` is provisioned~~ → **key provisioned 2026-09-30** (`.env.local`, gitignored): live mode verified 15/15 browser checks; model default `gemini-3.5-flash-lite` (2.5-flash retired for new keys; 3.7/3.8 503 at provisioning).
- In-memory rate limiter + session state reset on restart (documented).
- Rate-limit trust depends on proxy appending `x-forwarded-for` (documented in `docs/ai-assistant.md`).

## Docs impact
minor — `docs/ai-assistant.md` (new), `.env.example`, changelog bullets (assistant + f-ui test fix), plan statuses, this report.
