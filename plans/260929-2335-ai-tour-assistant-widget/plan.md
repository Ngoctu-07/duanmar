# AI Tour Assistant — Grounded CMS Chatbot + Floating Widget

**Date**: 2026-09-29 · **Type**: Feature (AI/CMS) · **Status**: Complete · **Priority**: P1
**Plan ID**: 260929-2335

## Objective
Floating chat widget (bottom-right, both locales) answering visitor questions **grounded in live CMS content** (destinations, tour pricing, articles, contact info), streaming replies in the user's locale, with deep links into the site.

## Approved decisions (pending approval)
- **Provider: Gemini API via plain fetch** (`GEMINI_API_KEY`) — 0 npm deps, mirrors Resend pattern from plan 2229. **Dry-run fallback** when key absent: deterministic grounded reply built from CMS context → browser tests run keyless.
- **Streaming**: chunked `text/plain` stream; widget appends via `ReadableStream` reader (non-blocking UX).
- **Widget everywhere** (incl. `/booking`), non-modal floating panel, `Escape` closes. *(confirm in approval)*
- Grounding is **server-side** (route builds context from `sanityFetch`) — client never sees raw GROQ/token; system prompt hardcodes site rules (locale, refuse off-topic, deep-link suggestions).
- Rate limit: in-memory per-IP token bucket (60/min) → 429; content-length cap 32KB → 413.

## Phases
| # | Phase | Status | Files |
|---|-------|--------|-------|
| 1 | [Grounding + provider adapter](./phase-01-grounding-provider.md) | Complete | `src/lib/assistant/*` |
| 2 | [API route (stream + guards)](./phase-02-api-route.md) | Complete | `src/app/api/assistant/route.ts` |
| 3 | [Floating widget + i18n](./phase-03-floating-widget.md) | Complete | `src/components/assistant/*` |
| 4 | [Tests + gates + docs](./phase-04-tests-gates-docs.md) | Complete | `tests/`, `docs/ai-assistant.md` |

## Key dependencies
- Reuses: `sanityFetch` (`src/sanity/lib/live.ts`), queries `destinations` / `tour-pricing` / `articles` / `site-configuration`, guard chain pattern from `api/contact`.
- Env: new `GEMINI_API_KEY` (+ optional `ASSISTANT_MODEL`, default `gemini-3.5-flash-lite` (2.5-flash retired)); added to `.env.example` only.
- i18n: +6 keys (`assistant.*`) en+vi, parity enforced by existing test.

## Success criteria
lint 0 · unit 21→23+ · build 0 · schema 0 · suite 26→**27 files**, 26/27 pass (revalidate = known env fail) · widget live on `/en` + `/vi` with grounded dry-run reply · 0 new pageerrors.

## Out of scope (YAGNI)
Persisted chat history, multi-turn memory beyond current session window (last 8 msgs sent), tool-calling into booking API, admin analytics, MCP.
