---
phase: 1
title: "Project Setup & Design System"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Project Setup & Design System

## Overview
Initialize Next.js 15 project with TypeScript, Tailwind CSS v4, shadcn/ui, and project structure.

## Requirements
- Functional: Working Next.js app with dev server, responsive layout
- Non-functional: TypeScript strict, ESLint, Core Web Vitals baseline

## Architecture
```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── ui/          # shadcn components
├── lib/
│   └── utils.ts     # cn() helper
└── sanity/
    └── lib/
        └── client.ts
```

## Related Code Files
- Create: `package.json`, `next.config.ts`, `tsconfig.json`
- Create: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`
- Create: `src/components/ui/*` (shadcn components)

## Implementation Steps
1. Run `npx create-next-app@latest` with TypeScript + Tailwind + App Router + src dir
2. Init shadcn/ui: `npx shadcn@latest init` (New York, neutral, CSS variables)
3. Add components: `npx shadcn@latest add button card navigation-menu`
4. Configure Inter font with Vietnamese subset in layout
5. Setup basic responsive layout structure
6. Create `.env.local` with placeholder Sanity env vars

## Success Criteria
- [ ] `npm run dev` starts without errors
- [ ] Tailwind CSS v4 working (test utility classes)
- [ ] shadcn/ui components render
- [ ] Inter font loads with Vietnamese characters
- [ ] Responsive layout (mobile/desktop)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Tailwind v4 breaking changes | Medium | Follow official migration guide |
| shadcn/ui v4 incompatibility | Low | Use stable CLI version |
