---
phase: 2
title: "Sanity CMS Integration"
status: pending
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Sanity CMS Integration

## Overview
Setup Sanity Studio, configure client for App Router, define initial schemas (homepage, destinations), enable visual editing.

## Requirements
- Functional: Sanity Studio running, client configured, basic schemas defined
- Non-functional: Visual editing working, Live Content API enabled

## Architecture
```
src/sanity/
├── lib/
│   ├── client.ts        # createClient config
│   └── live.ts          # defineLive setup
├── schemaTypes/
│   ├── index.ts
│   ├── homepage.ts
│   └── destination.ts
└── fragments/
    └── image.ts

sanity/
├── sanity.config.ts      # Studio config
└── src/
    └── presentation/
        └── resolve.ts    # Document-to-URL resolver
```

## Related Code Files
- Create: `src/sanity/lib/client.ts`
- Create: `src/sanity/lib/live.ts`
- Create: `src/sanity/schemaTypes/homepage.ts`
- Create: `src/sanity/schemaTypes/destination.ts`
- Create: `sanity/sanity.config.ts`
- Modify: `src/app/layout.tsx` (add SanityLive, VisualEditing)

## Implementation Steps
1. Install packages: `npm install next-sanity sanity @sanity/image-url sanity-plugin-internationalized-array`
2. Create Sanity project (free tier) via `npx sanity@latest init`
3. Configure `sanity.config.ts` with structureTool + presentationTool
4. Create client.ts with projectId, dataset, apiVersion, stega config
5. Create live.ts with defineLive + sanityFetch
6. Define homepage schema (hero, featured destinations, experience categories)
7. Define destination schema (name, slug, region, description, image)
8. Setup draft mode enable route at `app/api/draft-mode/enable/route.ts`
9. Add CORS for localhost:3000
10. Test visual editing in Studio

## Success Criteria
- [ ] Sanity Studio runs at localhost:3333
- [ ] Client connects to Content Lake
- [ ] Homepage schema creatable in Studio
- [ ] Destination schema creatable in Studio
- [ ] Visual editing overlay shows on frontend
- [ ] Draft mode toggle works

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Sanity v6 requires Node 22+ | High | Use Sanity v5 for Node 20 compat |
| Free tier doc limit (10K) | Low | Sufficient for MVP |
| CORS misconfiguration | Medium | Follow setup guide exactly |
