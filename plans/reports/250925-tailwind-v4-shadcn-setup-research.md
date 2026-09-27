# Tailwind CSS v4 + shadcn/ui + Next.js 14+ Setup Research

**Date:** 2025-09-25
**Context:** Vietnam tourism website project - multilingual (EN + VI), mobile-first, dark mode support

---

## 1. Recommended Versions

| Package | Version | Notes |
|---------|---------|-------|
| **Next.js** | 15.x (App Router) | Latest stable, full Tailwind v4 support |
| **Tailwind CSS** | **v4.x** | CSS-first config, 3.5x faster builds, ~70% smaller CSS output |
| **shadcn/ui** | Latest CLI (`shadcn@latest`) | Full v4 support, React 19, OKLCH colors |
| **next-themes** | Latest | Dark mode toggle for App Router |

### Why Tailwind v4 (not v3)?

- **New project = v4.** Tailwind v3 is legacy; v4 is stable since Jan 2025.
- v4 eliminates `tailwind.config.js` entirely — config moves to CSS `@theme` block.
- Automatic content detection (no `content` array needed).
- Faster builds (Rust-based Oxide engine): full build ~100ms, incremental ~5ms.
- Production CSS is ~70% smaller than v3.
- shadcn/ui has full v4 support with OKLCH color system.

---

## 2. Installation Commands

### Step 1: Create Next.js Project
```bash
npx create-next-app@latest vietnam-tourism \
  --typescript --tailwind --eslint --app --src-dir
cd vietnam-tourism
```

### Step 2: Install shadcn/ui
```bash
npx shadcn@latest init
# Choose: New York style, neutral base color, CSS variables: yes
# This creates: components.json, lib/utils.ts, globals.css updates
```

### Step 3: Add Components
```bash
npx shadcn@latest add button card dialog navigation-menu sheet
```

### Step 4: Install Dark Mode Support
```bash
npm install next-themes
```

### Step 5: Install Vietnamese Font Support
```bash
# Fonts are self-hosted via next/font — no CDN needed
# Inter supports Vietnamese subset natively
```

---

## 3. Theme Configuration Pattern (Tailwind v4)

### `app/globals.css` — Complete Pattern
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

/* Dark mode: class-based toggle via next-themes */
@custom-variant dark (&:is(.dark *));

/* shadcn/ui design tokens */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);

  /* Custom font tokens for Tailwind */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

/* Light mode (default) */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

/* Dark mode */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tourism brand colors (extend as needed) */
:root {
  --color-tourism-primary: oklch(0.55 0.15 250); /* Blue */
  --color-tourism-secondary: oklch(0.65 0.18 150); /* Green */
  --color-tourism-accent: oklch(0.75 0.15 50); /* Warm */
}

.dark {
  --color-tourism-primary: oklch(0.7 0.15 250);
  --color-tourism-secondary: oklch(0.75 0.18 150);
  --color-tourism-accent: oklch(0.8 0.15 50);
}

/* Base resets */
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## 4. Font Setup for Multilingual (EN + VI)

### `app/layout.tsx` Pattern
```tsx
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin", "vietnamese"],  // CRITICAL: add "vietnamese" subset
  display: "swap",
  variable: "--font-inter",         // CSS variable for Tailwind
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Vietnamese Font Support — Key Points

1. **Inter** supports Vietnamese diacritics natively — use `subsets: ["latin", "vietnamese"]`
2. **Be Vietnam Pro** is another excellent choice for Vietnamese-first projects
3. `next/font` self-hosts fonts at build time — zero external requests, GDPR-friendly
4. The `vietnamese` subset is smaller than `latin-extended` — specify it explicitly to reduce bundle size
5. Without the `vietnamese` subset, diacritics (a, e, o, u with marks) fall back to system fonts

### Recommended Fonts for Tourism Site
- **Primary:** Inter (supports 100+ languages including Vietnamese)
- **Display/Headings:** Be Vietnam Pro or Playfair Display (for elegance)
- **Monospace:** JetBrains Mono (for code/technical content)

---

## 5. Dark Mode Setup

### Theme Provider (`components/theme-provider.tsx`)
```tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### Key Configuration
- `attribute="class"` — adds `.dark` class to `<html>`
- `defaultTheme="light"` — default to light mode
- `enableSystem` — respect OS preference
- `disableTransitionOnChange` — prevents flash during toggle

### How It Works
1. Tailwind v4 default: `dark:` variant uses `prefers-color-scheme` media query
2. With `@custom-variant dark (&:is(.dark *));` — switches to class-based toggle
3. `next-themes` manages the `.dark` class on `<html>` element
4. All `dark:bg-*`, `dark:text-*` utilities activate automatically

---

## 6. Responsive Design Patterns (Mobile-First)

Tailwind v4 is mobile-first by default. Key breakpoints:
- `sm:` — 640px (large phones)
- `md:` — 768px (tablets)
- `lg:` — 1024px (desktops)
- `xl:` — 1280px (large desktops)
- `2xl:` — 1536px (ultra-wide)

### Tourism-Specific Patterns
```tsx
// Hero section - full-width on mobile, constrained on desktop
<section className="w-full lg:container mx-auto px-4">

// Destination cards - 1 col mobile, 2 tablet, 3-4 desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Navigation - hamburger on mobile, full nav on desktop
<nav className="hidden md:flex items-center gap-6">

// Footer - stacked on mobile, grid on desktop
<footer className="grid grid-cols-1 md:grid-cols-4 gap-8">
```

---

## 7. Gotchas & Important Notes

### Critical Gotchas

1. **PostCSS plugin changed in v4:**
   - v3: `tailwindcss` was the PostCSS plugin
   - v4: Plugin is `@tailwindcss/postcss` (separate package)
   - If you copy v3 setup, it will fail silently

2. **No `tailwind.config.js` in v4:**
   - All config moves to CSS `@theme` block
   - If you leave old config file, it has no effect

3. **`@import "tailwindcss"` replaces `@tailwind` directives:**
   - v3: `@tailwind base; @tailwind components; @tailwind utilities;`
   - v4: `@import "tailwindcss";` (single line)

4. **Dark mode class-based requires explicit override:**
   - v4 default: `prefers-color-scheme` media query
   - Must add `@custom-variant dark (&:is(.dark *));` for class toggle

5. **shadcn/ui `@theme inline` is required:**
   - Colors must use `@theme inline` to map CSS variables to Tailwind
   - Without `inline`, variables won't work in utility classes

6. **OKLCH color format:**
   - shadcn/ui v4 uses OKLCH (not HSL)
   - Colors look different in CSS than HSL — this is normal
   - Use `oklch()` format for new variables

7. **Vietnamese subset must be explicit:**
   - `subsets: ["latin"]` will NOT render Vietnamese diacritics correctly
   - Always add `"vietnamese"` to subsets array

8. **`autoprefixer` is no longer needed:**
   - v4 handles vendor prefixing via Lightning CSS
   - Removing it prevents duplicate/conflicting output

9. **`postcss-import` is no longer needed:**
   - v4 handles `@import` resolution natively

10. **`tw-animate-css` replaces `tailwindcss-animate`:**
    - `tailwindcss-animate` is deprecated
    - Use `@import "tw-animate-css"` instead

### Browser Support
- Tailwind v4 targets: Safari 16.4+, Chrome 111+, Firefox 128+
- If you need older browser support, use v3

---

## 8. Complete File Structure

```
vietnam-tourism/
├── app/
│   ├── layout.tsx              # Root layout with fonts + ThemeProvider
│   ├── globals.css             # Tailwind v4 config + shadcn tokens
│   ├── page.tsx                # Homepage
│   └── [locale]/               # i18n routing (if using next-intl)
├── components/
│   ├── ui/                     # shadcn/ui components (auto-generated)
│   ├── theme-provider.tsx      # next-themes wrapper
│   └── theme-toggle.tsx        # Dark mode toggle button
├── lib/
│   └── utils.ts                # cn() helper (auto-generated by shadcn)
├── components.json             # shadcn/ui config
├── postcss.config.mjs          # @tailwindcss/postcss plugin
└── package.json
```

---

## 9. Migration Checklist (If Starting Fresh)

- [ ] `npx create-next-app@latest` with `--tailwind` flag
- [ ] `npx shadcn@latest init` (choose neutral, new-york, CSS variables)
- [ ] Install `next-themes` for dark mode
- [ ] Configure `globals.css` with shadcn tokens + `@theme inline`
- [ ] Set up `ThemeProvider` in `layout.tsx`
- [ ] Configure `next/font` with `subsets: ["latin", "vietnamese"]`
- [ ] Add `--font-sans` to `@theme inline` for Tailwind integration
- [ ] Test dark mode toggle
- [ ] Verify Vietnamese text renders correctly
- [ ] Add components as needed: `npx shadcn@latest add [component]`

---

## 10. Unresolved Questions

- Do we need CJK font support (Korean, Chinese, Japanese) for additional locales?
- Should we use `next-intl` for i18n routing or a custom solution?
- What specific brand colors does the Vietnam tourism organization want?
- Do we need custom shadcn/ui components beyond the standard set?

---

**Status:** DONE
**Summary:** Tailwind v4 + shadcn/ui is the recommended stack. CSS-first config, OKLCH colors, class-based dark mode with next-themes, Vietnamese font support via Inter with explicit `vietnamese` subset. Key gotchas: PostCSS plugin changed, no tailwind.config.js, must use `@theme inline` for shadcn tokens.
