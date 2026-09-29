# Research Summary — Global Theme Redesign & Brand Migration

**Date**: 2026-09-27 · **Verified**: all refs spot-checked against working tree
**Scope**: theme tokens, brand strings, fonts. Work context `D:\tour`.

## 1. Theme / Color Findings

### 1.1 Token architecture (100% token-driven — no tsx edits needed for color)
| What | Where | Notes |
|---|---|---|
| `@theme inline` maps tokens → Tailwind classes | `src/app/globals.css:7-48` | `--color-*`, `--font-*`, `--radius-*` |
| `:root` palette | `src/app/globals.css:50-83` | shadcn oklch grayscale defaults |
| Dead `.dark` block | `src/app/globals.css:85-117` | no theme toggle; `.dark` never applied anywhere |
| Base layer (border/focus/body) | `src/app/globals.css:119-129` | `border-border outline-ring/50`, `bg-background text-foreground`, `html { font-sans }` |
| `components.json` shadcn `baseColor` | `components.json` | affects future `shadcn add` only |

- **~446 token-class usages across 64/75 tsx files** change with ZERO tsx edits:
  `text-muted*` 149 · `text-primary` 42 · `bg-primary` 24 · `text-destructive` 20 · `border-destructive` 9 · `ring-destructive` 10 · `hover:bg-primary` 7 · `bg-destructive` 3.
- `--primary` currently `oklch(0.205 0 0)` (near-black); `--destructive` currently `oklch(0.577 0.245 27.325)` (already red).

### 1.2 Hardcoded colors (only 2 in whole `src/`)
| File:line | Value | Recommendation |
|---|---|---|
| `src/components/booking/booking-payment-section.tsx:161` | `text-green-700` | keep — payment success semantic (distinct from error crimson) |
| `src/components/ui/sheet.tsx:31` | `bg-black/10` overlay | keep — neutral scrim, mode-agnostic |

### 1.3 Gradient + unthemed surfaces
- 1 gradient: `src/components/homepage/hero-section.tsx:22` — `from-primary/10, via-background, to-secondary/10` → auto-repaints; verify visually.
- Leaflet map `src/components/explore/destinations-map.tsx` — unthemed, out of scope.
- `dark:` variant only in 4 ui primitives: `button.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`.

### 1.4 Decorative vs semantic `--destructive` split (user decision)
Migrate **decorative/accent** uses → `--primary`; keep `--destructive` for errors only.
Decorative candidates (verified):
| File:line | Use |
|---|---|
| `booking-contact-section.tsx:27`, `booking-date-section.tsx:38`, `booking-difficulty-section.tsx:32`, `booking-payment-section.tsx:99`, `booking-pricing-section.tsx:38`, `booking-summary.tsx:82`, `my-trips-detail.tsx:76`, `price-block.tsx:28` | uppercase eyebrow labels (8×) |
| `booking-payment-section.tsx:154`, `booking-pricing-section.tsx:72`, `price-block.tsx:73`, `price-range.tsx:20` | price figures (4×) |
| `booking-summary.tsx:79` | `CheckCircle2` icon |
| `travel-date-field.tsx:27,28` | `--rdp-accent-color` / `--rdp-accent-background-color` (comment: "app's accent") |
| `travel-date-field.tsx:60` (soldOut), `:167` (outline), `:169` (selected day bg), `:171` (today) | calendar styling |

Keep on `--destructive` (semantic errors): `booking-field.tsx:22` (`role="alert"`), all `aria-invalid:…-destructive` in ui primitives, form validation states.

### 1.5 Known bug to bundle with Phase 1
- `--destructive-foreground` is **never defined** in `:root`, `.dark`, or `@theme inline` → `text-destructive-foreground` is a no-op.
- Single consumer: `src/components/booking/travel-date-field.tsx:169` (`bg-destructive … text-destructive-foreground`) → white text never applies → contrast failure.
- Fix regardless: define token in `:root` + `.dark` + add `--color-destructive-foreground: var(--destructive-foreground);` to `@theme inline`. (Line 169 additionally migrates to `bg-primary text-primary-foreground`.)

### 1.6 Unused-but-should-define tokens
`--chart-1..5`, `--sidebar-*` → 0 consumers today but mapped in `@theme` (lines 12-24); keep defined and retune to brand ramp.
`--ring`: global focus outline `globals.css:121` + 8 usages (`ring-ring/50`, `border-ring`).

### 1.7 Contrast math (vs `#FFFFFF`)
| Pair | ≈ Ratio | Pass AA (4.5:1)? |
|---|---|---|
| `#B91C1C` text on white | **6.5:1** | yes |
| white text on `#B91C1C` | **6.5:1** | yes |
| `#18181B` on white | **17.7:1** | yes |
| `#DC2626` (destructive) on white | **4.8:1** | yes (margin — verify) |
| white on `#DC2626` | **4.8:1** | yes (margin — verify) |
| muted-foreground target `oklch(0.52 0.015 60)` | ~5.5:1 | yes |

## 2. Brand Findings

### 2.1 The 31 category-(a) brand/title/logo spots
**Global (4)**: `src/app/layout.tsx:11` · `src/components/layout/header.tsx:27` · `src/components/layout/footer.tsx:37` · `src/components/layout/footer.tsx:93`

**27 per-page `metadata.title` `"… | Vietnam Tourism"`**:
| # | File:line | # | File:line |
|---|---|---|---|
| 1 | `about/page.tsx:5` | 15 | `explore/itineraries/[slug]/page.tsx:41` |
| 2 | `about/careers/page.tsx:6` | 16 | `explore/map/page.tsx:12` |
| 3 | `about/contact/page.tsx:6` | 17 | `explore/things-to-do/page.tsx:6` |
| 4 | `about/press/page.tsx:6` | 18 | `explore/things-to-do/[category]/page.tsx:29` |
| 5 | `accessibility/page.tsx:6` | 19 | `news/page.tsx:7` |
| 6 | `blog/page.tsx:7` | 20 | `news/[...slug]/page.tsx:24` |
| 7 | `business-mice/page.tsx:7` | 21 | `plan-your-trip/page.tsx:6` |
| 8 | `culture/page.tsx:6` | 22 | `plan-your-trip/[guide]/page.tsx:34` |
| 9 | `deals/page.tsx:5` | 23 | `privacy/page.tsx:6` |
| 10 | `explore/destinations/page.tsx:16` | 24 | `search/page.tsx:12` |
| 11 | `explore/destinations/[slug]/page.tsx:39` | 25 | `sitemap/page.tsx:6` |
| 12 | `explore/events/page.tsx:7` | 26 | `support/page.tsx:7` |
| 13 | `explore/festivals/page.tsx:7` | 27 | `trade/page.tsx:7` |
| 14 | `explore/itineraries/page.tsx:10` | | |

(All under `src/app/[locale]/`.) Total 4 + 27 = **31** ✓

### 2.2 MIXED files — hand edits required (5)
| File:line | Current | Scope decision |
|---|---|---|
| `about/contact/page.tsx:6` | `title: "Contact Us \| Vietnam Tourism"` | IN — title |
| `about/contact/page.tsx:7` | `description: "Reach out to the Vietnam Tourism Organization"` | **OUT** — org name, flag |
| `privacy/page.tsx:6` | title | IN |
| `privacy/page.tsx:8` | `"How the Vietnam Tourism website handles your data…"` | IN — refers to site |
| `sitemap/page.tsx:6` | title | IN |
| `sitemap/page.tsx:7` | `"Every section of Vietnam Tourism in one place"` | IN — refers to site |
| `src/messages/en.json:1162` | `"subtitle": "Every section of Vietnam Tourism in one place"` | IN |
| `src/messages/vi.json:1162` | `"subtitle": "Mọi phần của Vietnam Tourism tại một nơi"` | IN |

In-scope edit sites total: 31 + 4 prose = **35**.

### 2.3 OUT of scope — do not touch
| File:line | Content |
|---|---|
| `src/app/sitemap.ts:5` | `baseUrl = "https://vietnam-tourism.com"` |
| `src/app/robots.ts:12` | sitemap URL `https://vietnam-tourism.com/sitemap.xml` |
| `package.json:2` | `"name": "vietnam-tourism"` |
| `src/messages/en.json:417` | "The Vietnam Tourism **Organization** is the national body…" |
| `src/messages/en.json:988` | "…operated by the Vietnam Tourism Organization…" |
| `src/messages/vi.json:336` | `"subtitle": "Tổ chức du lịch quốc gia quảng bá Việt Nam ra thế giới"` |
| `src/messages/vi.json:417` | "Tổ chức Du lịch Việt Nam là cơ quan quốc gia…" |
| `src/messages/vi.json:988` | "…vận hành bởi Tổ chức Du lịch Việt Nam…" |
| `src/app/[locale]/about/page.tsx:6` | `"The national tourism organization promoting Vietnam to the world"` |
| `docs/`, `plans/` history, `.opencode/` | historical records |
| `src/messages/vi.json:174` | "Vietnam Airlines" — 3rd party, unrelated |

### 2.4 Tests / assets / git
- `grep -ri "vietnam" tests/` → **0** assertions on brand strings.
- `tests/unit/i18n-parity.test.ts` → en/vi JSON key parity + valid JSON only.
- `tests/browser/g-header.mjs` → only asserts absence of `"My trip"`.
- `public/` empty → no favicon/manifest/logo assets to update; header/footer brand is plain text.
- Git remote already `github.com/Ngoctu-07/duanmar.git`.
- **No `AskUserQuestion` needed**: scope already decided by user.

## 3. Typography Findings
| What | Where | Notes |
|---|---|---|
| Inter load | `src/app/layout.tsx:2,5-8` | `subsets:["latin","vietnamese"]`, `variable:"--font-sans"` |
| `.variable` on `<html>` | `src/app/layout.tsx:21` | **MUST stay on `<html>`** — prior P1 bug (`docs/project-changelog.md:14`) |
| Root metadata title | `src/app/layout.tsx:11` | `title: "Vietnam Tourism"` (Phase 2) |
| `--font-heading` | `globals.css:11` | `var(--font-sans)` — keep pointing at Inter |
| `font-heading` consumers | `src/components/ui/card.tsx:40`, `src/components/ui/sheet.tsx:108` | only 2 — keep UI chrome neutral |
| Google Fonts fetch | `.next/dev/server/next-font-manifest.json` | proven working at build time (inter woff2) |
| Brand render sites | `header.tsx:27` (`text-xl font-bold`), `footer.tsx:37` (`font-semibold`), `footer.tsx:93` (plain copyright) | footer:93 stays body font |
| `cn` import convention | `import { cn } from "cn"` | e.g. `src/components/ui/card.tsx:2` |

**Conclusion**: add a NEW `--font-brand` token + `Sora({ variable: "--font-brand" })`; do **not** repoint `--font-heading`.
Sora vietnamese subset: **CORRECTED 2026-09-28** — Sora does NOT offer a vietnamese subset (Google Fonts metadata: latin, latin-ext). Implementation shipped `subsets:["latin","latin-ext"]`; wordmark is ASCII so no diacritics needed, Inter covers Vietnamese body text.

## 4. Verification Commands
```bash
npm run lint
npm run build          # never run while dev server holds .next
npm test               # tsx unit runner, incl. i18n parity
npm run test:browser   # needs dev server on :3000
# brand consistency (expect exactly the 3 approved exceptions):
grep -rni "vietnam tourism" src/
grep -rni "vietnam tourist" src/    # alt spelling — expect 0
```

## Unresolved Questions
1. Org-name prose (`en.json:417`, `en.json:988`, `about/contact/page.tsx:7`, VI equivalents) — recommend keep unchanged unless user says otherwise.
2. `text-green-700` success at `booking-payment-section.tsx:161` — recommend keep.
