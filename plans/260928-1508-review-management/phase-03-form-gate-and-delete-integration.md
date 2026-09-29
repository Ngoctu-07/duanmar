# Phase 03 — Form 3h Gate + else-clear + Edit Scroll Target + Delete→Recalc Sanity

## Context Links
- Plan: `plan.md` P3 · Research: `research/research-summary.md` §1 (else-bug + createdAt overwrite), §5 (WRAP trap), §6 (form fix points), §3 (post-mount gate, fail-closed)
- Files: MODIFY `src/components/reviews/write-review-form.tsx` (191 ln → ≤200), NEW `src/components/reviews/use-edit-window-gate.ts`

## Overview
- Priority: high · Status: pending · Progress: 0% · Est: 0.5 day · Depends on: P1 (`fetchServerNow`/`isEditWindowExpired`), P2 (menu Edit already gated; `editWindowClosed` key exists)
- Close the AC3 bypass: the prefilled edit form becomes unusable 3h after the review's first post (same predicate as the menu), stale prefill is cleared after delete, and the menu's Edit scroll/focus target starts resolving.

## Key Insights
- **`write-review-form.tsx` is at 191/200 LOC** → the gate MUST live in a new hook (`use-edit-window-gate.ts`, ~30 ln) or the file breaks the house rule. Hard check `wc -l` after edits; fallback if still >200: extract the `:47-79` mount/event effect into `use-write-review-state.ts` and log as a deviation.
- Existing disabled-wrapper pattern `:115-120` (`aria-disabled={!enabled}` + `pointer-events-none opacity-60 grayscale`) is reused verbatim — only the flag changes to `formEnabled = enabled && !editExpired` (binding 5). Control sites to swap: wrapper `:116/:118`, stars `:142`, Textarea `:163`, `ReviewImageInput` `:174`, submit `:179`. Keep `enabled` for `:45`, avatar row `:124`, no-booking hint `:130-134`.
- **Else-bug `:56-60`**: `refresh()` sets rating/comment/images only `if (existing)` → after a delete the form keeps the old content and the NEXT submit recreates the removed review (research §1) → one-line `else { setRating(0); setComment(""); setImages([]); }`.
- **Gate must be hydration-safe + lint-safe**: default verdict = enabled (no flash-disabled, protects `g-reviews` R7/R8 which submit with a FRESH existing review); no synchronous `setState` inside the effect body (repo already carries an `eslint-disable react-hooks/set-state-in-effect` at `customer-reviews.tsx:36` — avoid needing one): the hook stores a **verdict keyed by `reference:createdAt`** and only `setState` inside the async callback; `existing === null` → returns `false` with zero state writes (so post-delete the form re-enables instantly).
- **WRAP trap analysis** (`g-reviews.mjs:22` `#customer-reviews [aria-disabled="true"]`): `:179` (no booking → wrapper disabled via `enabled`, unchanged) · `:199` (booking, NO existing review → gate inert → aria-disabled absent, unchanged) · `:286` (cleanup → unchanged). R7/R8 have an existing review but it is minutes old → verdict `expired=false` → unchanged.
- Edit scroll target: add `data-testid="write-review-form"` on the wrapper div `:115` (P2's menu already queries it with `?.`).
- Delete→recalc needs NO code: `deleteReview` → `notifyChanged` (`reviews.ts:24-30`) → `CustomerReviews refresh` (`:30-47`), `TourRatingBadge refresh`, `WriteReviewForm refresh` all re-derive; rating is computed from storage every time (`getAggregate`, `reviews.ts:110-118`).

## Requirements
**Functional**
1. NEW `src/components/reviews/use-edit-window-gate.ts` (~30 ln incl. JSDoc):
   ```ts
   export function useEditWindowGate(existing: TourReview | null): boolean {
     const [verdict, setVerdict] = useState<{ key: string; expired: boolean } | null>(null);
     useEffect(() => {
       if (!existing) return;
       const key = `${existing.reference}:${existing.createdAt}`;
       let cancelled = false;
       fetchServerNow().then((now) => {
         if (!cancelled) setVerdict({ key, expired: now === null || isEditWindowExpired(existing.createdAt, now) });
       });
       return () => { cancelled = true; };
     }, [existing]);
     if (!existing) return false;
     const key = `${existing.reference}:${existing.createdAt}`;
     return verdict?.key === key && verdict.expired;
   }
   ```
   Semantics: fetch/parse failure (`null`) → `expired: true` (fail-closed) · no verdict yet for this `key` → `false` (enabled, no flash) · `existing` null → `false` (re-enable after delete) · fresh key after re-create → old verdict ignored.
2. `write-review-form.tsx`:
   a. State: `const [existing, setExisting] = useState<TourReview | null>(null);` and in `refresh()` set it right after `setBooking(match)` (replacing the purely local use of `existing`).
   b. Else-clear at `:56-60`: `if (existing) { …prefill… } else { setRating(0); setComment(""); setImages([]); }`.
   c. `const editExpired = useEditWindowGate(existing);` + `const formEnabled = enabled && !editExpired;`.
   d. Wrapper `:115-120`: add `data-testid="write-review-form"` (same line as `aria-disabled`, no extra line); `aria-disabled={!formEnabled}`; wrapper class condition `!formEnabled`.
   e. Control sites use `formEnabled` (`:142` stars, `:163` Textarea, `:174` image input, `:179` submit); `:45` (`enabled`), `:124` avatar row, `:130` hint condition stay as-is.
   f. Hint (next to `writeReviewHint` block `:130-134`): `{editExpired && <p className="mt-2 text-sm text-muted-foreground">{t("reviews.editWindowClosed")}</p>}` (key added in P2).
3. Edit integration: P2 menu's `document.querySelector('[data-testid="write-review-form"]')` now resolves → Edit scrolls to + focuses the Textarea (focus is a no-op when disabled — acceptable; menu Edit is disabled in the same condition).
4. Delete→recalc end-to-end sanity (manual, feeds P4): seed one owned 4★ review → badge `4.0` → kebab Delete → confirm → card gone + badge gone + empty state + storage payload gone + form re-enabled with empty fields.

**Non-functional**: `write-review-form.tsx` ≤200 LOC (hard) · gate never disabled pre-hydration or before the server-time response · NO new `aria-disabled` anywhere except the existing wrapper · theme tokens only · no new deps · no `TourReview` schema change.

## Related Code Files
**Tạo**: `src/components/reviews/use-edit-window-gate.ts`
**Sửa**: `src/components/reviews/write-review-form.tsx` (`:34-45` state/consts, `:47-62` refresh, `:115-120` wrapper, `:130-134` hint, `:142`, `:163`, `:174`, `:179`)
**Không sửa**: `review-actions-menu.tsx` (P2), `review-card.tsx`, `customer-reviews.tsx`, `src/lib/reviews.ts`, `src/lib/edit-window.ts`, `src/messages/*` (keys exist), `tests/*` (P4)

## Implementation Steps
1. Create `use-edit-window-gate.ts` per Functional 1 (imports: `useEffect`/`useState`, `fetchServerNow`/`isEditWindowExpired` from `@/lib/edit-window`, `type TourReview` from `@/lib/reviews`).
2. `write-review-form.tsx` edits a→f (state + else first, then hook, then swap `!enabled`→`!formEnabled` at the 5 control sites, then testid + hint).
3. `wc -l src/components/reviews/write-review-form.tsx` → must be ≤200; if over → extract `:47-79` effect into `use-write-review-state.ts` returning `{ booking, existing, loaded }` (form passes prefill setter) and record the deviation in `plan.md`.
4. Manual delete→recalc sanity (Success Criteria §3).
5. Verify: `npm run lint` · `npm test` · `npm run build` + DOM checks below.

## Todo List
- [ ] `use-edit-window-gate.ts` (keyed verdict, fail-closed, no sync setState in effect)
- [ ] `write-review-form.tsx`: `existing` state + `setExisting` in refresh
- [ ] else-clear `rating/comment/images` when no existing review
- [ ] `formEnabled` wired into wrapper + 4 controls + `editWindowClosed` hint
- [ ] `data-testid="write-review-form"` on wrapper (P2 Edit target)
- [ ] `wc -l` ≤200 (extract `use-write-review-state.ts` only if needed → deviation)
- [ ] Verify: `npm run lint` · `npm test` · `npm run build` · DOM checks

## Success Criteria
- `npm run lint` → 0 · `npm test` → **`14/14 files passed`** · `npm run build` → 0 · `wc -l src/components/reviews/write-review-form.tsx src/components/reviews/use-edit-window-gate.ts` → **≤200** each (form ≈199, hook ≈30).
- `grep -c 'data-testid="write-review-form"' src/components/reviews/write-review-form.tsx` → **1** (P2 menu target resolves).
- `grep -E "#[0-9a-fA-F]{3}|red-" src/components/reviews/write-review-form.tsx src/components/reviews/use-edit-window-gate.ts` → **0**.
- DOM `/vi/explore/destinations/hcm` (dev :3000, same seed/harness as P2 probe):
  1. **Fresh review** (`createdAt` = now−1m): `[data-testid="write-review-form"]` has NO `aria-disabled` attr, `textarea` `disabled === false`, page text does NOT contain `vi.json` `reviews.editWindowClosed`.
  2. **Expired review** (re-seed `createdAt` = now−4h, reload): `#customer-reviews [data-testid="write-review-form"][aria-disabled="true"]` exists, `getComputedStyle(form).pointerEvents === "none"`, textarea `disabled === true`, text contains `Chỉ có thể chỉnh sửa đánh giá trong vòng 3 giờ sau khi đăng.`, AND menu `[data-testid="review-actions-edit"]` `disabled === true` (both paths gated, same condition).
  3. **Delete → recalc**: restore fresh owned 4★ review → reload → `[data-testid="tour-rating-badge"]` text starts `4.0` → open menu → Delete → `page.once("dialog", d => d.accept())` → after event: `[data-testid="review-card"]` count **0**, badge **absent**, section text contains `Chưa có đánh giá`, `JSON.parse(localStorage["vn-reviews:v1"])` contains no `VN-…:hcm` entry → **form**: `aria-disabled` ABSENT, `textarea.value === ""`, all 5 stars `aria-pressed === "false"` (else-branch proof), no `editWindowClosed` text.
  4. **No-booking state preserved**: clear bookings → wrapper `aria-disabled` + `writeReviewHint` text (`Chỉ khách đã đặt tour này…`) exactly as before (g-reviews R2 shape).
- Full pipeline this phase: `npm run lint` → `npm test` → `npm run build` all exit 0.

## Risk Assessment
- **R1 stale-prefill recreate bug** (the else fix) → proven by check 3 (textarea `""` + star reset); automated as K5 in P4.
- **R2 flash-disabled / race**: verdict defaults to enabled until `/api/server-time` answers → protects R8-style immediate submits; a genuinely expired review is disabled within one round-trip (ms on dev). Accepted transient per binding 3.
- **R3 fail-closed false positive** (server hiccup) disables editing until the next refresh event → accepted (binding 3); user recovers via reload / any reviews event.
- **R4 g-reviews R7/R8** now trigger `/api/server-time` mid-suite → local endpoint, fast; full browser suite re-run in P4 is the safety net (never weaken `g-reviews.mjs`).
- **R5 LOC overflow** → `wc -l` gate + documented extraction fallback (step 3).
- **R6 focus target disabled** → `focus()` on a disabled textarea no-ops; assert scroll destination, not focus, in tests.

## Security Considerations
- The 3h gate is a **UX time window, not authorization** — data is device-local; server time only defeats a lying device clock, no server-side enforcement is possible (research §3). Documented in changelog so it isn't oversold.
- Permanent delete behind `window.confirm` prevents accidental loss; removed payload includes the review's images (data-URLs) — nothing lingers in storage.
- No new endpoints, no new network calls beyond P1's read-only `/api/server-time`; no PII added (hint is static copy); React escaping unchanged (no `dangerouslySetInnerHTML`).

## Next Steps
- P4 automates every criterion here (K3 = expired menu + form, K4 = delete→recalc, K5 = cleared form) and runs the full pipeline + changelog.

## Decisions already made
Gate BOTH paths (binding 5) · fail-closed on fetch failure · keyed-verdict hook (hydration-safe, lint-safe, instant re-enable after delete) · gate hook extracted purely for the 200-LOC rule · else-clear lives in the form (it owns field state) · hint key = `editWindowClosed` (added in P2) · Edit mechanism unchanged (scroll + prefill + resubmit) · create-path (no existing review) never gated.
