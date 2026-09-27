---
phase: 4
title: "Home Page Implementation"
status: pending
priority: P1
effort: "6h"
dependencies: [2, 3]
---

# Phase 4: Home Page Implementation

## Overview
Build the homepage with hero section, featured destinations, experience categories, and footer — pulling data from Sanity.

## Requirements
- Functional: Hero carousel, destination cards, experience tiles, newsletter CTA, footer
- Non-functional: Mobile-first responsive, lazy-loaded images, SEO-optimized

## Architecture
```
src/components/
├── layout/
│   ├── header.tsx
│   └── footer.tsx
├── homepage/
│   ├── hero-section.tsx
│   ├── featured-destinations.tsx
│   ├── experience-categories.tsx
│   ├── quick-access-icons.tsx
│   └── newsletter-cta.tsx
└── ui/               # shadcn components
```

## Related Code Files
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/footer.tsx`
- Create: `src/components/homepage/hero-section.tsx`
- Create: `src/components/homepage/featured-destinations.tsx`
- Create: `src/components/homepage/experience-categories.tsx`
- Create: `src/components/homepage/quick-access-icons.tsx`
- Create: `src/components/homepage/newsletter-cta.tsx`
- Modify: `src/app/[locale]/page.tsx` (compose homepage)

## Implementation Steps
1. Create GROQ queries for homepage content (hero, destinations, experiences)
2. Build Header component (logo, nav, language switcher, CTA)
3. Build Footer component (sitemap links, social icons, legal)
4. Build HeroSection (full-width image, title, search bar)
5. Build FeaturedDestinations (card grid with Sanity images)
6. Build ExperienceCategories (visual tiles: Nature, Culture, Food, etc.)
7. Build QuickAccessIcons (Visa, Weather, Deals, Map links)
8. Build NewsletterCTA (signup form)
9. Compose all sections in page.tsx
10. Ensure mobile responsiveness

## Success Criteria
- [ ] Homepage renders with all sections
- [ ] Sanity content displays correctly
- [ ] Images lazy-load and are responsive
- [ ] Mobile layout works (tested at 375px, 768px, 1280px)
- [ ] Header nav + language switcher functional
- [ ] Footer links render correctly

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing Sanity content | Low | Create seed data in Studio |
| Image performance | Medium | Use Sanity image transforms (width, format) |
