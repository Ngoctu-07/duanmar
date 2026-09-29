# Phase 01 — Singleton Schema + Query + Server Fetch + PromoModal Refactor

## Context Links
- **Plan**: `plan.md` (binding decisions 1-4, 7) · sibling: `phase-02-tests-pipeline-changelog.md`
- **Rules**: `.claude/rules/development-rules.md` (KISS/YAGNI/DRY, kebab-case, <200 LOC, real code not mocks) · `.claude/rules/documentation-management.md:64-121` (this 12-section structure) · `CLAUDE.md` (compile check after every code change)
- **Schema precedents**: `src/sanity/schemaTypes/homepage.ts:1` (`defineType`/`defineField` import style), `:24-29` (image + hotspot) · `src/sanity/schemaTypes/destination.ts:34-41` (boolean + `initialValue` + bilingual `description`)
- **Registry**: `src/sanity/schemaTypes/index.ts:2-8` — imports `:2-5`, `types: [...]` `:8` (4 entries today). Past bug: `docs/project-changelog.md:21`
- **Structure**: `src/sanity/structure.ts:1-7` — `StructureResolver` type `:1`, `S.list()` `:5`, `.title('Content')` `:6`, `.items(S.documentTypeListItems())` `:7` (7 LOC total). **No singleton precedent anywhere in `src/sanity/`**
- **Query precedent**: `src/sanity/queries/homepage.ts:4-11` (`*[_type=="homepage"][0]{…}` + `${imageFragment}`) · `src/sanity/fragments/image.ts:1` = `asset->{ _id, url, metadata { lqip, dimensions } }, alt`
- **Fetch precedent**: `src/sanity/lib/fetch-published.ts:30-45` (signature `:30-34`, `unstable_cache` `:39-43`, fail-open `:44`) · call site `src/app/[locale]/explore/destinations/page.tsx:36` `fetchPublished(ALL_TOUR_PRICING_QUERY, {}, { tags: ["sanity:pricing:all"] })` · alias `@/*` → `./src/*` (`tsconfig.json:25-28`)
- **Modal**: `src/components/layout/promo-modal.tsx` (43 LOC) — hooks `:14-20`, render `:22-41`, `<Image>` `:30-37` (src `:31` hardcoded, `priority` `:35`, `className` `:36`)
- **Mount**: `src/app/[locale]/layout.tsx` (22 LOC) — imports `:1-5`, async fn `:7-11`, `getMessages()` `:12`, `<PromoModal />` `:19`
- **Image host**: `next.config.ts:25` `{ protocol: "https", hostname: "cdn.sanity.io" }` already allow-listed → `asset.url` can go straight into `next/image`

## Overview
- **Priority**: P1 (blocking for Phase 02)
- **Current status**: Complete
- **Brief description**: Introduce the `siteConfiguration` singleton (schema + Studio registration + structure entry + GROQ query), fetch it on the server in the locale layout, and refactor `PromoModal` to accept the CMS asset as props with a `null` degradation path.

## Key Insights
- **Registry is the classic miss**: a schema file that is never imported into `schemaTypes/index.ts` is silently invisible in Studio (`changelog:21`). Count must go 4 → 5.
- **Singleton needs BOTH structure halves**: an explicit `S.document().documentId('siteConfiguration')` item **and** a `.filter()` removing it from `S.documentTypeListItems()`, otherwise the same document is listed twice.
- **Fetch belongs on the server**: `layout.tsx` is already `async`; `fetchPublished` is fail-open (`:44`) and cached 300 s (`:43`), so a missing/failed CMS read degrades to `null` props instead of a page error — no raw `client.fetch` anywhere.
- **`asset.url`, not `urlFor`**: `lib/image.ts:8` `urlFor` has zero consumers; every existing CMS image flows through `asset.url` from `imageFragment`. Follow the house convention.
- **`enableEntryPopup !== false` (not truthiness)**: an absent doc / absent field must behave as "show if an image exists" only when an image was actually provided — but since `imageSrc` is `null` when the doc is absent, both readings collapse to `null`. The `=== false` check keeps an explicitly-disabled doc disabled.
- **Hooks stay above the guard**: the `useState`/`useEffect` pair must run unconditionally (Rules of Hooks) → the `return null` sits **after** them, not before.

## Requirements
### Functional
- FR1: New global/singleton Studio schema `siteConfiguration` titled "Site Configuration" with `entryPopupImage` (image, hotspot, optional) and `enableEntryPopup` (boolean, `initialValue: true`, description says it gates the entry popup).
- FR2: Schema registered in `schemaTypes/index.ts`; surfaced as the **first** item in `structure.ts` under the existing "Content" list via fixed `documentId('siteConfiguration')`, and filtered out of the auto document-type list.
- FR3: New GROQ query `SITE_CONFIGURATION_QUERY` projecting `enableEntryPopup` + `entryPopupImage { ${imageFragment} }`, no params, no ternary.
- FR4: `layout.tsx` (server) fetches the config with `fetchPublished(…, { tags: ["sanity:siteconfig"] })` and passes `imageSrc`, `width`, `height`, `enableEntryPopup` to `<PromoModal />`.
- FR5: `PromoModal` renders the CMS `asset.url` via `next/image` with CMS `metadata.dimensions` (fallback 1200×800); returns `null` when `enableEntryPopup === false` OR `imageSrc` is falsy.
- FR6: Alt text still comes from i18n `promo.imageAlt`; `className` `h-auto w-full rounded-lg` unchanged; `priority` retained.
### Non-functional
- NF1: `npx tsc --noEmit` 0 errors; `npm run lint` exit 0; `sanity schemas validate` 0 errors.
- NF2: All new/edited code files < 200 LOC; kebab-case filenames; no new dependencies.
- NF3: Zero i18n key changes (parity untouched) and zero changes to `public/images/promo-modal.png` / `promo-video.tsx`.
- NF4: `PromoModal` stays `"use client"`; the fetch never runs in the browser.

## Architecture
- **System design**: Studio (singleton doc) → Content Lake → server layout read (tagged, cached 300 s, fail-open) → typed props → client dialog.
- **Component interactions**: `layout.tsx` (server) owns data; `promo-modal.tsx` (client) owns presentation + gating. The client component receives **no** Sanity client, so the "no client-side GROQ" rule is structurally enforced.
- **Data flow**:
  ```
  siteConfiguration doc ──publish──▶ /api/revalidate → revalidateTag("sanity")
        │                                                  │
        └─ layout.tsx ─fetchPublished(SITE_CONFIGURATION_QUERY, {},
             {tags:["sanity:siteconfig"]})  ◀── unstable_cache(300s, fail-open null)
                       │
                       ├ imageSrc = entryPopupImage?.asset?.url ?? null
                       ├ width/height = …metadata?.dimensions?.… ?? 1200/800
                       ▼
             <PromoModal imageSrc width height enableEntryPopup />
                       │
                       ├ enableEntryPopup === false || !imageSrc → return null
                       └ else <Dialog><Image src={imageSrc} …/></Dialog>
  ```

## Related Code Files
**Modify**
- `src/sanity/schemaTypes/index.ts` — add import + array entry (4 → 5 types)
- `src/sanity/structure.ts` — singleton item first + filter (7 → ~11 LOC)
- `src/app/[locale]/layout.tsx` — import query/fetch, `await fetchPublished`, derive props, pass to `<PromoModal />`
- `src/components/layout/promo-modal.tsx` — props type, `null` guard, dynamic `src`/`width`/`height`
**Create**
- `src/sanity/schemaTypes/site-configuration.ts`
- `src/sanity/queries/site-configuration.ts`
**Delete**: none.
**NEVER touch**: `public/images/promo-modal.png`, `src/components/homepage/promo-video.tsx`, `src/messages/*`, any test, `next.config.ts`.

## Implementation Steps
1. **Create `src/sanity/schemaTypes/site-configuration.ts`** mirroring `homepage.ts`/`destination.ts` style:
   ```ts
   import { defineType, defineField } from "sanity";

   export default defineType({
     name: "siteConfiguration",
     title: "Site Configuration",
     type: "document",
     fields: [
       defineField({
         name: "enableEntryPopup",
         title: "Enable Entry Popup",
         type: "boolean",
         description:
           "Turn off to hide the entry promo modal between campaigns. The modal also stays hidden until Promo Modal Asset is uploaded.",
         initialValue: true,
       }),
       defineField({
         name: "entryPopupImage",
         title: "Promo Modal Asset",
         type: "image",
         options: { hotspot: true },
       }),
     ],
   });
   ```
2. **Register it** in `src/sanity/schemaTypes/index.ts`: `import siteConfiguration from './site-configuration'` (after `post`, keeping alphabetical-ish grouping with the existing single-quote imports) and append to the array at `:8` → `types: [destination, homepage, post, tourPricing, siteConfiguration]`.
3. **Rewrite `src/sanity/structure.ts`** (keep the cheat-sheet comment `:3`):
   ```ts
   import type {StructureResolver} from 'sanity/structure'

   // https://www.sanity.io/docs/structure-builder-cheat-sheet
   export const structure: StructureResolver = (S) =>
     S.list()
       .title('Content')
       .items([
         S.document()
           .schemaType('siteConfiguration')
           .documentId('siteConfiguration'),
         ...S.documentTypeListItems().filter(
           (item) => item.getId() !== 'siteConfiguration'
         ),
       ])
   ```
   Title `Content` and the auto list behavior for every other type stay identical.
4. **Create `src/sanity/queries/site-configuration.ts`**:
   ```ts
   import { defineQuery } from "next-sanity";
   import { imageFragment } from "../fragments/image";

   export const SITE_CONFIGURATION_QUERY = defineQuery(`
     *[_type == "siteConfiguration"][0]{
       enableEntryPopup,
       entryPopupImage { ${imageFragment} }
     }
   `);
   ```
   No `$` params (so no call-site can break), no ternary (GROQ parse guard precedent).
5. **Update `src/app/[locale]/layout.tsx`** — after the existing imports `:1-5`, add:
   ```ts
   import { SITE_CONFIGURATION_QUERY } from "@/sanity/queries/site-configuration";
   import { fetchPublished } from "@/sanity/lib/fetch-published";
   ```
   then inside the async component (after `getMessages()` `:12`):
   ```ts
   const siteConfig = await fetchPublished(SITE_CONFIGURATION_QUERY, {}, {
     tags: ["sanity:siteconfig"],
   });
   const popupImage = siteConfig?.entryPopupImage;
   const popupSrc = popupImage?.asset?.url ?? null;
   const popupWidth = popupImage?.asset?.metadata?.dimensions?.width ?? 1200;
   const popupHeight = popupImage?.asset?.metadata?.dimensions?.height ?? 800;
   ```
   and replace `<PromoModal />` at `:19` with:
   ```tsx
   <PromoModal
     imageSrc={popupSrc}
     width={popupWidth}
     height={popupHeight}
     enableEntryPopup={siteConfig?.enableEntryPopup}
   />
   ```
   `<PromoModal />` stays the **last child** (contract preserved).
6. **Refactor `src/components/layout/promo-modal.tsx`**: keep lines 1-11 verbatim; add
   ```tsx
   type PromoModalProps = {
     imageSrc?: string | null
     width?: number
     height?: number
     enableEntryPopup?: boolean
   }
   ```
   destructure with defaults `width = 1200`, `height = 800`; keep `:14-20` (hooks) untouched; insert immediately before `return`:
   ```tsx
   // Graceful degradation (AC3): disabled or no CMS asset → render nothing.
   if (enableEntryPopup === false || !imageSrc) return null
   ```
   and change the `<Image>` `:30-37` to `src={imageSrc}`, `width={width}`, `height={height}` (alt/`priority`/`className` unchanged). Expected size ≈ 55 LOC (< 200).
7. **Compile/type check (mandatory)**: `npx tsc --noEmit` → 0 errors.
8. **Lint**: `npm run lint` → exit 0.
9. **Schema validation**: `node_modules/.bin/sanity schemas validate` → 0 errors (source `.env.local` into the shell if `env.ts` asserts at import).

## Todo List
- [ ] Create `src/sanity/schemaTypes/site-configuration.ts`
- [ ] Register in `src/sanity/schemaTypes/index.ts` (4 → 5 types)
- [ ] Singleton + filter in `src/sanity/structure.ts`
- [ ] Create `src/sanity/queries/site-configuration.ts`
- [ ] Server fetch + props in `src/app/[locale]/layout.tsx`
- [ ] Props + `null` guard + dynamic `<Image>` in `src/components/layout/promo-modal.tsx`
- [ ] `npx tsc --noEmit` = 0 errors
- [ ] `npm run lint` = exit 0
- [ ] `sanity schemas validate` = 0 errors
- [ ] Eyeball Studio: single "Site Configuration" entry, first under Content, listed once

## Success Criteria
- `npx tsc --noEmit` exits 0; `npm run lint` exits 0; `sanity schemas validate` reports 0 errors / 0 warnings.
- `schemaTypes/index.ts` exports 5 types including `siteConfiguration`.
- Studio "Content" list shows **Site Configuration once**, first, and no duplicate auto-list entry.
- With no `siteConfiguration` doc published: page loads with **zero** `[data-slot="promo-modal"]` nodes and no console/page errors (graceful degradation).
- With a doc published + image uploaded + toggle on: modal opens post-hydration, `img[src^="https://cdn.sanity.io/"]`, intrinsic `width`/`height` = CMS dimensions, alt = i18n `promo.imageAlt`.
- No diff in `src/messages/*`, `public/images/*`, `promo-video.tsx`, any test file.
**Validation methods**: `tsc --noEmit`, `npm run lint`, `sanity schemas validate`, manual Studio browse, manual `/en` + `/vi` eyeball.

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| Forgetting `index.ts` registration | Schema invisible in Studio | Step 2 + eyeball "5 types" + `sanity schemas validate` |
| Duplicate document in structure list | Confusing Studio nav | `.filter(item => item.getId() !== 'siteConfiguration')` in step 3; eyeball once-only |
| `S.documentTypeListItems()` typing rejects `.filter` | `tsc` error | Run `npx tsc --noEmit` (step 7) before moving on; fallback `S.documentTypeListItems().filter((i) => i.getId() !== 'siteConfiguration')` typed via `ListItemComponent` |
| Layout fetch fails at build/runtime | Page error | Already handled: `fetchPublished` `.catch(()=>null)` `:44` → `null` props → `null` render |
| CMS metadata missing (image added without asset) | Bad intrinsic size | `?? 1200` / `?? 800` fallbacks; `!imageSrc` guard returns `null` first |
| Aspect distortion | Visual bug | width/height both come from the same `metadata.dimensions` pair; `className` unchanged |
| Modal gone from prod immediately after merge | Marketing surprise | EXPECTED (AC3) — Phase 02 changelog calls it out explicitly; Studio upload re-enables |

## Security Considerations
- **Auth/authorization**: read-only published-perspective fetch (`perspective: "published"`, `stega: false` — `fetch-published.ts:37`); no tokens, no draft content, no Studio credentials on the frontend.
- **Data protection**: only an image URL + a boolean are transferred; no PII, no secrets, no new env vars.
- **Injection**: the CMS URL flows into `next/image` `src`, which validates against the `images.remotePatterns` allow-list (`next.config.ts:25`) — a non-`cdn.sanity.io` URL cannot reach the optimizer.
- **Supply chain**: no new dependencies.

## Next Steps
- **Dependencies**: none (Phase 01 is self-contained and startable immediately).
- **Follow-up**: Phase 02 (`phase-02-tests-pipeline-changelog.md`) — helper timeout, unit query contract test, browser r-test, full pipeline, changelog entry, status flips, code review.
- **Operational hand-off**: marketing must create/publish the `siteConfiguration` doc and upload the Promo Modal Asset for the popup to appear.
