# Research Summary — About Us Section + Contact Page

**Date**: 2026-09-28 · **Verified by**: planner (spot-verification of prior researcher claims; 4 corrections below)

## 1. Header
- `src/components/layout/header.tsx` ("use client", 108 ln): `navItems` array `:11-18`; `{ key: "about", href: "/about" }` **:17** (VERIFIED). Labels via `useTranslations("common")` rendered desktop `:38` + mobile Sheet `:98` (VERIFIED) → deleting `:17` covers both. Buttons use Base UI `render={<Link/>}` pattern (`:47`) — reusable for Contact CTA.
- `common.about` key `en.json:82` ("About Us") / `vi.json:82` ("Về chúng tôi") ALSO used by `footer.tsx:79` (`t("about")` heading, `useTranslations("common")` at `:30`) and `sitemap/page.tsx:87` (`tc("about")` heading) → **keep message key, remove only the array entry**.
- Other `/about` links stay valid: `footer.tsx:21`, `sitemap/page.tsx:89` (About page is KEPT).

## 2. Homepage
- `src/app/[locale]/page.tsx` (42 ln): render order `:31-39` = HeroSection, QuickAccessIcons, **FeaturedDestinations :33**, ExperienceCategories :34, TrendingItineraries, EventsTicker, StoriesSection, TradeCtaBand, NewsletterCTA; data fetch `:17-27` (VERIFIED). New section inserts between `:33` and `:34`.
- Section conventions `src/components/homepage/*` (all 28-68 ln): kebab-case, named export, <200 ln, `<section className="…">` + `container mx-auto px-4 py-16`; server style = `async` + `getTranslations("home")` (`trade-cta-band.tsx:5-6`), client style = `"use client"` + `useTranslations("home")` (`featured-destinations.tsx:1,19`). All use `home` namespace (shared keys OK).
- **SEARCH TRAP (CORRECTION)**: `src/app/[locale]/search/page.tsx:115-116` (research said 115-117): `for (const [slug, page] of Object.entries(messages.about ?? {})) collect(..., \`/about/${slug}\`, page.title, page.subtitle)` → any NEW copy with title+subtitle under `about.*` emits a fake `/about/<key>` search result. **About-section copy MUST go under `home.*`, never `about.*`.**
- Search page scans ONLY: `planTrip.guides`, `thingsToDo.categories`, `itineraries.items`, `festivals.items`, `culture.sections`, `deals.items`, `news.items`, `about.*` (explicit list `:62-117`) → new top-level `contact` namespace is NOT scanned (no trap, and desired `/contact` is not auto-emitted).

## 3. Pages / links / sitemaps
- `src/app/[locale]/about/page.tsx` (38 ln) — KEEP (static metadata precedent `:5` `"About Us | DuanMar"`).
- `src/app/[locale]/about/contact/page.tsx` (90 ln, dir contains ONLY page.tsx) — display-only: 4 mailto channel cards `:42-61`, hours `:63-69`, 3 regional mailto cards `:71-86`; no form/phone/socials → REPLACE with redirect stub (do not delete dir → search results + backlinks would 404).
- **Exactly 7** hardcoded `/about/contact` hrefs (grep VERIFIED):
  `footer.tsx:22` · `sitemap/page.tsx:90` · `support/page.tsx:62` · `accessibility/page.tsx:50` · `business-mice/page.tsx:60` · `privacy/page.tsx:74` · `trade/page.tsx:60`.
- **Sitemaps (CORRECTION)**: `src/app/sitemap.ts` routes array `:8-31` contains `/about` at `:17` but has **NO `/about/contact`** → only action = ADD `"/contact"`. `sitemap/page.tsx:90` is the rewired HTML-sitemap entry (already counted among the 7).
- Metadata pattern: static `export const metadata` (no per-locale metadata anywhere).
- Routing: all pages under `src/app/[locale]/`; middleware matcher `["/", "/(en|vi)/:path*"]` → `/en/contact` + `/vi/contact` work; bare `/contact` 404s — SAME pre-existing behavior as `/about` (no regression).
- **Redirect precedent (VERIFIED)**: `src/app/[locale]/explore/page.tsx:1` imports `{ redirect } from "@/i18n/navigation"`, `:5-9` awaits `params` → `redirect({ href, locale })`. next-intl `createNavigation` ALSO exports `permanentRedirect` (308) — typed at `node_modules/next-intl/dist/types/navigation/react-server/createNavigation.d.ts:340` — but `src/i18n/navigation.ts:1-3` destructures only `{ Link, redirect, usePathname, useRouter }` → **+1 line needed to expose `permanentRedirect`**.

## 4. Forms / API
- `package.json` (VERIFIED): NO `react-hook-form`, NO `zod`, no form lib at all. Single new dep per binding decision 6. Lockfile = `package-lock.json` (npm).
- Manual-validation precedent: `src/components/booking/booking-validation.ts` — `EMAIL_PATTERN` `:32` `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`, `PHONE_PATTERN` `:33` `^\+?[0-9][0-9\s-]{6,14}$`, `validateBooking()` `:51-87` returns **i18n error keys** (locale-agnostic, empty object = valid). Forms: `booking-form.tsx` (158 ln, useState values/errors), `write-review-form.tsx` (191 ln).
- Primitives: `ui/input.tsx`, `ui/textarea.tsx`, `ui/label.tsx`, `ui/button.tsx` (Base UI, `render` prop), `ui/card.tsx`; NO form/field primitive; `booking-field.tsx:31` hardcodes `useTranslations("booking")` → not reusable.
- API precedent: `src/app/api/revalidate/route.ts` — `export const runtime = "nodejs"` `:5`, `POST` `:8`, `Response.json(..., {status})`, GET→405 `:43-45`, try/catch→500. Existing API dirs: `src/app/api/{revalidate,draft-mode}` (route at `src/app/api/contact/route.ts`, NOT locale-scoped). **No `fetch` POST anywhere in app code yet** (client POST pattern is net-new).

## 5. Video
- Zero `<video>` / mp4 / embeds repo-wide. `public/` = only `images/promo-modal.png`. `aspect-video` precedent: `destination-card.tsx:32`, `explore/destinations/[slug]/page.tsx:70`.
- Drop-in asset path: `public/videos/about-promo.mp4` (dir does not exist yet; created when asset lands). Interim poster = `/images/promo-modal.png`.

## 6. Contact data / i18n
- Existing contact copy: `about.contact.*` `en.json:362-400` (channels/hours/offices) — emails only; hours `:384`. Phone/FB/IG/TikTok = net-new. Footer has no socials.
- **Top-level namespaces (VERIFIED)**: `booking, priceRange, pricing, common, home(:87), nav, destinations, notFound, planTrip, about(:351), footer(:460), …` → **no top-level `contact` namespace exists** → free to add; must exist in BOTH `en.json` + `vi.json`.
- Parity test `tests/unit/i18n-parity.test.ts:21-33` flattens objects AND arrays (`Object.entries` on arrays → index keys) → object/array shapes must match between locales.

## 7. Icons (CORRECTION)
- Installed `lucide-react@1.48.0` (4236 icons): **NO Facebook / Instagram / TikTok brand icons** (grep of `dist/esm/icons/` = 0 hits). Available: `Phone`, `Mail`, `Music2`, `CirclePlay`, `Play`. → social contact nodes = oversized text chips (label + value), Phone/Email nodes get Phone/Mail icons.

## 8. Tests / runners / rules
- `tests/browser/g-header.mjs` asserts only trip-planner absence + search/my-trips presence (`:32-40`) → header change breaks nothing. Grep over `tests/` for "about" = **0 hits** (no test visits /about or /about/contact).
- Runners: `npm test` = `node tests/run-unit.mjs` (discovers `tests/unit/*.test.{ts,mts}` sorted, `npx tsx`); `npm run test:browser` = `node tests/run-browser.mjs` (requires `npm run dev` on :3000, discovers `tests/browser/*.mjs` sorted; harness imports `.claude/skills/chrome-devtools/scripts/lib/browser.js`, local `check()` helper — no framework). `revalidate-webhook` test pre-fails without `SANITY_REVALIDATE_SECRET` env (known).
- Rules: files <200 LOC, kebab-case, no `*-enhanced`, YAGNI/KISS/DRY, theme tokens only (`text-primary`/`bg-primary/10`, NEVER hex/`red-*`), `@/i18n/navigation` Link (not `next/link`), per-phase `npm run lint` → `npm test` → `npm run build`.
- Docs: append-only entry to `docs/project-changelog.md` under existing `## 2026-09-28` heading (`:261`); `docs/development-roadmap.md` does NOT exist → skip roadmap.

## Corrections to prior research
1. Search trap lines = `search/page.tsx:115-116` (was stated 115-117).
2. `src/app/sitemap.ts` has NO `/about/contact` entry → "2 sitemap entries" = ADD `/contact` to `sitemap.ts` + rewire `sitemap/page.tsx:90` (the latter already counted among the 7 links).
3. lucide-react 1.48.0 has no FB/IG/TikTok icons → text-chip social nodes.
4. `permanentRedirect` exists in next-intl but is NOT re-exported by `src/i18n/navigation.ts` → 1-line addition required (fallback: `redirect` 307).
