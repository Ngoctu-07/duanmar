# Phase 02 — Frontend Binding + Placeholder Removal

**Status**: Complete · **Depends on**: Phase 1 · **Priority**: High

## New `src/components/homepage/about-narrative.tsx` (server component)
```tsx
import { PortableText } from "next-sanity";
// props: storyEn?: unknown[] | null; storyVi?: unknown[] | null; locale: "en" | "vi"
const blocks = (locale === "vi" ? storyVi : storyEn) ?? (locale === "vi" ? storyEn : storyVi) ?? [];
if (blocks.length === 0) return null;            // requirement 2: placeholder fully removed, no fallback copy
<div data-testid="about-narrative" className="mt-4 space-y-4 text-muted-foreground">
  <PortableText value={blocks} components={TYPO} />
</div>
```
`TYPO` components:
- `block: { p: <p className="leading-relaxed" /> }` (default h-less blocks → p)
- `list: { bullet: <ul className="list-disc space-y-1 pl-5" />, number: <ol …/> }` (+ `li` default)
- `marks: { strong: <strong className="font-semibold" />, em: <em /> }`

## `about-us-section.tsx`
- Props gain `storyEn`, `storyVi` (page passes `homepageData?.narrativeStory_en/_vi ?? null`).
- Replace line 30 `<p>{t("aboutSection.body")}</p>` → `<AboutNarrative … locale={…}/>`; `locale` from `getLocale()` (server component already async with getTranslations — swap to `Promise.all` or add getLocale).

## Placeholder removal
- Delete `home.aboutSection.body` from `src/messages/en.json` + `vi.json` (only consumer was this `<p>`; parity intact).

## Verify
- `/vi` + `/en`: no "trusted gateway…" text anywhere; narrative renders only when CMS filled.
- `j-about-contact` + `n-lightbox-contact` still green (untouched anchors).
