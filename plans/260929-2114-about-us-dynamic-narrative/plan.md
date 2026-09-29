# Make "About Us" Narrative Description Dynamic via Studio CMS

**Date**: 2026-09-29 · **Type**: Feature (CMS Portable Text + frontend binding) · **Status**: Complete · **Progress**: 100%

## Requirements
1. Studio: add rich-text field(s) for the About Us narrative — multi-paragraph company story/mission/brand history (**Portable Text** chosen over plain textarea: requirement 3 needs bold + lists, which a text area cannot format).
2. Frontend: **remove hardcoded AI placeholder copy** (`home.aboutSection.body` in en/vi messages) and bind the container to the CMS payload.
3. Typography: paragraphs, line breaks, bold, lists with `leading-relaxed` + vertical spacing.

## Research findings
- **No `aboutUs` singleton exists.** About Us content today lives on the **`homepage` singleton** (`src/sanity/schemaTypes/homepage.ts` — already owns `aboutUsVideo*` + `teamGallery`). The narrative paragraph is hardcoded i18n: `about-us-section.tsx:30` → `<p>{t("aboutSection.body")}</p>` (en: "DuanMar is your trusted gateway…"). No test asserts that copy (grep clean) — safe to remove.
- **Portable Text infra**: app has NO PT renderer yet; posts use array-of-text blocks (paragraphs only — no bold/lists). **`next-sanity@11` re-exports `@portabletext/react@6`** (`export * from "@portabletext/react"` in dist .js + .d.ts, declared dep `^6.0.0`) → `import { PortableText } from "next-sanity"` is fully typed, **zero new dependencies**.
- Blast radius: `j-about-contact` J2 (section scope: featured/CTA/video only — no body assert), `n-lightbox` (CTA) — both safe. Unit file `homepage-about-video-query.test.mts` extends naturally.

## Design decisions (defaults — approval via questions)
- **D1 (doc home)**: fields on the **`homepage` singleton** (where About Us video/gallery already live; no separate aboutUs doc to open). *Alt*: create new `aboutUs` singleton — splits About content across 2 docs.
- **D2 (scope)**: homepage About band narrative only (`home.aboutSection.body`). *Alt*: also convert `/about` page 4 sections (mission/vision/org/values) — larger surface, ask.
- **D3 (bilingual)**: `narrativeStory_en` + `narrativeStory_vi` (array-of-block, per `post.content_en/_vi` precedent) — preserves today's bilingual copy. Fallback chain: locale field → other-locale field → **render nothing** (no i18n placeholder — requirement 2 says remove it).
- **D4 (field shape)**: `type: "array", of: [{ type: "block" }]` with marks `strong`/`em`, lists `bullet`/`number`, styles `normal` (+`h2`/`h3` omitted — YAGNI). Line breaks = separate blocks (PT standard).

## Phases
1. [phase-01](phase-01-schema-query.md) — 2 PT fields on homepage schema + `HOMEPAGE_QUERY` projections + unit asserts.
2. [phase-02](phase-02-frontend-binding.md) — `about-narrative.tsx` renderer (PortableText + components: p `leading-relaxed`, lists, strong) + replace hardcoded `<p>` + delete `aboutSection.body` key en+vi.
3. [phase-03](phase-03-tests-gates-docs.md) — new `v-about-narrative.mjs` (data-driven: empty→absent+placeholder-gone; filled→block/paragraph/mark parity), targeted `j`/`n`, full gates, screenshots, docs.

## Gates
lint 0 · unit **18/18** · build 0 · schema 0 · browser **20/21** (new v-file; sole fail = revalidate env).

## Risks / Success
- Content empty at ship (Studio fill by editor; no write token) → graceful absent narrative + test asserts removal of placeholder (current state provable now).
- Success: with CMS blocks: paragraphs/bold/lists render styled in vi+en fallback chain; placeholder copy gone everywhere; all gates green.
