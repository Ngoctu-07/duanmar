# Phase 02 — Footer Columns (A/B/C) & i18n

Status: **Complete** · Priority: P1 · Parent: [plan.md](./plan.md)

## Context Links
- `src/components/layout/footer.tsx` — 127 LOC; `useTranslations("common")`=t (`:30`), `("footer")`=tf (`:31`); grid `grid-cols-2 md:grid-cols-4 gap-8` (`:36`); brand block `:37-44`; old columns `:46-92`; bottom bar `:95-125` **KEEP**.
- Contact pattern: `src/app/[locale]/contact/page.tsx:19` (NODE_KEYS order) + `:41` (`t.raw("nodes.<key>")` → `{label,value,href}`).
- Messages: `src/messages/en.json` / `vi.json` — `footer` namespace = 21 keys (verified: NO `tours`/`info`/`howToBook`/`articles` exist → all 4 are NEW).
- i18n parity: `tests/unit/i18n-parity.test.ts:46-59` requires every key present in BOTH files.
- Sitemap reuses footer keys: `src/app/[locale]/sitemap/page.tsx:40-97` — 16 keys still consumed elsewhere.

## Requirements
1. Brand block (left): `BrandLogo` + `BrandWordmark` + `tf("tagline")`.
2. Column A "Tours": 2 links reusing `common.domesticTours`→`/tours/domestic`, `common.internationalTours`→`/tours/international`.
3. Column B "Liên hệ": 5 links from `contact.nodes.{phone,email,facebook,instagram,tiktok}` — single source of truth (byte-identical hrefs with `/contact` page).
4. Column C "Thông tin": `howToBook`→`/support`, `articles`→`/blog`, `careers`→`/about/careers`.
5. Old explore/plan/about groups removed from footer (labels keep living in sitemap).

## i18n Keys
ADD to `footer` in BOTH `src/messages/en.json` and `vi.json` (verified absent):
| key | en | vi |
|---|---|---|
| `footer.tours` | `Tours` | `Tour` |
| `footer.info` | `Information` | `Thông tin` |
| `footer.howToBook` | `How to Book` | `Cách đặt tour` |
| `footer.articles` | `Articles` | `Bài viết` |

REUSED (no edits): `footer.contact` (Col B title: "Contact"/"Liên hệ"), `footer.careers`, `footer.tagline`, `footer.rights`, `footer.support/privacy/accessibility/sitemapHtml`; `common.domesticTours/internationalTours` (Col A items, values "Domestic Tours"/"Tour trong nước", "International Tours"/"Tour nước ngoài"); `contact.nodes.*.label` (link text).

## Old Key Disposition (footer namespace)
- KEEP — still consumed by `sitemap/page.tsx:40-97`: `destinations, thingsToDo, itineraries, festivals, events, blog, trade, aboutUs, contact, careers, pressKit, support, privacy, accessibility, tagline, rights, sitemapHtml`.
- ORPHANED after refactor (grep: only `footer.tsx:15-18` referenced them): `visaInfo, gettingAround, accommodation, healthSafety` → **KEEP by default** (provably orphaned, but deletion is optional; if ever deleted must remove from BOTH locales for parity).
- `footer.blog` stays (sitemap `:78`); footer Col C uses NEW `footer.articles` for "Bài viết".

## Related Code Files
- MODIFY `src/components/layout/footer.tsx` — replace `:5-27` (`footerLinks` explore/plan/about) and `:46-92` (3 column blocks); keep `:33-45`, `:95-125`.
- MODIFY `src/messages/en.json`, `src/messages/vi.json` — insert 4 keys inside existing `footer` object.
- REUSE `src/components/layout/brand-logo.tsx` (phase-01) in brand block.
- CREATE [conditional] `src/components/layout/footer-columns.tsx` if `footer.tsx` would exceed 180 LOC.

## Implementation Steps
1. Add the 4 keys to `footer` in BOTH message files (same nesting depth as `footer.contact`); run `npm test` → i18n parity green.
2. Rewrite `footer.tsx:5-27` config:
   ```ts
   const tourLinks = [
     { key: "domesticTours", href: "/tours/domestic" },
     { key: "internationalTours", href: "/tours/international" },
   ] as const;
   const infoLinks = [
     { labelKey: "howToBook", href: "/support" },
     { labelKey: "articles", href: "/blog" },
     { labelKey: "careers", href: "/about/careers" },
   ] as const;
   const contactKeys = ["phone", "email", "facebook", "instagram", "tiktok"] as const; // = contact/page.tsx:19 order
   ```
3. Hooks (`footer.tsx:30-31`): add `const tc = useTranslations("contact");`.
4. Brand block `:37-44`: prepend `<BrandLogo size={44} className="mb-3" />` above `<BrandWordmark className="font-semibold" />`; keep `<p>{tf("tagline")}</p>`.
5. Column A (replaces `:46-60`): heading `{tf("tours")}`; map `tourLinks` with i18n `Link` (locale prefix → `/vi/tours/domestic`), text `{t(link.key)}` (namespace `common`).
6. Column B (replaces `:62-76`): heading `{tf("contact")}`; map `contactKeys`:
   ```tsx
   const node = tc.raw(`nodes.${key}`) as { label: string; value: string; href: string };
   const external = /^https?:\/\//.test(node.href);
   // external → <a href={node.href} target="_blank" rel="noopener noreferrer">, else <a href={node.href}>
   {node.label}
   ```
   - Use PLAIN `<a>` (not i18n `Link`) so `tel:`/`mailto:`/`https://` hrefs are byte-identical to `contact.nodes` (no locale prefixing).
   - External = the 3 `https://` socials; `tel:`/`mailto:` stay same-tab.
7. Column C (replaces `:78-92`): heading `{tf("info")}`; map `infoLinks` with i18n `Link`, text `{tf(link.labelKey)}`.
8. Grid `:36`: keep `grid-cols-2 md:grid-cols-4 gap-8` — still exactly 4 children (brand + A + B + C), no change needed. (Optional per plan unresolved Q2: brand `col-span-2 md:col-span-1`.)
9. LOC guard: if `footer.tsx` >180 LOC → move the 3 column blocks to `src/components/layout/footer-columns.tsx` and import; do NOT create `*-enhanced`.
10. Leave bottom bar `:95-125` byte-identical.

## Todo
- [x] Add `footer.{tours,info,howToBook,articles}` ×2 locales; `npm test` parity pass
- [x] Replace `footerLinks` + 3 column blocks with brand + A/B/C
- [x] Contact column wired to `contact.nodes` via `tc.raw` (single source of truth)
- [x] External links `target="_blank" rel="noopener noreferrer"`; tel/mailto plain
- [x] Bottom bar untouched; LOC <200 (split if needed)
- [x] `npm run lint` + `npm run build` green

## Success Criteria
- Footer renders 4 blocks; titles VI `DuanMar | Tour | Liên hệ | Thông tin`, EN `DuanMar | Tours | Contact | Information`.
- Col B hrefs byte-equal `messages/*.json → contact.nodes.*.href`.
- Col A/C hrefs: `/vi/tours/domestic`, `/vi/tours/international`, `/vi/support`, `/vi/blog`, `/vi/about/careers` (EN unprefixed).
- Bottom bar (Support/Privacy/Accessibility/Sitemap) unchanged; sitemap page still builds (keys kept).

## Risks
- `tc.raw()` returns unknown → cast like `contact/page.tsx:41`; missing key renders `undefined` → guard with fallback `?? ""`.
- Removing `explore/plan` headings drops `common.explore/planTrip/about` usage from footer — keys remain (used elsewhere), no i18n edit.
- `blog` label differs across columns (`footer.blog`="Stories & Blog" vs new `footer.articles`="Articles") — intended, do not unify.
