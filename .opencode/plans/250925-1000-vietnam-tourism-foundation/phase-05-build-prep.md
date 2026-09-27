---
phase: 5
title: "Build & Deploy Prep"
status: pending
priority: P2
effort: "2h"
dependencies: [4]
---

# Phase 5: Build & Deploy Prep

## Overview
Verify production build, setup environment variables, configure deployment target.

## Requirements
- Functional: Production build succeeds, no errors
- Non-functional: Core Web Vitals baseline, security headers

## Implementation Steps
1. Run `npm run build` — fix any errors
2. Run `npm run start` — verify production mode works
3. Setup `.env.example` with all required env vars
4. Add security headers in `next.config.ts` (CSP, X-Frame-Options)
5. Configure image optimization (WebP/AVIF)
6. Add basic SEO metadata (sitemap, robots.txt)
7. Test Lighthouse score (target: 90+ performance)

## Success Criteria
- [ ] `npm run build` succeeds with 0 errors
- [ ] Production mode works locally
- [ ] `.env.example` documents all env vars
- [ ] Security headers present
- [ ] Lighthouse performance score > 90

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Build errors from missing types | Low | Fix incrementally |
| Sanity env vars missing in prod | Medium | Document in .env.example |
