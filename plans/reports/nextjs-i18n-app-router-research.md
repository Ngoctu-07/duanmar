# Next.js App Router i18n Research Report

**Date:** 2026-09-25
**Context:** /home/duyplk/Documents/tour
**Requested by:** Planner agent

---

## 1. Library Recommendation: next-intl v4.x

### Why next-intl wins for App Router

| Criteria | next-intl v4 | react-i18next v17 | next-i18n-router v5 |
|----------|-------------|-------------------|---------------------|
| App Router support | First-class, built for it | Supported via i18next | Routing only, no translations |
| Weekly downloads | 5.4M | 15.9M | 335 stars (niche) |
| Bundle (gzip) | 12.6 KB | 10.0 KB | 2.5 KB |
| Server Components | Native support | Manual wiring | N/A |
| Built-in middleware | Yes (routing + hreflang) | No (needs custom) | Yes (routing only) |
| Locale routing | defineRouting() | Manual setup | i18nRouter() |
| hreflang/alternateLinks | Automatic via middleware | Manual | No |
| TypeScript | Excellent | Good | Good |
| Maintained by | Jan Amann (active) | i18next community | i18nexus |

**Recommendation:** `next-intl@^4.14` - purpose-built for Next.js App Router with best DX, built-in SEO (hreflang), and strong Sanity CMS ecosystem support.

### Install

```bash
npm install next-intl
```

---

## 2. Locale Routing Pattern (EN + VI)

### File structure

```
src/
  i18n/
    routing.ts          # defineRouting + createNavigation
    request.ts          # getRequestConfig (load messages)
  messages/
    en.json
    vi.json
  app/
    [locale]/
      layout.tsx
      page.tsx
      about/
        page.tsx
```

### Core configuration

#### `src/i18n/routing.ts`

```ts
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'vi'],
  defaultLocale: 'en',
  localePrefix: 'always' // /en/about, /vi/about
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

#### `src/i18n/request.ts`

```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate against supported locales
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

#### `next.config.ts`

```ts
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
```

#### `src/app/[locale]/layout.tsx`

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Middleware / Proxy (Next.js 16+)

For **Next.js 15 and earlier**, use `middleware.ts`:

```ts
// middleware.ts (root)
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except static files and API routes
    '/((?!api|static|.*\\..*|_next).*)'
  ]
};
```

For **Next.js 16+**, rename to `proxy.ts`:

```ts
// proxy.ts (root)
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export function proxy(request) {
  return createMiddleware(routing)(request);
}

export const config = {
  matcher: ['/((?!api|static|.*\\..*|_next).*)']
};
```

---

## 3. SEO Implementation (hreflang + alternates)

### Automatic hreflang via middleware

next-intl middleware **automatically** adds `Link` headers with hreflang tags. No extra code needed:

```
link: <https://example.com/en>; rel="alternate"; hreflang="en",
      <https://example.com/vi>; rel="alternate"; hreflang="vi",
      <https://example.com/>; rel="alternate"; hreflang="x-default"
```

This works when `localePrefix: 'always'` or `'as-needed'`.

**Disable if needed:**
```ts
export const routing = defineRouting({
  // ...
  alternateLinks: false // Use for custom sitemap-based approach
});
```

### Dynamic metadata with alternates

For page-level metadata with canonical + alternates:

```tsx
// app/[locale]/product/[id]/page.tsx
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export async function generateMetadata({ params }: {
  params: { locale: string; id: string }
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/product/${id}`,
      languages: {
        'x-default': `/en/product/${id}`,
        ...Object.fromEntries(
          routing.locales.map((l) => [l, `/${l}/product/${id}`])
        )
      }
    },
    openGraph: {
      locale,
      alternateLocale: routing.locales.filter((l) => l !== locale)
    }
  };
}
```

### Multilingual sitemap

```ts
// app/sitemap.ts
import { routing } from '@/i18n/routing';
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/about', '/contact'];

  return routes.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: `https://example.com/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '/' ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `https://example.com/${l}${route}`])
        )
      }
    }))
  );
}
```

---

## 4. EN + VI Locale Setup Best Practices

### Locale identifiers

Use simple language codes for the two locales:
- `en` - English (default)
- `vi` - Vietnamese

No need for region subtags (`en-US`, `vi-VN`) unless you plan regional variants.

### Vietnamese-specific considerations

1. **UTF-8 encoding:** Vietnamese uses diacritics (ă, â, ê, ô, ơ, ư, etc.). Ensure:
   - Files saved as UTF-8
   - Database/JSON files use UTF-8 encoding
   - No encoding issues in GROQ queries

2. **`lang` attribute:** Set `<html lang="vi">` for Vietnamese pages (critical for SEO and screen readers)

3. **Date/number formatting:** Vietnamese uses different conventions:
   ```tsx
   import { useFormatter } from 'next-intl';
   
   function VietnameseDate({ date }: { date: Date }) {
     const format = useFormatter();
     return <time>{format.dateTime(date, { dateStyle: 'long' })}</time>;
   }
   ```

4. **Font considerations:** Vietnamese diacritics require fonts with full Unicode coverage. System fonts are safe; custom fonts need verification.

### Translation file structure

```json
// messages/en.json
{
  "Common": {
    "home": "Home",
    "about": "About Us",
    "contact": "Contact"
  },
  "HomePage": {
    "title": "Welcome",
    "description": "Discover amazing tours in Vietnam"
  },
  "Metadata": {
    "title": "My Site - Discover Vietnam",
    "description": "Best tours and experiences in Vietnam"
  }
}

// messages/vi.json
{
  "Common": {
    "home": "Trang chủ",
    "about": "Giới thiệu",
    "contact": "Liên hệ"
  },
  "HomePage": {
    "title": "Chào mừng",
    "description": "Khám phá các tour tuyệt vời tại Việt Nam"
  },
  "Metadata": {
    "title": "Trang của tôi - Khám phá Việt Nam",
    "description": "Các tour và trải nghiệm tốt nhất tại Việt Nam"
  }
}
```

### Using translations

```tsx
// Server Component
import { getTranslations } from 'next-intl/server';

export default async function AboutPage() {
  const t = await getTranslations('Common');
  return <h1>{t('about')}</h1>;
}

// Client Component
'use client';
import { useTranslations } from 'next-intl';

export function Navigation() {
  const t = useTranslations('Common');
  return <nav><a href="/about">{t('about')}</a></nav>;
}
```

---

## 5. Sanity CMS Integration

### Two localization approaches in Sanity

| Approach | Plugin | Use case |
|----------|--------|----------|
| **Field-level** | `sanity-plugin-internationalized-array` | Single doc, mixed lang/common fields |
| **Document-level** | `@sanity/document-internationalization` | Separate doc per language, independent publishing |

**Recommended for tour site:** Document-level with `@sanity/document-internationalization` v6 — allows independent publishing per language.

### Sanity Studio setup

```ts
// sanity.config.ts
import { documentInternationalization } from '@sanity/document-internationalization';

export default defineConfig({
  plugins: [
    documentInternationalization({
      supportedLanguages: [
        { id: 'en', title: 'English' },
        { id: 'vi', title: 'Tiếng Việt' }
      ],
      schemaTypes: ['tour', 'destination', 'blogPost']
    })
  ]
});
```

### GROQ query pattern

```groq
// Fetch tour in specific locale with fallback to English
*[_type == "tour" && language == $locale && slug.current == $slug][0]{
  title,
  description,
  slug,
  language,
  // Get all available translations
  "translations": *[_type == "translation.metadata" && references(^._id)]{
    "locale": translations[0]->language,
    "slug": translations[0]->slug.current
  }
}

// Query with English fallback
*[_type == "tour" && slug.current == $slug][0]{
  title,
  "description": coalesce(
    description[language == $locale][0].value,
    description[language == "en"][0].value
  ),
  "slug": slug.current
}
```

### Connecting to next-intl

```ts
// lib/sanity.ts
import { createClient } from 'next-sanity';
import { routing } from '@/i18n/routing';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: 'production',
  apiVersion: '2025-02-19',
  useCdn: true
});

export async function getTourBySlug(slug: string, locale: string) {
  const fallbackLocale = routing.defaultLocale;
  
  return client.fetch(
    `*[_type == "tour" && slug.current == $slug][0]{
      title,
      "description": coalesce(
        body[language == $locale][0].value,
        body[language == $fallbackLocale][0].value
      ),
      slug,
      language
    }`,
    { slug, locale, fallbackLocale }
  );
}
```

### Static generation with Sanity

```ts
// app/[locale]/tours/[slug]/page.tsx
import { routing } from '@/i18n/routing';
import { getTourBySlug } from '@/lib/sanity';

export async function generateStaticParams() {
  const tours = await client.fetch(`*[_type == "tour"]{ "slug": slug.current }`);
  
  return tours.flatMap((tour) =>
    routing.locales.map((locale) => ({
      locale,
      slug: tour.slug
    }))
  );
}
```

---

## 6. Gotchas and Breaking Changes

### Next.js 15 -> 16 migration

1. **`middleware.ts` renamed to `proxy.ts`** in Next.js 16. If upgrading, rename the file.

2. **`params` is now a Promise** in Next.js 15+:
   ```tsx
   // OLD (Next.js 14)
   export default function Page({ params }: { params: { locale: string } }) {
     const { locale } = params;
   
   // NEW (Next.js 15+)
   export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
     const { locale } = await params;
   ```

3. **`generateStaticParams` return type** changed — must return `{ locale: string }[]`.

### next-intl v4 breaking changes

1. **`getRequestConfig` callback signature** changed — now receives `{ requestLocale }` instead of reading from headers directly.

2. **`useRouter()` from `next-intl/navigation`** is the recommended navigation API (not `next/navigation`).

3. **Middleware matcher** must explicitly handle unprefixed paths when using `localePrefix: 'as-needed'`.

### Sanity plugin breaking changes (2026)

1. **`sanity-plugin-internationalized-array` v5** and **`@sanity/document-internationalization` v6**: Language field moved from `_key` to dedicated `language` field.

   **Migration needed:**
   ```groq
   // OLD
   "title": title[_key == "en"][0].value
   // NEW
   "title": title[language == "en"][0].value
   ```

2. **Run migration** before upgrading:
   ```bash
   pnpm sanity migration run migrateToLanguageField --no-dry-run
   ```

### Vietnamese locale gotchas

1. **URL encoding:** Vietnamese characters in slugs (if localized pathnames used) need proper encoding. Use ASCII slugs or `encodeURIComponent`.

2. **Cookie `NEXT_LOCALE`:** Set `maxAge` for GDPR compliance — default is session cookie.

3. **Font rendering:** Test Vietnamese diacritics with custom fonts. System fonts (`Inter`, `Roboto`) handle Vietnamese well.

---

## Summary

| Aspect | Recommendation |
|--------|---------------|
| **Library** | `next-intl@^4.14` |
| **Locales** | `['en', 'vi']`, default `'en'` |
| **Routing** | `localePrefix: 'always'` — `/en/about`, `/vi/about` |
| **SEO** | Automatic hreflang via middleware + manual `alternates` for dynamic pages |
| **Sanity** | `@sanity/document-internationalization` v6 (document-level, independent publishing) |
| **Next.js version** | 15+ (or 16 if starting fresh) |
| **Middleware** | `middleware.ts` (Next 15) or `proxy.ts` (Next 16) |
| **Static generation** | `generateStaticParams()` returning all locale+slug combos |
| **Fallback** | Always fallback to English in GROQ with `coalesce()` |
