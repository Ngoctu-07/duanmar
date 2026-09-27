---
title: "Vietnam Tourism Website — Foundation"
description: "Minimal foundation: Next.js project setup, Sanity CMS, i18n (EN/VI), Home page"
status: completed
priority: P1
effort: 3d
tags: [frontend, nextjs, sanity, i18n]
blockedBy: []
blocks: []
created: 2025-09-25
---

# Vietnam Tourism Website — Foundation

## Overview
Greenfield Next.js 15 project with Sanity CMS, Tailwind CSS v4 + shadcn/ui, next-intl for i18n (EN/VI). Scope reduced to: project scaffold, Sanity client config, Home page with multilingual support.

## Context Links
- **Framework Doc**: `./vietnam-tourism-website-framework.md`
- **Research Reports**: `./plans/reports/`

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | Project Setup & Design System | completed | 4h |
| 2 | Sanity CMS Integration | completed | 4h |
| 3 | i18n Setup (EN/VI) | completed | 3h |
| 4 | Home Page Implementation | completed | 6h |
| 5 | Build & Deploy Prep | completed | 2h |

**Total**: ~19h (~2.5 days)

## Key Decisions
- **Next.js 15** App Router (latest stable)
- **Tailwind CSS v4** (CSS-first config, faster builds)
- **shadcn/ui** (New York style, neutral colors, OKLCH)
- **next-intl** v4.14 (purpose-built for App Router)
- **Sanity v5** + next-sanity v13 (stable, Node 20 compatible)
- **Inter font** with Vietnamese subset

## TODO Checklist
- [x] Phase 1: Project setup
- [x] Phase 2: Sanity CMS
- [x] Phase 3: i18n
- [x] Phase 4: Home page
- [x] Phase 5: Build prep
- [ ] Code review passed
