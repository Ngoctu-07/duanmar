# Phase 03 — Floating Widget + i18n

**Status**: Complete · **Depends on**: Phase 2 · **Priority**: P1 · **Plan**: [plan.md](./plan.md)

## Overview
Client island mounted in `[locale]/layout.tsx`: floating trigger bottom-right → compact chat panel; streams assistant reply; both locales.

## Files
- CREATE `src/components/assistant/assistant-widget.tsx` (client, single file ≤200 lines; split `assistant-message-list.tsx` if needed)
- EDIT `src/app/[locale]/layout.tsx` — mount `<AssistantWidget />` after `<PromoModal />`
- EDIT `src/i18n/messages/en.json` + `vi.json` — +6 keys (parity test enforces both):

```
assistant.open / assistant.close / assistant.title
assistant.greeting / assistant.placeholder / assistant.send
assistant.error / assistant.loading   (8 keys total; adjust count in P4 test if parity test counts)
```

## UX spec
- Trigger: `fixed bottom-6 right-6 z-40` circular `Button` (message icon), `aria-expanded`, `aria-label={t(assistant.open)}`; promo modal z-index respected (check `promo-modal` z — keep widget below it).
- Panel: `w-[min(92vw,24rem)] h-[min(70vh,32rem)]` card, header (title + close ×, `Escape` closes), scrollable message list (`role="log"`, `aria-live="polite"`), input row (Textarea auto-grow ≤4 rows + Send button; Enter=send, Shift+Enter=newline; disabled while streaming).
- State: `messages`, `input`, `isStreaming`, `error`. On send: append user msg → `fetch("/api/assistant", {signal})` → read `response.body.getReader()`, decode+append deltas to last assistant msg → done. On `!res.ok` → error message using `assistant.error` (429 → same copy, no detail leak).
- Greeting: one seeded assistant message from `assistant.greeting` (not sent to API as history? **send it** so first call has context — role assistant allowed in history; validation requires first=user → seed client sends `[]` first time? Decision: validation relaxes to allow empty `messages` with greeting injected server-side? KISS: client does NOT seed API history; greeting is display-only, first request `messages:[{role:user,...}]`).
- Mobile 375: panel `min(92vw)`, no horizontal overflow; trigger clears safe-area.
- a11y: focus input on open, close returns focus to trigger; buttons have labels; streaming shows animated dots (`assistant.loading`).

## Implementation steps
1. i18n keys (en+vi) → parity test green.
2. Widget component: trigger/panel/state/stream-reader.
3. Mount in layout; verify promo modal + header unaffected (z-order, no hydration change).
4. Quick manual smoke `/vi` + `/en`.

## Success criteria
- Open → greeting · send → streamed grounded reply · close/reopen keeps session · Escape closes · 0 pageerrors · mobile 375 no overflow · existing `g-header`, `r-entry-popup`, `y-homepage-prune` unaffected.

## Risks
- Layout remount effects: widget isolated (no context providers) → hydration safe; no `useEffect` state-set patterns that trip `react-hooks/set-state-in-effect`.
