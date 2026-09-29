# Phase 01 — Grounding Context + Provider Adapter

**Status**: Complete · **Priority**: P1 · **Plan**: [plan.md](./plan.md)

## Overview
Build server-only lib that (a) gathers compact CMS context, (b) builds locale-aware system prompt, (c) talks to Gemini via fetch with dry-run fallback.

## Context Links
- Reuse patterns: `src/lib/email/email-provider.ts` (fetch adapter + fallback), `src/sanity/lib/live.ts` (`sanityFetch`), queries in `src/sanity/queries/{destinations,tour-pricing,articles,site-configuration}.ts`.

## Architecture
```
route (P2) ─► buildGroundingContext(locale) ─► markdown context (~≤6KB)
           ─► buildSystemPrompt(locale)      ─► rules + context
           ─► streamAssistant({system, messages}) ─► ReadableStream<string>
                 ├─ GEMINI_API_KEY set → POST generativelanguage.googleapis.com (streamGenerateContent?alt=sse)
                 └─ absent → dry-run: grounded canned reply (top matches + deep links + config note)
```

## Files to create
1. `src/lib/assistant/assistant-types.ts` — `AssistantMessage {role:"user"|"assistant", content:string}`, `AssistantRequest`, `GroundingContext`.
2. `src/lib/assistant/grounding-context.ts` — async `buildGroundingContext(locale)`:
   - `sanityFetch` ×3 (Promise.all): destinations (name/slug/region/country/category/description ≤300ch), `ALL_TOUR_PRICING_QUERY` (slug/price/featured), `ARTICLES_QUERY [0...6]` (title/excerpt/slug) + siteConfiguration (brand/contact).
   - Serialize to compact markdown sections; truncate each field; budget guard (hard cap ~16KB, slice with note).
   - Export `GROUNDING_QUERY_SOURCES` const for unit contract asserts.
3. `src/lib/assistant/system-prompt.ts` — `buildSystemPrompt(locale, context)`: identity (DuanMar Travel assistant), reply language = locale, ground ONLY in provided context, never invent prices/dates, refuse off-topic politely, answer ≤120 words, end with ≤2 deep links (`/{locale}/explore/destinations/{slug}` etc.) when relevant.
4. `src/lib/assistant/assistant-provider.ts` — `streamAssistant({systemPrompt, messages, signal})`:
   - Gemini: `fetch(\`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}\`, {method POST, body {system_instruction, contents: last 8 msgs, generationConfig:{maxOutputTokens:512}}})` → parse SSE `data:` lines → yield text deltas. Non-2xx → throw `AssistantProviderError(status)`.
   - Dry-run: yield 2 chunks (headline + grounded bullet list of first matching destination/article by keyword overlap with last user msg + config note).
   - `AssistantProviderError` + `isAssistantConfigured()` helpers.

## Implementation steps
1. Create types + `buildGroundingContext` (queries only, no AI call).
2. Create `buildSystemPrompt`.
3. Create provider adapter with SSE parser + dry-run.
4. `npx tsc --noEmit` sanity (or rely on build gate) + add unit test stub (finished in P4).

## Success criteria
- Unit-testable pure functions; **no AI key needed** for dry-run path.
- Queries reuse existing exports (no query edits) → schema/groq guards untouched.

## Risk / Security
- **Never log API key**; key read server-side only (`GEMINI_API_KEY` not `NEXT_PUBLIC_*`).
- Prompt-injection: user content passed only as user turn; system prompt instructs to ignore embedded instructions; context is CMS-trusted.
- Abort: pass `req.signal` through to upstream fetch (client disconnect cancels spend).
