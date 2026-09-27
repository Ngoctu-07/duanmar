---
phase: 3
title: "i18n Setup (EN/VI)"
status: pending
priority: P1
effort: "3h"
dependencies: [1, 2]
---

# Phase 3: i18n Setup (EN/VI)

## Overview
Configure next-intl for English/Vietnamese locale routing, SEO metadata, and Sanity i18n integration.

## Requirements
- Functional: Locale-based routing (/en/*, /vi/*), language switcher, SEO hreflang
- Non-functional: Auto-detect browser locale, fallback to EN, Vietnamese UTF-8 support

## Architecture
```
src/
├── i18n/
│   ├── routing.ts       # defineRouting config
│   ├── request.ts       # getRequestConfig
│   └── navigation.ts    # typed navigation helpers
├── messages/
│   ├── en.json
│   └── vi.json
└── middleware.ts         # next-intl middleware
```

## Related Code Files
- Create: `src/i18n/routing.ts`
- Create: `src/i18n/request.ts`
- Create: `src/i18n/navigation.ts`
- Create: `src/messages/en.json`
- Create: `src/messages/vi.json`
- Create: `src/middleware.ts`
- Modify: `next.config.ts` (add next-intl plugin)
- Modify: `src/app/[locale]/layout.tsx` (NextIntlClientProvider)

## Implementation Steps
1. Install: `npm install next-intl`
2. Create `src/i18n/routing.ts` with defineRouting (locales: en, vi)
3. Create `src/middleware.ts` with createMiddleware from next-intl
4. Create `src/i18n/request.ts` with getRequestConfig (load messages)
5. Create `src/messages/en.json` and `src/messages/vi.json` with basic nav/homepage translations
6. Update `next.config.ts` with createNextIntlPlugin
7. Wrap app in NextIntlClientProvider
8. Implement language switcher component
9. Add hreflang metadata in generateMetadata

## Success Criteria
- [ ] /en/ and /vi/ routes work
- [ ] Language switcher toggles locale
- [ ] Page content changes by locale
- [ ] hreflang meta tags present
- [ ] Vietnamese text renders correctly (no broken diacritics)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Vietnamese diacritics rendering | Medium | Test with Inter font Vietnamese subset |
| next-intl v4 breaking changes | Low | Follow official docs |
