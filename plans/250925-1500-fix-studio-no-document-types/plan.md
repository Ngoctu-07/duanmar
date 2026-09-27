---
title: "[Bug Fix] Studio: No document types"
description: "schemaTypes/index.ts register types rỗng — destination/homepage không được import"
status: completed
priority: P1
effort: "15m"
tags: [bugfix, sanity, schema]
created: 2025-09-25
---

# [Bug Fix] Studio: No document types

## Root Cause
- `src/sanity/schemaTypes/index.ts`: `export const schema = { types: [] }` — rỗng
- `destination.ts` + `homepage.ts` tồn tại (default export `defineType`) nhưng KHÔNG được import/register
- Frontend chỉ cần 2 type này: `homepage`, `destination` (`src/sanity/queries/homepage.ts`)

## Fix
1 file: `src/sanity/schemaTypes/index.ts`
```ts
import destination from './destination'
import homepage from './homepage'
export const schema = { types: [destination, homepage] }
```

## Verification
- [ ] Playwright: Studio `localhost:3333` hiển thị "Destination" + "Homepage" trong Content list, 0 console/pageerror
- [ ] `npm run build` pass (frontend queries không đổi)
- [ ] Dev server `/en` vẫn 200
