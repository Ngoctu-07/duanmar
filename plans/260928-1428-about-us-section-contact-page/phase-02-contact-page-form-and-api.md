# Phase 02 — /contact Page + React Hook Form + /api/contact

## Context Links
- Plan: `plan.md` P2 · Research: `research/research-summary.md` §3 (pages/metadata), §4 (forms/API), §6 (i18n), §7 (icons)
- Files: NEW `src/app/[locale]/contact/page.tsx`, `src/components/contact/contact-form.tsx`, `src/app/api/contact/route.ts`, `src/lib/contact-validation.ts`; `package.json`+lock; `src/messages/{en,vi}.json`

## Overview
- Priority: high · Status: Complete · Progress: 100% · Est: 1 day · Depends on: P1 (shared messages files, CTA contract)
- New `/contact` page: hero with 5 oversized clickable contact nodes (Phone, Email, FB, IG, TikTok), below = 50/50 grid: React Hook Form form (Full Name/Email/Phone/Message, all required) + info panel. Form POSTs JSON to new `/api/contact` which validates, `console.log`s (masked), returns 2xx. No DB.

## Key Insights
- No form lib in repo (`package.json` verified: no react-hook-form/zod) → `npm i react-hook-form` is the ONLY new dep (binding 6); validation logic extracted to `src/lib/contact-validation.ts` mirroring `booking-validation.ts:32-33` (EMAIL/PHONE patterns) + `:51-87` (returns i18n error keys, `{}` = valid) so client RHF rules and server API share ONE source of truth and it is unit-testable under `npx tsx`.
- No top-level `contact` namespace exists in `en.json` (top-level keys verified) → add new `contact.*` in BOTH locales; search page does NOT scan it (`search/page.tsx:62-117` explicit namespace list) → no phantom search results.
- API precedent `api/revalidate/route.ts:5,8,43-45`: `runtime = "nodejs"`, `Response.json`, GET→405. Route lives at `src/app/api/contact/route.ts` (NOT locale-scoped, matches existing `api/{revalidate,draft-mode}`).
- No `fetch` POST exists anywhere in app code yet → form submit pattern is net-new (plain `fetch` + `Content-Type: application/json`, no cookies/credentials needed → CSRF-low).
- Metadata: static `export const metadata` (precedent `about/page.tsx:5` `"About Us | DuanMar"` → `"Contact Us | DuanMar"`).
- lucide 1.48.0 has NO Facebook/Instagram/TikTok icons → Phone/Email nodes use `Phone`/`Mail`; social nodes are oversized text chips (label + value).
- Contact node values + hrefs live in i18n (`contact.nodes.<key>.{label,value,href}`) → placeholders swappable without code change (binding 4). Render order fixed in code: `["phone","email","facebook","instagram","tiktok"]`.
- `tests/unit/i18n-parity.test.ts` flattens objects+arrays → identical shapes both locales.

## Requirements
**Functional**
1. `npm i react-hook-form` → `package.json` + `package-lock.json` only (no zod, no other deps).
2. NEW `src/lib/contact-validation.ts` (<120 ln, no DOM): `interface ContactValues { fullName; email; phone; message }` · `EMAIL_PATTERN`/`PHONE_PATTERN` copied from `booking-validation.ts:32-33` · `isNameValid` (trim, ≥2) / `isEmailValid` / `isPhoneValid` / `isMessageValid` (trim, non-empty, ≤5000) · `validateContactPayload(values: unknown): Partial<Record<keyof ContactValues, "required"|"nameInvalid"|"emailInvalid"|"phoneInvalid"|"messageInvalid">>` (guards non-string/missing, `{}` = valid, error keys locale-agnostic) · `maskEmail`/`maskPhone` (log helpers, e.g. `i***@domain.com`, `+84******4567`).
3. NEW `src/components/contact/contact-form.tsx` (~170 ln): `"use client"`; `useForm<ContactValues>({ defaultValues: {…empty}, mode: "onBlur" })`; RHF `register("fullName", { validate })` wrapping lib predicates (server/client share logic); fields = Full Name (`Input`), Email (`Input type="email"`), Phone (`Input type="tel"`), Message (`Textarea`) with `Label`; errors from `formState.errors` → `t(\`form.\${key}\`)`; `aria-invalid` + `aria-describedby`; submit handler: `fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) })`, `!res.ok` → throw; states: `isSubmitting` (RHF) → disabled button `form.submitting`; success → `reset()` + `<p data-testid="contact-form-success" role="status">`; failure → `<p data-testid="contact-form-error" role="alert">`. NEVER render submitted values back (no reflected XSS surface). `data-testid="contact-form"`.
4. NEW `src/app/[locale]/contact/page.tsx` (~130 ln): `export const metadata` static ("Contact Us | DuanMar"); `async` + `getTranslations("contact")`; hero: `h1` = `title`, `p` = `subtitle`, node row = ordered keys, each `<a data-testid="contact-node" data-node={key} href={node.href} className="…oversized chip (border rounded-xl px-5 py-4 hover:bg-muted, text-xl font-semibold value)…">` with `Phone`/`Mail` icon for those two; below: `grid grid-cols-1 md:grid-cols-2 gap-8` → LEFT `<ContactForm />`, RIGHT info card (`ui/card`) = `contact.info.*` (hoursTitle, hours, responseNote). All links from i18n (tel:/mailto:/https).
5. NEW `src/app/api/contact/route.ts` (~70 ln): `export const runtime = "nodejs"`; `GET` → 405; `POST`: (a) `content-type` must include `application/json` else **415** `{error:"Unsupported media type"}`; (b) `content-length` > 10000 → **413**; (c) `await req.json()` try/catch → **400**; (d) `validateContactPayload` non-empty → **400** `{errors}`; (e) `console.log("[contact]", { at, nameLength, email: maskEmail, phone: maskPhone, messageLength })`; (f) **200** `{ ok: true }`. No DB, no external calls, no redirect.
6. i18n `contact.*` in BOTH `en.json`+`vi.json`: `title`, `subtitle`, `nodes.{phone,email,facebook,instagram,tiktok}.{label,value,href}` (placeholders: `+84 28 3822 0000`/`tel:+842838220000`, `info@vietnam-tourism.com`/`mailto:…`, `facebook.com/vietnamtourism`, `instagram.com/vietnamtourism`, `tiktok.com/@vietnamtourism`), `form.{nameLabel,emailLabel,phoneLabel,messageLabel,submit,submitting,success,failure,required,nameInvalid,emailInvalid,phoneInvalid,messageInvalid}`, `info.{hoursTitle,hours,responseNote}`.

**Non-functional**: all new files <200 LOC · a11y (labels, `role="status"/"alert"`, focus order) · theme tokens only · no zod · inputs `autoComplete` (`name`, `email`, `tel`) · message cap enforced client+server.

## Related Code Files
**Tạo**: `src/app/[locale]/contact/page.tsx`, `src/components/contact/contact-form.tsx`, `src/app/api/contact/route.ts`, `src/lib/contact-validation.ts`
**Sửa**: `package.json`, `package-lock.json` (react-hook-form), `src/messages/en.json`, `src/messages/vi.json` (top-level `contact.*`)
**Không sửa**: `about/contact/page.tsx` (P3), `about.contact.*` messages (search still indexes them; redirect keeps URL alive), `booking-validation.ts`, `booking-field.tsx` (hardcodes `booking` ns — not reusable), middleware, Sanity anything

## Implementation Steps
1. `npm i react-hook-form`; confirm diff touches only `package.json` + `package-lock.json`.
2. Create `contact-validation.ts` (patterns + predicates + `validateContactPayload` + masks).
3. Create `contact-form.tsx` (RHF register/validate, 4 fields, fetch submit, success/failure testids, reset).
4. Create `contact/page.tsx` (metadata, hero nodes ordered, 50/50 grid form + info card).
5. Create `api/contact/route.ts` (guards a–f above; `runtime = "nodejs"`).
6. Add `contact.*` to `en.json` + `vi.json` (identical shapes; insert top-level next to `about`).
7. Verify (commands below).

## Todo List
- [x] Install `react-hook-form` (package.json + lock only)
- [x] `src/lib/contact-validation.ts` (predicates + payload validator + masks)
- [x] `contact-form.tsx` (RHF, 4 required fields, JSON POST, success/failure states)
- [x] `contact/page.tsx` (hero nodes + 50/50 form/info, static metadata)
- [x] `api/contact/route.ts` (415/413/400/200 chain + masked `console.log`)
- [x] `contact.*` i18n in BOTH locales
- [x] Verify: `npm run lint` · `npm test` · `npm run build`

## Success Criteria
- `grep react-hook-form package.json` → present; `grep zod package.json` → 0.
- `npm run lint` = 0 · `npm test` green (parity includes every new `contact.*` key) · `npm run build` green · all new files <200 LOC.
- API (dev server): `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3000/api/contact -H "Content-Type: application/json" -d '{"fullName":"Nguyen Van A","email":"a@example.com","phone":"+84901234567","message":"Hello, I would like more info."}'` → **200** `{"ok":true}`; missing `email` → **400** with `errors.email`; `Content-Type: text/plain` → **415**; body >10KB → **413**; `GET` → **405**; server log line shows masked email (no raw `a@example.com`).
- DOM `/vi/contact`: 5 `a[data-testid="contact-node"]` with hrefs `tel:`, `mailto:`, `facebook.com`, `instagram.com`, `tiktok.com` (values read from `vi.json`); all `<a href>` non-empty & clickable; empty submit → 4 visible field errors + 0 network POST; valid fill → exactly 1 POST to `/api/contact` (200) → `[data-testid="contact-form-success"]` visible, fields cleared; failed POST (stop route via devtools/offline) → `[data-testid="contact-form-error"]`.
- Theme sweep: no hex/`red-*` in new files.

## Risk Assessment
- **R1 RHF API misuse** (`register` vs controlled inputs) → follow v7 plain `register` spread; no `Controller` needed (plain inputs).
- **R2 double validation drift** client vs server → single lib, RHF `validate` delegates to same predicates; unit test covers server side.
- **R3 unauthenticated public endpoint = spam/abuse** → accepted scope: size cap + validation only; **rate limiting/captcha = documented non-functional gap** (note in changelog).
- **R4 i18n parity** on large `contact.*` tree → add both locales same step, `npm test`.
- **R5 server/client boundary**: page must stay server (metadata + static render); only form is client → no `useTranslations` in page (use `getTranslations`).
- **R6 phone input UX** (`type=tel` + PHONE_PATTERN allows `+`, spaces, dashes) → placeholder shows format.

## Security Considerations
- **XSS**: React escapes all rendered text; form NEVER echoes submitted values; no `dangerouslySetInnerHTML`; i18n `href` values are static (tel/mailto/https — no `javascript:` possible from JSON, but API does not accept hrefs anyway).
- **API**: content-type enforcement (415) + JSON parse guard (400) + 10KB length cap (413) + field types/pattern/length validation (400) → no unbounded parse, no type confusion; response contains only `{ok}`/`{errors}` (no echo of payload → no PII leakage in responses).
- **Logs**: masked email/phone + lengths only (decision: satisfy binding `console.log` WITHOUT raw PII — see Unresolved Q1).
- **CSRF**: JSON-only content-type + no auth cookies used by handler → low risk; same-origin fetch default.
- **Gap (documented)**: no rate limiting, no captcha, no persistence → abuse possible; non-functional, out of scope per binding 3 (No DB).

## Next Steps
- Phase 3 rewires inbound links to this route; phase 4 covers POST + DOM assertions via `j-about-contact.mjs` and unit-tests `contact-validation.ts`.

## Decisions already made
`react-hook-form` manual validation, no zod · shared validation lib (client+server) · static English metadata · social nodes = text chips (no brand icons in lucide 1.48.0) · node order hardcoded `["phone","email","facebook","instagram","tiktok"]` · masked logging · 415/413/400/405 guard chain · success = inline message + reset.
