---
title: "Sanity Project Setup & Seed Data"
description: "Create Sanity project, configure Studio, seed homepage and destinations"
status: pending
priority: P1
effort: "2h"
tags: [sanity, cms, seed-data]
blockedBy: []
blocks: []
created: 2025-09-25
---

# Sanity Project Setup & Seed Data

## Overview
Create a Sanity project on sanity.io, configure Sanity Studio locally, seed initial homepage and destination data.

## Prerequisites
- Sanity account (free tier is fine)
- Project created at sanity.io/manage
- `.env.local` updated with real projectId/dataset

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | Create Sanity Project | pending | 15m |
| 2 | Setup Sanity Studio | pending | 30m |
| 3 | Seed Data | pending | 45m |
| 4 | Verify Integration | pending | 30m |

**Total**: ~2h

## Phase Details

### Phase 1: Create Sanity Project
1. Go to sanity.io/manage
2. Create new project: "vietnam-tourism"
3. Dataset: "production"
4. Copy project ID and API token
5. Update `.env.local`:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=<your-project-id>
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_API_READ_TOKEN=<your-viewer-token>
   ```
6. Add CORS: `http://localhost:3000` with credentials

### Phase 2: Setup Sanity Studio
1. Create `sanity/sanity.config.ts` with structureTool + presentationTool
2. Create `sanity/src/presentation/resolve.ts` for document-to-URL mapping
3. Run `npx sanity@latest init` in project root (or manual setup)
4. Verify Studio runs at `localhost:3333`

### Phase 3: Seed Data
1. Create homepage document in Studio
2. Create 6 destinations (Hanoi, Ha Long Bay, Da Nang, Hoi An, Ho Chi Minh City, Phu Quoc)
3. Set featured: true for 3-4 destinations
4. Upload hero image for homepage

### Phase 4: Verify Integration
1. Start dev server: `npm run dev`
2. Check homepage displays Sanity content
3. Check featured destinations render
4. Test visual editing in Studio
5. Test draft mode toggle

## Success Criteria
- [ ] Sanity project created and accessible
- [ ] Studio runs at localhost:3333
- [ ] Homepage document created with hero image
- [ ] 6 destinations seeded
- [ ] Frontend displays Sanity content
- [ ] Visual editing works

## Unresolved Questions
- Do you already have a Sanity account, or need to create one?
- Do you have images ready for the hero section and destinations?
