# Phase 02 — Contact Form Heading + Search CTA Href Fix

**Status**: Complete · **Priority**: High · **AC**: 2 — *`/contact` = Phone + Gmail details + feedback form whose container shows a prominent heading line **"Form liên hệ"** at the top* · **Depends on**: P1 (shared `src/messages/*.json`)

## Context Links
- `src/app/[locale]/contact/page.tsx`: h1 `t("title")` `:33` ("Contact Us"/"Liên hệ với chúng tôi"), subtitle `:34-36`, 5 node cards `:39-64` (`data-testid="contact-node"` `:46`, `href={node.href}` `:48`, `NODE_KEYS` `:19` = phone,email,facebook,instagram,tiktok), two-column grid `:66-77` → left cell `:67` `<ContactForm />`, right `Card` `:68-76` (`info.hoursTitle`). **No h2 anywhere on the page.**
- `src/components/contact/contact-form.tsx` (158 LOC): `<form data-testid="contact-form" noValidate … className="space-y-4">` `:91-97` (testid `:92`), first child = Field `:98`, submit `:142-144`, status `role="status"|"alert"` `:146-155`.
- i18n `contact.*` `src/messages/{en,vi}.json:366-396` (`title/subtitle` `:367-368`, `nodes` `:369-375`, `form` `:376-390`, `info` `:391-395`) — **no heading key**; parity enforced by `tests/unit/i18n-parity.test.ts:22-58`.
- Heading precedent: `booking-contact-section.tsx:22-26` — `<section aria-labelledby>` + `<h2 id className="text-sm font-semibold …">`; `CardTitle` renders `<div class="font-heading text-base font-medium">` (`ui/card.tsx:38-47`).
- Search index `src/app/[locale]/search/page.tsx:115-117`: `for (const [slug, page] of Object.entries(messages.about ?? {})) collect(entries, "page", \`/about/${slug}\`, …)` → slug `contact` (object with title/subtitle, `about` keys = title…contact/careers/press) emits `/about/contact`; string-valued keys are skipped by `collect`'s `if (title)` guard `:53`.
- Test contracts: `j-about-contact.mjs:87-99` (5 nodes + tel:/mailto:), `:117-128` (exactly 4 `[role="alert"]`, all `contact.form.required`), `:129` (0 POST), `:141-151` (exactly 1 POST, keys `email,fullName,message,phone`), `:152-155` (fields cleared), `:69-70` (homepage CTA `a[href="/vi/contact"]`), `:159-164` (308 stub) · `m-footer-brand.mjs:116-119,173-174` (footer Col B byte-equal `contact.nodes`).

## Requirements
- R1: `contact.formHeading` added to **BOTH** `en.json` and `vi.json`. VI value **exactly** `Form liên hệ`; EN proposed `Contact Form`.
- R2: heading is the **FIRST element inside `<form>`**, rendered as a clear/prominent heading line.
- R3: search index entry for the `contact` slug points to `/contact` (locale prefix applied by `Link` in `search-client.tsx:93` → `/vi/contact`, `/en/contact`).
- R4: Phone + Gmail cards **verified only** — no code change; no `/contact` link added to footer Col B.

## Related Code Files
- **Modify**: `src/components/contact/contact-form.tsx` (`:91-97` form attrs + insert heading before `:98`; 158 → ~163 LOC)
- **Modify**: `src/messages/en.json:368` / `src/messages/vi.json:368` (insert `formHeading` after `subtitle`, before `nodes` `:369`)
- **Modify**: `src/app/[locale]/search/page.tsx:115-117` (1-line href expression)
- **Delete**: none

## Implementation Steps
1. **i18n** — insert after `contact.subtitle` in both files:
   `"formHeading": "Contact Form"` (en, after `:368`) · `"formHeading": "Form liên hệ"` (vi, after `:368`).
2. **Heading markup** (first child of `<form>`, before the name Field):
   ```tsx
   <h2 id="contact-form-heading" className="font-heading border-b border-border pb-3 text-lg font-semibold text-foreground">
     {t("formHeading")}
   </h2>
   ```
   and add `aria-labelledby="contact-form-heading"` to `<form>` `:91-97`.
   **Chosen approach (1-line justification)**: bare `<h2>` + `aria-labelledby` mirrors the `booking-contact-section.tsx:22-26` precedent, gives the `<form>` an accessible name without wrapper markup, and keeps the heading strictly as the form's first element to satisfy the AC2 first-element assertion (a `CardTitle` `<div>` would be a non-heading element and `contact/page.tsx` is an RSC — the heading must live in the client form component to be inside `<form>`).
   `border-b … pb-3` supplies the "heading line" (rule/divider) reading; `space-y-4` still spaces Field 1 below.
3. **Search fix** (`search/page.tsx:115-117`):
   ```ts
   const href = slug === "contact" ? "/contact" : `/about/${slug}`;
   collect(entries, "page", href, page.title, page.subtitle);
   ```
   (only `contact` is remapped; `careers`/`press` keep `/about/*` — those routes exist at `src/app/[locale]/about/{careers,press}`; legacy stub untouched).
4. **Grep check (already done)**: `grep -rn "about/contact" tests/` → only `j-about-contact.mjs:159` (308 stub assertion). **No test/fixture asserts the search index URL** → fix is safe; no test edits needed.
5. `npm run lint` + `npm test` (parity) + manual `/vi/contact`, `/en/contact`, `/en/search?q=contact`.

## Todo List
- [x] Add `contact.formHeading` to `src/messages/en.json` (`Contact Form`)
- [x] Add `contact.formHeading` to `src/messages/vi.json` (`Form liên hệ`)
- [x] Insert `<h2 id="contact-form-heading">` as first child of `<form>` + `aria-labelledby` on the form (`contact-form.tsx`)
- [x] Fix `search/page.tsx:115-117` href → `/contact`
- [x] Verify-only checklist below (no edits) + screenshots
- [x] `npm run lint` && `npm test` (14/14)

## Verification Checklist — Phone + Gmail already render (no code change)
| AC2 item | Where | Evidence |
|---|---|---|
| 5 contact cards | `contact/page.tsx:39-64` | `j-about-contact.mjs:87-88` exactly 5 `a[data-testid="contact-node"]` |
| Phone | `contact/page.tsx:46-48` + `en.json:370`/`vi.json:370` `href:"tel:+842838220000"` | `j-about-contact.mjs:92-95` `tel:` |
| Gmail/Email | `contact/page.tsx:46-48` + `en.json:371`/`vi.json:371` `href:"mailto:info@vietnam-tourism.com"` | `j-about-contact.mjs:92-95` `mailto:` |
| CTA → `/contact` | `homepage/about-us-section.tsx:22` `render={<Link href="/contact" />}` | `j-about-contact.mjs:69-70` `a[href="/vi/contact"]` |
| Heading "Form liên hệ" | new `<h2>` in `contact-form.tsx` | P3 `n-lightbox-contact.mjs` (VI + EN) |

## Success Criteria
- `/vi/contact` shows `Form liên hệ` as the first line inside the form, underlined heading style; `/en/contact` shows `Contact Form`.
- `/en/search?q=contact` result links to `/en/contact`; zero results carry `/about/contact`.
- `j-about-contact.mjs` semantics unchanged (4 alerts / 1 POST / payload keys / cleared fields / 5 nodes / 308 stub).
- i18n parity green; lint clean; files <200 LOC.

## Risks
- Adding the key to only one locale → parity failure (mitigate: edit both files in the same step).
- Accidentally emitting a `role="alert"` or button in the heading → breaks `j-about-contact.mjs:117-128` (heading is plain `<h2>`).
- `space-y-4` first-child spacing may look tight/loose → visual check in P2; adjust only classes on the `<h2>`.
- Search fix could regress other `about.*` entries → only `slug === "contact"` is remapped; `careers`/`press` unchanged.
