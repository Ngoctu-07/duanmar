# Phase 01 — Schema Fields + Query Projection + Unit Asserts

**Status**: Complete · **Priority**: High

## Steps
1. `src/sanity/schemaTypes/homepage.ts` — after `teamGallery`, add (per locale, one block array each):
   ```ts
   defineField({
     name: "narrativeStory_en",
     title: "About Us Narrative (EN)",
     type: "array",
     description: "Portable Text — multi-paragraph company story/mission/brand history (EN). Empty → falls back to the VI block, else the section renders no paragraph.",
     of: [{ type: "block" }],
   }),
   // same for narrativeStory_vi (title VI, "…(VI)")
   ```
   Block config default is enough (strong/em via default marks + bullet/number lists are built-in on `type: "block"`; no custom styles per D4/YAGNI).
2. `src/sanity/queries/homepage.ts` — project raw arrays in `HOMEPAGE_QUERY`:
   `narrativeStory_en,` `narrativeStory_vi,` (no projection = full PT payload; groq-js parse check covers).
3. Unit `homepage-about-video-query.test.mts` — +2 checks: query contains both fields; schema source contains both names + `of: [{ type: "block" }]`.

## Verify
- `npx sanity schemas validate` → 0; Studio Homepage shows two PT editors (multi-paragraph + bold + list toolbar).
