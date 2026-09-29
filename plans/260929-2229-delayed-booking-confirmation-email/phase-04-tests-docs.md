# Phase 04 — Tests, Env Template, Docs

**Status:** complete · **Priority:** P1 · **Plan:** [plan.md](./plan.md)

## Scope

### Tests
1. **`tests/unit/booking-confirmation-email.test.mts`** (new; expect unit suite 19 → 21/21):
   - Subject exact format incl. reference.
   - All 8 payload fields hydrated in HTML (name, email, phone, DD/MM/YYYY date, guests, total formatted, payment method both langs, notes).
   - Date conversion: `2026-10-05` → `05/10/2026`.
   - Footer disclaimer + closing + `DuanMar Travel Team` byte-exact (both languages present).
   - XSS: `<script>` in name/notes escaped.
   - Validation: bad email/guests/reference/paymentMethod/locale/notes>500 → errors; good payload ok.
   - Delay: default 120000, env override honored, garbage env → default.
2. **`tests/browser/b-booking-confirmation-email.mjs`** (letter `b` free):
   - POST contract: 415 → 400 (missing email) → 400 (bad reference) → **202** `{queued:true, sendAt ≈ now+120s, jobId}`; 405 on GET.
   - Drives booking flow (form fill → summary → mock payment `sleep(3400)`) with `page.on("request")` spy asserting exactly one POST with correct JSON payload incl. `paymentMethod`.
   - Zero pageerrors; screenshot.

### Config / docs
3. **`.env.example`**: add `RESEND_API_KEY=`, `EMAIL_FROM=`, `BOOKING_EMAIL_DELAY_MS=120000` (commented/documented, no real values).
4. **`docs/booking-confirmation-email.md`** (new): architecture diagram (text), env vars, Resend setup runbook + troubleshooting (mirror `docs/cms-cache-revalidation.md` style), known limitations (in-process durability, dev hot-reload, no rate-limit), payload contract.
5. **`docs/project-changelog.md`**: entry under `## 2026-09-29`.

### Success Criteria
- `npm test` 21/21 · `npm run lint` 0 · `npm run build` 0 · browser suite 21/22 (revalidate-webhook expected-env-fail only).
- No real email sent in tests (dry-run provider; no `RESEND_API_KEY` in env).

## Next after phase 04
Combined close-out for ALL open plans (2114, 2135, 2151, 2207, 2229): one gate cycle → all status flips → all reports → changelog bullets.
