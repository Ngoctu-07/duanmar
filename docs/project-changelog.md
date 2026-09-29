# Project Changelog

## 2025-09-25

### Fixed
- **[P1] Sanity Studio: Missing environment variable NEXT_PUBLIC_SANITY_DATASET**
  - Root cause: `src/sanity/env.ts` (generated for embedded mode) read `NEXT_PUBLIC_*` vars, which are only inlined by Next.js. Standalone Studio (Vite) injects only `SANITY_STUDIO_*`-prefixed vars into `process.env` in the browser.
  - Fix: `env.ts` now reads `SANITY_STUDIO_*` with `NEXT_PUBLIC_*` fallback; added `SANITY_STUDIO_PROJECT_ID`/`SANITY_STUDIO_DATASET` to `.env.local` and `.env.example`.
  - Verified: Studio loads with 0 console/page errors; frontend `/en` `/vi` 200; `npm run build` pass.

### Fixed
- **[P1] CSS/rendering: font sai, hydration error, hero trùng lặp**
  - CSS 404/MIME: `npm run build` chạy song song `next dev` wipe `.next` → restart dev server. Lưu ý: không chạy build khi dev đang mở.
  - Font serif thay vì Inter: `inter.variable` gắn trên `<body>` nhưng `font-sans` áp lên `<html>` → chuyển variable class lên `<html>` (`src/app/layout.tsx`).
  - Hydration "3 Issues": `<SheetTrigger>` bọc `<Button>` → nested button → dùng Base UI `render` prop (`src/components/layout/header.tsx`).
  - Hero: xóa button thừa label trùng placeholder; `<Link><Button>` → `<Button nativeButton={false} render={<Link/>}>` (`src/components/homepage/hero-section.tsx`).
  - Verified: Playwright 0 console/pageerror trên `/en` + `/vi`, font Inter, `npm run build` pass.

### Fixed
- **[P1] Studio: No document types**
  - Root cause: `src/sanity/schemaTypes/index.ts` export `{ types: [] }` — `destination.ts`/`homepage.ts` tồn tại nhưng không được import/register.
  - Fix: import + register cả 2 schema (đủ cho frontend queries `homepage`, `destination`).
  - Verified: Vite transform config/index 200 với 2 types; Node import = `destination` (6 fields) + `homepage` (4 fields); Playwright Studio/`/en`/`/vi` 0 errors; `npm run build` pass.

### Fixed
- **[P1] next/image: hostname "cdn.sanity.io" not configured**
  - Root cause: `next.config.ts` thiếu `images.remotePatterns` — hero (`next/image`) + destination images load từ Sanity CDN bị Next chặn.
  - Fix: thêm `{ protocol: "https", hostname: "cdn.sanity.io" }` (allowlist chặt, không wildcard).
  - Verified: `_next/image` với đúng URL lỗi → 200; Playwright studio/`/en`/`/vi` 0 errors; `npm run build` pass.

## 2025-09-26

### Added
- **[Feature] Explore Destinations — listing + detail + localized 404** (framework Phase 1 core pages)
  - `/[locale]/explore/destinations`: listing + region filter (`?region=north|central|south`, Link-based) + empty state
  - `/[locale]/explore/destinations/[slug]`: detail (Image, region chip, description) + `generateMetadata` + `generateStaticParams` (SSG) + `notFound()`
  - `/[locale]/explore` → redirect to destinations
  - Localized 404: `[locale]/[...rest]` catch-all + `[locale]/not-found.tsx` (EN/VI) — fix toàn bộ dead links (`/deals`, `/plan-your-trip/*`...)
  - Extract `DestinationCard` (`src/components/explore/`) — reuse bởi home Featured Destinations (chuyển `<img>` → `next/image`)
  - New: `src/sanity/queries/destinations.ts`; messages EN/VI +`destinations`, `notFound`
  - Verified: Playwright 9/9 (listing, filter, empty state, detail, 404 localized, VI, redirect, home regression) + `npm run build` pass

### Added
- **[Feature] Plan Your Trip + About Us + Language Switcher** (framework Phase 1 core pages)
  - `/[locale]/plan-your-trip`: hub — 5 guide cards (visa, weather, getting-around, accommodation, health-safety); content tĩnh i18n EN/VI trong messages (`t.raw("guides")`, YAGNI chưa dùng CMS)
  - `/[locale]/plan-your-trip/[guide]`: dynamic route render theo slug; unknown → `notFound()` (localized 404 đã có); `generateMetadata` per guide
  - `/[locale]/about`: About landing (mission, vision, org, values)
  - Language Switcher trong Header (desktop + mobile sheet): segmented EN/VI, giữ path + query (`usePathname`/`useRouter` từ `@/i18n/navigation`)
  - Footer labels → i18n (`footer.*` keys EN/VI) thay hardcoded English
  - **Fix**: Header/Footer chuyển từ homepage-only vào `src/app/[locale]/layout.tsx` — trước đây mọi trang nội dung (destinations, plan-trip...) không có nav/footer
  - Verified: `npm run build` pass; Playwright 9 checks (hub EN, guide visa, 404 localized, guide VI, about EN/VI, switcher EN→VI giữ path, footer VI, destinations regression) — 0 console errors

### Added
- **[Feature] Explore Expansion — Things to Do + Itineraries + Festivals** (hoàn tất Explore section theo framework sitemap §2)
  - `/[locale]/explore/things-to-do`: hub 6 category cards → `/[category]` detail (summary + activities); unknown → localized 404; `generateMetadata` per category — fix 6 link homepage experience-categories + footer
  - `/[locale]/explore/itineraries`: listing 3 itinerary cards (duration chip 3/7/14-day) → `/[slug]` detail day-by-day (`classic-north`, `highlights`, `full-vietnam`); unknown → 404
  - `/[locale]/explore/festivals`: calendar 8 lễ hội (name, when, location, description) — Tet, Lim, Hùng Vương, Ooc Pom Bok, Hue Festival, Hội An Lantern, Trung Thu, đua thuyền
  - Nội dung tĩnh i18n EN/VI trong messages (`t.raw` — nhất quán plan-trip, YAGNI chưa cần CMS); sitemap thêm 4 routes explore + destinations
  - Verified: `npm run build` pass; Playwright 14/14 (EN/VI, 404 localized, footer click, home experience click, regression) — 0 console errors

### Added
- **[Feature] Top Navigation Completion — Culture + Deals + News** (fix toàn bộ dead links header nav)
  - `/[locale]/culture`: landing 6 sections theo framework §2 (History, UNESCO, Ethnic Minorities, Cuisine, Arts, Festivals) + 2 cross-link (→ things-to-do/food, → festivals)
  - `/[locale]/deals`: 4 promo cards (Promotion/Tour Package/Bundle/Seasonal) + disclaimer minh họa — fix quick-access `/deals`
  - `/[locale]/news`: listing 4 articles (category badge + date + excerpt) → `/[slug]` detail (paragraph content, `generateMetadata`, `notFound()`); EN/VI content tĩnh
  - Messages EN/VI +`culture`, `deals`, `news`; sitemap verify 3 URL đã có
  - Verified: `npm run build` pass; Playwright 14/14 (EN/VI, 404, 3 click-through, regressions) — 0 console errors; **header nav 6/6 link OK**

### Added
- **[Feature] About Subpages — Contact + Careers + Press Kit** (fix 3 footer dead links cuối cùng)
  - `/[locale]/about/contact`: 3 email channels (general/media/trade) + office hours + 3 Regional Tourism Offices (Hà Nội, HCMC, Đà Nẵng) — mailto links, không form backend (KISS)
  - `/[locale]/about/careers`: intro + 3 vị trí mẫu (type/location badges) + apply `mailto:hr@`
  - `/[locale]/about/press`: boilerplate + fact sheet 4 số liệu (disclaimer illustrative) + media contact
  - Extend namespace `about` sẵn có (+`contact`, +`careers`, +`press`) EN/VI — không sửa trang About gốc
  - Verified: `npm run build` pass; Playwright 12/12 (EN/VI ×3, footer click ×3, mailto assertion, regressions) — 0 console errors; site-wide check 16/16 routes 200 — **chỉ còn `/explore/map` 404 deliberate**

### Added
- **[Feature] Interactive Destinations Map** (framework §2 Interactive Map — dead link cuối cùng)
  - `/[locale]/explore/map`: Leaflet 1.9 + OpenStreetMap tiles (no API key), marker + popup link detail theo tọa độ, empty-state note khi chưa có coords, fallback list toàn bộ destinations (SEO + UX)
  - Schema `destination` +`lat`/`lng` (optional, validation -90..90 / -180..180) + query fields — user thêm tọa độ trong Studio (optional)
  - `src/components/explore/destinations-map.tsx` ("use client", dynamic `import("leaflet")` trong useEffect — SSR-safe, cleanup `map.remove()`)
  - Messages EN/VI +`map`; deps: `leaflet`, `@types/leaflet`
  - Verified: `npm run build` pass; Playwright (leaflet init + tiles + zoom + fallback EN/VI + quick-access click-through + regressions) — 0 console errors; **site-wide 15/15 routes resolve — 0 dead links**

### Added
- **[Feature] Site-wide Search** (framework §3 header icon + hero search bar, §4 smart search)
  - `/[locale]/search`: server page build index ~41 entries từ messages (guides, categories + activities, itineraries, festivals, culture, deals, news, about) + Sanity destinations → `SearchClient` live filter (normalize NFD + đ→d, all-tokens match, title-match sort, type badges EN/VI)
  - **Fix**: hero search input chết → GET form `/{locale}/search?q=` (useLocale); header search icon (desktop + mobile sheet row, aria-label i18n)
  - Messages EN/VI +`common.search`, +`search` namespace (title/placeholder/hint/noResults/7 type labels)
  - Verified: `npm run build` pass; Playwright (hero submit, header icon, diacritic "hội an"→"Hoi An", destination result→detail, noResults, VI labels, regressions) — 0 console errors; không thêm dependency

### Added
- **[Feature] Trip Planner (Itinerary Builder v1)** — framework Phase 2 itinerary builder (§4 Visitor-Facing #2)
  - `TripPlanProvider` client context + `useTripPlan()` (localStorage `vn-trip-plan:v1`, SSR-safe load/persist, dedupe, move ±1, clear)
  - `/[locale]/trip-planner`: `TripPlannerClient` fetch Sanity by slugs (preserve localStorage order), controls ↑↓ / Remove / Clear all / `window.print()` (Print→PDF), empty state + CTA, loading states; messages EN/VI `tripPlanner` (13 keys)
  - Header: Route icon → `/trip-planner` + count badge (desktop + mobile sheet row); `print:hidden` header/footer/controls
  - Destination detail: `<AddToTripButton>` toggle (Add/In-your-trip, aria-pressed)
  - Query: `DESTINATIONS_BY_SLUGS_QUERY`; 0 dependency mới (reorder buttons thay DnD — YAGNI, phase sau)
  - Verified: build pass; Playwright 21/21 (add→badge→reorder→reload persist→clear→VI→regressions) + print/CSS check — 0 console errors

### Added
- **[Feature] News CMS Engine v1** — framework Phase 2 blog/news engine (§7 Multilingual CMS)
  - Sanity schema `post`: fieldsets EN/VI, field `title/excerpt/content_en|_vi` (content = array paragraphs), slug (source title_en), category select (`pressRelease`/`story`), publishedAt date, ordering desc; registered vào schemaTypes
  - Queries `POSTS_QUERY` / `POST_BY_SLUG_QUERY`; provider `src/lib/news-content-provider.ts`: CMS-first merge với static fallback **slug-dedupe (CMS thắng)** — port bài cùng slug → shadow, không mất nội dung; try/catch → fallback khi Sanity down
  - News list/detail swap data source (JSX giữ nguyên shape); `formatNewsDate` UTC-safe ("28 Aug 2026" EN / "28/08/2026" VI); category label i18n `news.categories.*` EN/VI
  - Verified: build pass (2 route `ƒ dynamic`), Playwright 19/19 (4 static fallback, detail 3 paragraphs, 404, VI labels/date, regressions) — 0 console errors; CMS path chờ user seed 1 post trong Studio để re-verify
  - 0 dependency mới (giữ `sanity-plugin-internationalized-array` trong package.json cho multilanguage phase sau)

### Added
- **[Feature] Support/FAQ + Privacy Policy & Terms** — hoàn tất framework §2 Utility + §3 footer legal links + §7 FAQPage structured data
  - `/[locale]/support`: 8 FAQ native `<details>` (0 dep, no-JS) + chevron, CTA → About/Contact; **FAQPage JSON-LD** (first structured data of site, escape `<` anti-injection)
  - `/[locale]/privacy`: 5 Privacy Policy + 5→4 Terms sections EN/VI, nội dung trung thực theo codebase (no analytics, cookie locale, localStorage trip plan, Sanity/OSM/Google Fonts); Terms disclaimer verify với nguồn chính thức (§8)
  - Footer legal row (Support & Privacy, EN/VI); sitemap +`/support`, `/privacy`
  - Rời scope có lý do: Live Chat/Emergency Hotlines (chatbot Phase 3, không bịa số hotline), Accessibility Statement + HTML Sitemap (phase sau)
  - Verified: build pass, Playwright 35/35 — 0 console errors

### Fixed
- **[Bug] News CMS detail 404 với slug 2 segment** (phát hiện khi verify CMS path với post seed `abc/123` từ Studio): `news/[slug]` → `news/[...slug]` catch-all (`slugParts.join("/")`) — Sanity slug field cho phép `/`. CMS path verified 13/13 (list 5 items CMS newest-first, detail EN/VI, date "25 Sept 2026" en-GB, category i18n)

### Added
- **[Feature] Blog (Stories & Inspiration) + Homepage Stories Section** — framework §2 Blog node + §3 wireframe #8
  - `getStories(locale, limit?)` trong news provider: filter `categoryKey==="story"` (CMS = key trực tiếp, static = reverse label map từ `news.categories`), provider-order
  - Extract `NewsItemCard` shared (DRY) — news list refactor không đổi markup (regression verified); blog cards `showCategory=false`
  - `/[locale]/blog`: story-only listing (1 CMS + 2 static seed), metadata, empty state, EN/VI `blog` namespace
  - Homepage `StoriesSection` (server, `getLocale()`): 3 bài trước NewsletterCTA + view-all → `/blog`
  - Footer explore +Blog link; sitemap +`/blog`
  - Verified: build pass, Playwright 23/23 (filter loại press, CMS story included, homepage section order, VI, footer/sitemap, news regression) — 0 console errors; 0 dependency

### Added
- **[Feature] Events & Festivals Calendar + Homepage Events Ticker** — framework §2 Explore→Festivals & Events Calendar + §3 wireframe #7 + §9 Phase 2 events calendar
  - `/[locale]/explore/events`: server-side month filter qua `searchParams` (12 month chips `aria-current`, `?month=N` shareable, invalid → current month) — **0 client JS**
  - `festivals.items[].months` arrays EN/VI (parity verified): Gregorian exact + lunar approximate (Lim/Hung Kings) + Hoi An [1..12]; card giữ `when` gốc + `lunarNote` disclaimer (không bịa ngày âm)
  - Homepage `EventsTicker`: 8 chips (name + when) `overflow-x-auto` strip, trước StoriesSection, view-all → calendar
  - Cross-link festivals ↔ calendar; footer +`/explore/events`; sitemap
  - Verified: build pass, Playwright 28/28 (filter m=1/7/10, parity EN/VI, ticker order, cross-links, regressions) — 0 console errors; 0 dependency
  - Next: filter region/type + ICS export (cần structured data)

### Added
- **[Feature] Trade Landing + Homepage Wireframe Completion (#6 Trending, #10 Trade/Press CTA)** — framework §2 Travel Trade root + §3 #6/#10
  - `/[locale]/trade`: brochure 4 offers (Marketing & co-op, Statistics "on request", Directory "in development", Media kit → press), partner enquiry CTA → contact — **không bịa số liệu/đối tác/partner login**
  - Homepage `TrendingItineraries` (3 itinerary cards thật, duration badge, không price) sau Categories trước Ticker; `TradeCtaBand` 2 links (/trade + /about/press) sau Stories trước Newsletter
  - Messages EN/VI `trade` + `home.trade` + `home.trendingViewAll` + `footer.trade`; footer about col +Trade; sitemap +`/trade`
  - Homepage wireframe giờ còn thiếu: #2 video carousel (hero cover), #9 sustainability (framework Phase 3)
  - Verified: build pass, Playwright 31/31 (section order #6<#7<#8<#10<#11, card links, honest-content asserts, VI, footer/sitemap, regressions) — 0 console errors; 0 dependency


### Added
- **[Feature] Sitemap Completion — Business & MICE + Accessibility + HTML Sitemap** — framework §2 Business&MICE tree + Utility tree (đóng 2 cây)
  - `/[locale]/business-mice`: brochure 4 services (venues/incentive/visitor info/toolkit "available on request"), visa CTA → guide, contact CTA — **không bịa venue/capacity/số liệu**
  - `/[locale]/accessibility`: statement trung thực — WCAG 2.1 AA *as goal*, 5 measures dựa feature codebase thật (semantic, focus, alt/ARIA, responsive, contrast), 3 known limitations (map widget, external images, không claim certification), feedback → contact
  - `/[locale]/sitemap`: HTML sitemap 6 groups + Home, **42 links** dynamic từ messages dicts (categories 6, itinerary items, news items 4 — sync tự động), labels reuse existing ns; `sitemapPage` ns 8 keys EN/VI
  - Footer legal row 2→4 (Accessibility, Sitemap thêm); sitemap.xml +`/business-mice`, `/accessibility`, `/sitemap`
  - Verified: build pass, Playwright 40/40 — 0 console errors (honest asserts: no fabricated stats, no "certified", footer 4 links EN/VI, XML vs page, sample links 200, regressions) — 0 dependency

### Added
- **[Feature] Plan Your Trip Guides Completion — 5 nodes còn lại** — framework §2 Plan Your Trip tree (5/10 → **10/10, đóng cây**)
  - 5 guides EN/VI: `getting-to-vietnam`, `money-costs`, `etiquette`, `accessible-travel`, `sustainable-travel` — mỗi guide 4 sections; **0 page code mới** (pattern `[guide]/page.tsx` + hub `Object.entries(guides)` dynamic auto-update)
  - Honest content: airports factual (Noi Bai/Tan Son Nhat/Da Nang/Phu Quoc), không số ngân sách/tipping rates, accessible-travel trung thực "infrastructure varies" — slug `accessible-travel` tránh conflict `/accessibility` (website statement)
  - HTML sitemap plan group refactor dynamic (hub + 10 guides, sync từ messages); sitemap.xml derive guide routes từ messages keys (+10 routes — 5 guides cũ chưa có trong XML trước đây)
   - Footer plan col giữ nguyên 4 links (user approved — discover qua hub/sitemap/XML)
   - Verified: build pass, Playwright 54/54 (5×2 locales, parity EN=VI sections, hub 10 cards, unknown 404, slug coexist, sitemap page/XML, regressions) — 0 console errors; 0 dependency

### Fixed
- **[P1] Web refresh liên tục trên `next dev` (Turbopack HMR panic loop)**
  - Symptom: trang tự "refresh" ~1 lần/giây. **Không phải redirect loop** (HTTP matrix sạch, `/`→307`/en`→200) và **không phải app code** (`src/` không có `reload()`/`router.refresh()`/`setInterval`).
  - Root cause: `next dev` ném `TurbopackInternalError: conflicting effects for the same key (key length: 71 bytes)` từ t+3.6s sau boot (tự khởi phát — test với 0 client/0 request/0 file change vẫn lỗi, 1 Hz đều đặn, 1505 lần/run trước) → server HMR subscription lỗi & resubscribe mỗi 1s → mỗi lần đẩy 1 update → client `[Fast Refresh] done` → router navigate lại cùng URL. Đo Puppeteer: 22 navigations/20s nhưng chỉ **1** HTTP document request.
  - Nguyên nhân gốc: cache `.next` hỏng/trộn — artifact production lẫn dev, file 0 byte `.next/turbopack`, sinh ra khi `node_modules` còn bản Linux (`swc-linux-x64-gnu`) và SWC binary đang tải dở.
  - Fix: dừng dev server → `rm -rf .next` (cache only, đã gitignore) → boot lại. **0 thay đổi source.**
  - Verified: 0 lỗi `conflicting effects` sau 65s idle (0 client/0 request); browser 15s = 2 nav, **0 Fast Refresh**, 0 console error; `eslint .` 0 error; `tsc --noEmit` 0 error; `npm run build` exit 0; curl smoke 11 routes đúng status, 0 vòng redirect; hook tests 293/347 pass (34 fail pre-existing do project không có `.git` → `git rev-parse` fail).
  - Note: không chạy `next build` khi `next dev` đang mở (cùng dùng `.next`); sau build nên `rm -rf .next` trước khi dev lại để tránh trộn artifact.
  - Docs impact: minor (changelog này).

### Added
- **[Feature] Price tier block — bảng giá theo số khách (IN HOA, đỏ)** dưới mô tả tour, 2 trang
  - `PriceBlock` (RSC, 88 dòng) mount tại itinerary detail (sau `summary`, trước danh sách ngày) và destination detail (sau `description`): bảng 3 cột `TIER · PER GUEST · GROUP TOTAL`, toàn block `uppercase` + `text-destructive` trên `bg-card`.
  - **Readability note**: toàn bộ chữ IN HOA theo yêu cầu, kể cả disclaimer — contrast `#e7000b`/white = 4.77:1 (pass AA kể cả `text-xs`), tuyệt đối **không** đặt khối lên `bg-muted` (4.45:1, fail); cột số dùng `tabular-nums`, cuộn ngang có `role=region` + `tabIndex=0` cho bàn phím.
  - **Nguồn dữ liệu**: Sanity doc mới `tourPricing` (`tourSlug` khớp slug itinerary/destination, `tiers[]` nhập tay `pricePerGuest`/`groupTotal` cho cả VND lẫn USD → **không** tự quy đổi tỉ giá, **không** bịa số; thiếu/malformed dữ liệu → `mapPricingTiers` lọc & block tự render `null`).
  - i18n namespace mới `pricing` (8 key, EN/VI song song; EN ICU plural `1 guest`/`2 guests`); VI → `1.850.000 ₫`, EN → `$75` (nguyên → không thập phân).
  - Files: `sanity/schemaTypes/tour-pricing.ts` (+registry), `sanity/queries/tour-pricing.ts`, `lib/pricing.ts`, `components/pricing/price-block.tsx`, `explore/{itineraries,destinations}/[slug]/page.tsx`, `messages/{en,vi}.json`; 0 dependency mới.
  - Verified: `eslint .` 0 error; `tsc --noEmit` 0 error; `npm run build` exit 0 (dev dừng trước khi build); curl 8 route — 2 trang itinerary + 2 destination **200 & block ẩn khi chưa có data**, 404 giữ nguyên, preview render đúng; unit check logic `mapPricingTiers`/`formatPrice` 16/16 (sort, VI/EN currency, drop null/NaN/đảo min-max, giữ giá 0 hợp lệ); screenshot VI/EN đối chiếu đúng mẫu.
  - Block vẫn ẩn trên trang thật → chờ user nhập `tourPricing` trong Studio (cần `npx sanity cors add http://localhost:3000 --allow-credentials` trước vì origin đang bị chặn). Route demo tạm `/[locale]/price-preview` đã **xoá ngay sau khi chốt UI** (không còn URL giá mẫu hardcode trong codebase).
  - Review: `plans/reports/code-reviewer-260926-price-tier-block.md` (4 Major đã fix: xoá rủi ro 500 khi Sanity lỗi, chặn giá ảo `0`/`NaN`, validation max≥min/không trùng, harness), 10 Minor — xem `plans/260926-1915-price-tier-block/plan.md` → Deviations.
  - Docs impact: minor (changelog này).

### Fixed
- **[P1] Sanity Studio crash khi nhập giá — `TypeError: title?.toLowerCase is not a function` (`BreadcrumbButton`)**
  - Root cause: array member `tier` của schema `tourPricing` khai `preview.select.title = "minGuests"` (**number**) → breadcrumb của Sanity chạy `title?.toLowerCase()`; fallback `preview?.value?.title || "…"` không bắt được number truthy → TypeError mỗi khi mở/điền 1 tier. Chỉ type mới này bị (destination/homepage title đều string).
  - Fix (1 file): `tour-pricing.ts` thêm export `tierPreviewLabel(min, max)` + member preview dùng `prepare()` trả **`title` là string** (`"Tier"` / `"8+ guests"` / `"2 guests"` / `"3–4 guests"`) — đồng thời label hàng tier trong Studio rõ hơn trước. Bonus: `subtitle` guard `== null` thay vì raw number.
  - Verified: eslint 0 · tsc 0 · `npm run build` exit 0 (cache `.next` clear, dev restart sạch, 0 lỗi HMR) · unit `tierPreviewLabel` **13/13 luôn string** · bundle grep: `tierPreviewLabel` ×4 có, `title: "minGuests"` cũ = 0 · repro cơ chế: title number → đúng stack `TypeError: title?.toLowerCase is not a function`, title string → OK · curl 4 route + 404 không đổi · block **render với data thật** trên `/vi|en/explore/destinations/hcm` (VND/USD đúng).
  - Review: `plans/reports/code-reviewer-260926-fix-breadcrumb-numeric-preview.md` → **APPROVE** (0 Critical/Major; 2 Minor pre-existing: doc-level `subtitle` là number nhưng không có path gọi string method).
  - Chưa verify được: B6c click-through trên Studio thật (Puppeteer dừng ở màn login, không có session) → chờ bạn bấm tay xác nhận.
   - Data warning: doc `tourPricing` `hcm` đang có tier test sai (`minGuests 100000/maxGuests 200000/groupTotalVnd 2`) → hiện `100000–200000 KHÁCH`, `TỔNG NHÓM 2 ₫` — cần sửa trong Studio (không phải bug code).
   - Docs impact: minor (changelog này).

## 2026-09-27

### Added
- **[Feature] Đặt vé — Booking checkout flow** (plan `260927-0034`)
  - Form checkout 4 section: Liên hệ · Ngày khởi hành · Số khách/giá (tổng realtime theo tier) · Độ khó; validate on submit, lỗi inline `role="alert"`
  - Window chọn ngày 7 ngày (ngày mai → +7) bằng `react-day-picker@10` (calendar disabled ngày ngoài window)
  - Verified: unit booking-logic 13/13, pricing-range 15/15, travel-date 11/11; browser `c-booking` exit 0; tsc/eslint/build exit 0
  - Review: `plans/reports/code-review-booking-payment-mytrips-20260927.md`

### Added
- **[Feature] Thanh toán QR (mock)** (plan `260927-0121`)
  - Payment method trong Order Summary: Bank QR + MoMo, payload mock (amount + reference sanitized, copy ghi rõ "QR demo — chưa kết nối cổng thanh toán thật")
  - Timer 3s (`VERIFY_DELAY_MS`) pending → success (giả lập webhook); booking **chỉ persist** vào localStorage `vn-my-trips:v1` sau khi paid
  - Verified: unit payment-logic 8/8; browser `c-payment` exit 0, `d8-a11y` exit 0

### Added
- **[Feature] Ngày khởi hành + My Trips** (plan `260927-0141`)
  - Calendar DayPicker (7-day window, disabled-day xám) + row Ngày khởi hành nổi bật trên ticket summary
  - `/my-trips` (list) → `/my-trips/[reference]` (detail tái dùng `buildTicketRows` shared với checkout); đọc localStorage **sau mount** → tránh hydration mismatch
  - Verified: `f-ui` exit 0 (F9/F10), unit travel-date 11/11

### Removed
- **[Feature] Gỡ trang trip-planner** (plan `260927-0205`)
  - `/vi/trip-planner` → 404; xóa route + `src/components/trip-planner/` + `TripPlanProvider` + namespace `tripPlanner` (EN/VI)
  - Không còn link `/trip-planner` ở header/sheet/search/sitemap; nav còn `/plan-your-trip`
  - Verified: `g-header` exit 0 (G1–G8)
  - Note: approval — dismissed question, proceeded on explicit user instruction to continue

### Added
- **[Feature] Daily Inventory & Dynamic Date Validation** (plan `260927-1420`)
  - Schema `tourPricing` +`maxCapacity` (1–999) + `occupancy[]{date,booked}` (CMS) → badge "N chỗ trống"/"Hết chỗ" theo từng ngày trong window
  - Ngày `remaining < số khách` bị disable (không click được); đổi số khách vượt chỗ trống của ngày đã chọn → lỗi `dateFull`
  - Booked/ngày = CMS occupancy + device bookings (`vn-my-trips:v1`); thiếu dữ liệu → không hiển thị/không chặn (P4)
  - Verified: unit tour-capacity 14/14, h2-capacity-validation 15/15, h6-render 11/11, h4 E2E 12/12; regression `c-booking`/`c-payment`/`f-ui`/`d8-a11y`/`g-header` exit 0; EN/VI parity 701/701; lint/tsc/build exit 0
  - Review: `plans/reports/code-review-inventory-quality-20260927.md`, `plans/reports/code-review-inventory-adversarial-20260927.md`

### Fixed
- **[P1] Code review fixes (3 báo cáo review 2026-09-27)**
  - Hydration mismatch lịch SSR/client TZ → chỉ render calendar sau khi mount (chờ mount mới tính window)
  - Hợp nhất `isValidGuests` (guests >99 không còn hiện `dateFull`/giá ảo); `mapTourCapacity` chặn `maxCapacity` không an toàn (>999/unsafe integer)
  - Tổng giá làm tròn 1 lần (không còn float noise vào QR payload + localStorage)
  - Nâng `isTripBooking` guard đủ 15 field → không còn crash `/my-trips/[reference]` do record hỏng
  - `resolveTierForGuests` clamp về tier **gần nhất** trong gap (trước đây lấy tier đắt nhất)
  - Sanity schema: price/`groupTotal` `min(1)` (khớp mapper runtime), `maxCapacity` `max(999)`
  - Header: bỏ nút "Lập kế hoạch du lịch" dead; sr-only "Menu" có i18n (`common.menu`); lỗi form thêm `role="alert"`
  - Round 2 (user-approved 4/4): ghi chú trung thực khi tour thiếu giá (`booking.priceMissingNote`, unit `payment-note.test.ts`) · nút "Xóa tất cả chuyến đi" trên My Trips (`clearBookings()`, test F12) · `storage` listener refresh danh sách + capacity cross-tab (test F13) · test chuyển vào repo (`tests/` + `npm test` 10/10, `npm run test:browser` 6/6 — thay quyết định temp-dir cũ)
  - Deferred còn lại: blur validation (m14), hàng `occupancy` hỏng bị drop im lặng (A4), `maxCapacity=0` (A5), aria ngày hết chỗ (A6), CDN staleness (A8), `verifyToken` thừa (n1)
  - Review: `plans/reports/code-review-{booking-payment-mytrips,inventory-quality,inventory-adversarial}-20260927.md`
  - Verified: lint/tsc/build exit 0; parity EN/VI 701/701; `npm test` 10/10; `npm run test:browser` 6/6
  - Docs impact: minor (changelog này)

### Fixed
- **[P1] Stale pricing data — Sanity cache invalidation (đóng A8)** (plan `260927-1645`)
  - Root cause 3 lớp: (1) `[slug]` + các trang CMS là SSG đóng băng từ build, không `revalidate`/tag → cần redeploy; (2) `useCdn: true` → đọc qua CDN edge stale; (3) không webhook, không `revalidateTag` → không đường refresh khi publish
  - Fix: `useCdn: false` (origin reads) · mọi CMS fetch đi qua `fetchPublished` bọc `unstable_cache` với tag `sanity` + entity tag (`sanity:destination:*`, `sanity:pricing:*`, `sanity:news:*`) · route `POST /api/revalidate` (HMAC `next-sanity/webhook` → `revalidateTag("sanity","max")` + `revalidatePath("/","layout")`) · fallback: cache entry tự hết hạn ≤5 phút (`revalidate: 300`) + ISR 300s trên trang `[slug]` SSG
  - Docs: runbook `docs/cms-cache-revalidation.md` (tạo webhook ở Sanity Manage) · `.env.example` +`SANITY_REVALIDATE_SECRET`
  - Verified: `npm test` 11/11 · `npm run test:browser` 7/7 (thêm `revalidate-webhook` 10/10 checks) · tsc/eslint/build exit 0 · parity 701/701
  - Test đổi sang CMS-derived (helper `tests/helpers/cms-expectations.mjs`): user publish dữ liệu mới lúc 09:36Z (tiers 2–4/5–8, `maxCapacity=10`, occupancy 29/09) → 3 test cũ hardcode fixture cũ fail; giờ assert "UI == published source of truth"

### Fixed
- **[P1] Inventory sync bug + refactor daily capacity — một ledger duy nhất (đóng A4)** (plan `260927-1804`)
  - Root cause (probe chứng minh, không phải bug phép tính): **2 ledger tách rời, không write-back** — `occupancy[]` nhập tay trong Studio (7/10, tĩnh, không tự cập nhật khi đặt vé) + booking thiết bị `localStorage vn-my-trips:v1` merge lên trên → booking test của user chồng lên 7 tay (≥3 khách → 10) → "Hết chỗ" trong khi Studio vẫn 7/10; ngày khác "9/10" = 10 − booking thiết bị, vô hình trong Studio. Browser sạch: Sep 29 badge "3 chỗ trống" = 10−7 ✓
  - Refactor: **bỏ hoàn toàn `occupancy[]` khỏi Studio** (xóa schema `occupancy-field.ts` + projection query; data cũ thành orphan bị ignore) · còn **1 field global `maxCapacity`** (pax/ngày, title rõ nghĩa) · `remaining = maxCapacity − Σ guests của confirmed bookings` (`mapTourCapacity` → `mergeDeviceBookings` = đường aggregate DUY NHẤT) · "Hết chỗ" + disable iff `remaining ≤ 0` (giữ chặn guest-aware theo P2 đã duyệt) · recalc qua mount + `storage` event + reload/remeasure (test mới probe: badge 10 → 9 chỗ trống ngay sau booking mới)
  - Hạn chế (P3 đã duyệt): "tất cả bookings" = bookings đã thanh toán **trên thiết bị này** (localStorage) — đồng bộ cross-device cần backend (ngoài scope, không auth)
  - Verified: `npm test` 11/11 (unit viết lại theo booking-aggregation: tour-capacity 15, h2 15, h6 11) · `npm run test:browser` 7/7 (h4 13 checks: derived-from-device + recalc probe mới; helper `remainingOn` đọc max − device bookings) · tsc/eslint/`next build` exit 0 · parity 701/701 · dev restart với `SANITY_REVALIDATE_SECRET`, curl home/checkout/studio 200

## 2026-09-28

### Changed
- **[Feature] Global theme Red/Black/White + brand → DuanMAR + Sora wordmark** (plans `260927-2100` + remediation `260927-2345`)
  - RCA ban đầu: prompt apply **chưa từng ghi code** (git diff rỗng, 0 `DuanMAR` trong `src/`) — không phải lỗi cache/HMR; dev server vẫn serve đúng source (`--primary:#171717`)
  - Palette (`src/app/globals.css` `:root` + `.dark` sync): `--primary` `oklch(0.5 0.19 25)` ≈ **`#B71824`** (crimson, không neon) · `--foreground` `#18181B` (soft black) · nền trắng · muted/border/input/accent warm-neutral hue 75 · chart 1–5 + sidebar theo brand ramp · **`--destructive-foreground`** (định nghĩa mới — fix class no-op ở `travel-date-field.tsx:169`) + map `--color-destructive-foreground` · `components.json` `baseColor` → `red`
  - Tách vai trò đỏ: 15 chỗ trang trí (eyebrow `uppercase tracking-widest`, số tiền, `CheckCircle2`, rdp accent/selected/today/sold-out) `text-destructive` → `text-primary`; lỗi giữ `--destructive` (`role="alert"`, `aria-invalid:*`, nút destructive variant)
  - Brand: **35 chỗ** → `DuanMAR` (27 `metadata.title` + `layout.tsx` title + header/footer wordmark + `privacy:8`/`sitemap:7` prose + `en/vi.json:1162`); 3 chỗ còn lại = org-name prose đã duyệt (`about/contact:7`, `en.json:417/988`); **không đụng** URL `vietnam-tourism.com`, email, `package.json`, sitemap/robots, docs/plans history
  - Typography: thêm `Sora` (`variable:"--font-brand"`, `.variable` trên `<html>` — không lặp bug changelog:14) + token `--font-brand` + component `src/components/layout/brand-wordmark.tsx` (header/footer dùng chung; footer copyright giữ Inter; `--font-heading` KHÔNG đổi → card/sheet vẫn Inter). **Deviation**: Sora không có subset `vietnamese` (metadata: latin/latin-ext) → `subsets:["latin","latin-ext"]`, wordmark ASCII, body Inter vẫn có vietnamese
  - Test fix (không làm màu pass): `f-ui.mjs` F7 đổi assertion `text-destructive`→`text-primary` (theo theme mới) · `h4-p4-e2e.mjs` thêm month-navigation cho day+7/+8 (bug phụ thuộc ngày: fail sau ngày 23 vì +7 rơi vào tháng sau — reproduce ở baseline) · `revalidate-webhook` cần `SANITY_REVALIDATE_SECRET` (cấp cho dev + test, KHÔNG ghi `.env.local`)
  - Verified: `git diff` 44 files · grep `DuanMAR` 35 / "vietnam tourism" đúng 3 exception / infra untouched · lint + tsc + `next build` exit 0 (`.next` đã xóa rebuild từ sạch) · `npm test` 11/11 (parity EN/VI) · `npm run test:browser` **7/7** · contrast: trắng↔`#B71824` 6.63:1, `#18181B`↔trắng 17.7:1, muted 4.7:1, trắng↔`#DC2626` 4.83:1 · evidence: `plans/260927-2345-.../evidence/{home-vi,home-en,checkout-hcm}.png`
  - Docs impact: minor (changelog này + plan statuses)
- **[Feature] UI polish: brand → DuanMar, primary đỏ sâu, elevation mềm, body 450** (plan `260928-1100`)
  - Brand: `DuanMAR` → `DuanMar` 35 chỗ trong `src/` (32 files, không đổi tên file); history `docs/`/`plans/` giữ nguyên (4/62 hits); banner asset đọc đúng casing
  - Color: light primary → `oklch(0.444 0.177 25.331)` ≈ **`#9F0618`** (8.36:1, was 6.63) · dark → `oklch(0.62 0.17 25)` (5.05:1/4.54:1 trên nền tối) · old red 0 hit
  - Elevation: token `--elevation-soft` (`:root`) + alias `--shadow-soft` (`@theme inline`) + rule `.rounded-xl.border{box-shadow:var(--elevation-soft)}` phủ 43 card sites · `hover:shadow-lg`→`shadow-md` (3) · bỏ `ring-1 ring-foreground/10` trong `card.tsx`
  - Typography: `--font-weight-body: 450` + `.font-body` + `body @apply font-body`
  - Verified: lint exit 0 · `npm test` 11/11 · `npm run build` exit 0 (grep CSS build: `--elevation-soft`, `.shadow-soft`, `font-weight:450`, `9f0618`) · `npm run test:browser` 7/7 · contrast table trong `plans/260928-1100-.../reports/verification-log.md` · evidence `home-vi.png`, `home-en.png`, `checkout.png`
  - Docs impact: minor (changelog này + plan statuses Complete)
- **[Feature] [UI/UX] Entry promotional modal + payment success toast** (plan `260928-1200`)
  - Modal: `src/components/ui/dialog.tsx` (base-ui Dialog, centered popup, `z-[60]`, prop `closeLabel`/`closeSlot` i18n) + `src/components/layout/promo-modal.tsx` mount trong `[locale]/layout.tsx` → hiện ở **mọi full page load** (mọi route incl. checkout; SPA Link nav giữ layout → không hiện lại) · ảnh `public/images/promo-modal.png` (**placeholder sinh bằng HTML→Puppeteer** vì không có key AI image; user thay file bất kỳ lúc nào, không đổi code) · X thấy được + Escape + backdrop click đóng · namespace `promo` EN/VI · YAGNI: không localStorage suppression (AC-literal)
  - Toast: `src/components/booking/payment-success-toast.tsx` (bespoke, 0 dep mới) trigger effect `status === "success"` trong `booking-payment-section.tsx` · `fixed bottom-4 right-4 z-[80] pointer-events-none` (non-blocking mọi toạ độ) · card `bg-foreground border-l-4 border-primary shadow-soft` · `role="status"` nhưng **KHÔNG** attr `aria-live`, không `<p>` (giữ first-match `p[aria-live="polite"]` của tests) · auto-dismiss đúng **5000ms** · text verbatim EN "Thank you for your booking. We will contact you within 5 minutes." / VI "Cảm ơn quý khách đã đặt tour. Chúng tôi sẽ liên hệ trong vòng 5 phút." (`booking.toastSuccess`)
  - Tests: `tests/helpers/promo.mjs::dismissPromo(page)` (19 goto/reload site qua 6 files) — **setup lines only, 0 assertion edit** (`check(` count không đổi, `aria-live` count 8 giữ nguyên) · hardening: chờ mount 10s, bấm X (fallback Escape), `waitForFunction` cả popup + backdrop biến mất → fix hydration race từng làm `f-ui` fail · dismiss ổn định 5/5 lần
  - Verified: lint exit 0 · `npm test` 11/11 (parity EN/VI) · `npm run build` exit 0 (fix lỗi TS `clearTimeout` → `window.setTimeout`) · `npm run test:browser` **7/7** · toast probe 3034→8035ms (đúng 5000ms) · `git diff package.json` rỗng (0 dep mới) · evidence `promo-modal-vi.png` (popup 672×456, X 28×28, ảnh loaded) + `payment-success-toast.png` · `reports/verification-log.md`
  - Docs impact: minor (changelog này + plan statuses Complete)

### Added
- **[Feature] Star rating + customer reviews** (plan `260928-0010-star-rating-and-customer-reviews`)
  - **Derived rating, no backend**: badge `TourRatingBadge` (`data-testid="tour-rating-badge"`) + section `CustomerReviews` đọc aggregate từ localStorage `vn-reviews:v1` (0 review → badge render null, section empty-state); Sanity read-only, 0 dep mới · same-tab sync qua event `vn-reviews:changed` + cross-tab `storage` (save/delete dispatch)
  - Lib `src/lib/reviews.ts` (155 dòng): `isReview` guard · `listReviews` (window-guarded, newest-first, filter invalid) · `saveReview` upsert theo `reference = ${bookingReference}:${tourSlug}` → **1 review/booking/tour, submit lại = edit (prefill)** · `deleteReview` · `getAggregate` (null @0) · `formatRating` (1 decimal) · `reviewsForSlug` · `hasBookingForSlug` · `downscaleImageToDataUrl` (≤800px JPEG q0.7, canvas re-encode strip EXIF/script)
  - Components mới: `rating/tour-rating-badge.tsx` · `reviews/{customer-reviews,review-card,review-avatar,write-review-form,review-image-input}.tsx` (mọi file <200 dòng; **deviation**: tách `review-image-input` khỏi allow-list để giữ form <200) — token only `text-primary`/`bg-primary/10`, không hex/`red-*`
  - Badge 6 surface có slug: detail H1 (wrap flex justify-between) · `destination-card` · `map/page` list · `search-client` (slug chỉ khi `type === "destination"`) · `my-trips` row · `my-trips-detail` · 3 surface no-slug (itineraries×2, deals) **bỏ theo quyết định user** (badge sẽ render null → dead wiring)
  - Booking gating: `aria-disabled` wrapper + `pointer-events-none` + `disabled` mọi control; hint `writeReviewHint` chỉ hiện sau hydration khi **không** có booking `slug`-match (tránh flash false "not booked") · prefill author từ booking (0 input PII mới) · images ≤3, quota lỗi → `errorStorage` visible
  - i18n: `destinations.reviews.*` **14 keys × 2 file** (ratingAria/title/count/empty/writeReview/writeReviewHint/ratingLabel/commentPlaceholder/submit/submitting/submitSuccess/imagesHint/errorRequired/errorStorage)
  - Tests mới: `tests/unit/reviews.test.ts` (12 checks: isReview/formatRating/getAggregate/reviewsForSlug/hasBookingForSlug/SSR+corrupt/upsert+quota/delete) · `tests/browser/g-reviews.mjs` (**30 checks** `/vi/explore/destinations/hcm`: SSR-không-flash → gating → seed probe → submit 4★+ảnh → badge 4.0 → reload persist → upsert 5.0 1 card → `images[0]=data:image/jpeg` → cleanup)
  - Test fix: `c-booking.mjs` B6 `button[aria-pressed]` → scope `:not(#customer-reviews)` (star toggle mới dùng aria-pressed, không phải add-to-trip回归)
  - Verified: lint exit 0 · `npm test` **12/12** (parity EN/VI) · `npm run build` exit 0 · `npm run test:browser` **7/8** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET` trong process test, env pre-existing, không liên quan feature) · badge surface sweep 6/6 + không overflow 375px (detail/cards/map/search/my-trips/detail) · evidence `tests/.output/g-reviews-01..04.png`
  - Docs impact: minor (changelog này + plan statuses Complete)
- **[Feature] Homepage About Us section + trang `/contact` mới** (plan `260928-1428-about-us-section-contact-page`)
  - Header: bỏ nav item "About Us" (`header.tsx` — desktop+mobile chung 1 mảng); key `common.about` giữ nguyên (footer `:79` + sitemap `:87` vẫn dùng) · `/about` page + messages không đổi
  - Homepage: `AboutUsSection` chèn ngay sau `FeaturedDestinations` (50/50 text + CTA → `/contact` / `PromoVideo`) — 2 component mới `src/components/homepage/{about-us-section,promo-video}.tsx`; video là `<video poster=/images/promo-modal.png>` wired `public/videos/about-promo.mp4` **chưa có asset** → `onError`/`play()` reject → caption fallback, không crash
  - `/contact` mới: hero 5 node liên hệ (Phone/Email icon lucide + FB/IG/TikTok text chip — lucide không có brand icon; thứ tự hardcode `phone,email,facebook,instagram,tiktok`, label/value/href lấy từ i18n `contact.nodes.*` → placeholder swap không sửa code) + grid 50/50 form/info; metadata tĩnh `"Contact Us | DuanMar"`
  - Form: `react-hook-form` (dep mới duy nhất, **không zod**) — 4 field required, `mode:onBlur`, validate delegate sang `src/lib/contact-validation.ts` dùng chung client/server (patterns copy từ `booking-validation.ts`, key lỗi i18n-agnostic `{}` = hợp lệ, guard không coerce type); submit `fetch POST /api/contact` JSON → inline success `role=status` + `reset()` (không echo giá trị → không reflection XSS); lỗi → `role=alert`; `autoComplete` name/email/tel
  - API `/api/contact`: guard chain 415 (content-type) → 413 (>10KB) → 400 (JSON hỏng) → 400 (`errors` theo field) → 200 `{ok:true}`; `console.log` **masked** email/phone + độ dài field (không raw PII trong log); GET → 405 · **gap phi chức năng đã ghi nhận: chưa có rate-limit/captcha/persistence** (scope "No DB")
  - Link rewire: 7 href `/about/contact` → `/contact` (footer, sitemap page, support, accessibility, business-mice, privacy, trade) · `src/app/sitemap.ts` +`/contact` → sitemap.xml có `/en/contact` + `/vi/contact` · `about/contact/page.tsx` → stub **308** `permanentRedirect` (`src/i18n/navigation.ts` +1 export) — giữ URL sống vì search vẫn emit `/about/contact`; `grep '/about/contact' src/` chỉ còn comment trong stub
  - i18n: `home.aboutSection.*` (5 keys) + top-level `contact.*` (title/subtitle/nodes×5/form×14/info×3) × 2 file — parity test pass; search không quét namespace `contact` → không phát sinh kết quả ảo
  - Tests mới: `tests/unit/contact-validation.test.ts` (13 checks: valid/required từng field/pattern/cap 5000/non-object không throw/wrong type/mask) · `tests/browser/j-about-contact.mjs` (**37 checks** J1 header không còn `/about` desktop+sheet → J2 section đúng vị trí + CTA `/vi/contact` + video fallback → J3 5 node đúng scheme + >80px → J4 empty submit 4 lỗi + 0 POST / valid 1 POST JSON 200 → success + field cleared → J5 308 `/vi/contact`, `/vi/about` 200) — harness là **Puppeteer** (không getByRole/getByLabel → selector/`focus`+`keyboard.type`)
  - Verified: lint exit 0 · `npm test` **13/13** (parity EN/VI) · `npm run build` exit 0 · `npm run test:browser` **8/9** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing) · API curl 200/400/415/413/405 · evidence `tests/.output/j1-*.png`, `j2-about-section.png`, `j4-form-success.png`
  - Docs impact: minor (changelog này + plan statuses Complete)
- **[Feature] Review management: owner-only kebab menu + 3h time-gated edit + delete→rating recalc** (plan `260928-1508-review-management`)
  - Menu: `review-actions-menu.tsx` bespoke (`role="menu"` + `<button role="menuitem" disabled>` — Base UI `Menu.Item` không emit native `disabled`, research §4) hiện CHỈ khi review thuộc booking trên thiết bị (`isMyReview`, app không có auth; review mồ côi vẫn hiển thị, chỉ ẩn menu) · icon `EllipsisVertical` stroke-only (không phá assertion `svg.fill-current===4`/`img===1` của g-reviews) · trigger `aria-haspopup/aria-expanded` · outside-pointerdown + Escape đóng · Edit = scroll+focus form prefill · Delete → `window.confirm` → `deleteReview` → badge/list/count tự tính lại (derived, 0 thay đổi event)
  - Gate 3h: `GET /api/server-time` (`runtime=nodejs` + `force-dynamic`, build route `ƒ`) + `src/lib/edit-window.ts` (`EDIT_WINDOW_MS=10800000`, `isEditWindowExpired` boundary `>=`, invalid ISO/fetch lỗi → fail-closed) khóa CẢ menu Edit (native `disabled` + `opacity-50`, fetch server-time đúng 1 lần/mở menu — StrictMode-safe, không side-effect trong state updater) CẢ form prefill (`use-edit-window-gate.ts` keyed-verdict, hint `editWindowClosed`) · `saveReview` giữ `createdAt` gốc khi upsert (không thì gate tự kéo dài) · fix bug form thiếu `else`-clear sau khi xóa → prefill cũ có thể tái tạo review · **deviation**: form vượt 200 LOC → tách `use-write-review-state.ts` (prefill callback)
  - i18n `destinations.reviews.{menuLabel,menuEdit,menuDelete,deleteConfirm,editWindowClosed}` ×2 locale (19 keys parity) · review mồ côi sau "Xóa tất cả chuyến đi" → ẩn menu (không xóa được từ UI) — chấp nhận, đã ghi nhận · gate là UX window trên dữ liệu device-local, KHÔNG phải authorization
  - Tests: unit `edit-window.test.ts` (8 checks: 2h59/3h00/3h01, invalid ISO fail-closed, windowMs injectable, fetch 200/500/bad-payload/throw) + `reviews.test.ts` +2 (giữ `createdAt`, `isMyReview`) → **14 files** · browser `k-review-actions.mjs` (**25 checks** K1 ownership 1 trigger/orphan visible → K2 menu 2 menuitem + 0 aria-trap → K3 expired disabled+opacity 0.5+form gate → K4 dialog copy + badge 4.0→gone + storage rỗng → K5 form cleared/5 stars false → K6 0 pageerror + cleanup)
  - Verified: lint exit 0 · `npm test` **14/14** (parity EN/VI) · `npm run build` exit 0 (`ƒ /api/server-time`, curl 200 ISO tăng dần, POST 405) · `npm run test:browser` **9/10** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing) · `g-reviews` **all 30 checks passed** (0 assertion edit) · `k-review-actions` all 25 · evidence `tests/.output/k-review-actions-01..04.png`
  - Docs impact: minor (changelog này + plan statuses Complete)
- **[UI/Routing] Refactor navbar global: đúng 4 link + route `/tours/*` mới** (plan `260928-1628-global-navbar-refactor`)
  - Header: `navItems` (`header.tsx:11-17`, nguồn duy nhất cho desktop + mobile sheet) → đúng 4 item, đúng thứ tự: `Tour trong nước`→`/tours/domestic` · `Tour nước ngoài`→`/tours/international` · `Ưu đãi & Gói du lịch`→`/deals` · `Blog`→`/blog` · **purge 5 link cũ** (`/explore`,`/plan-your-trip`,`/culture`,`/news`; nav chỉ còn 4) — trang cũ + footer + sitemap + CTA homepage GIỮ NGUYÊN (key `common.explore/planTrip/culture/news` không đổi → footer `:47,63` + sitemap page không đổi, precedent bỏ "About Us" plan `260928-1428`)
  - i18n: +3 key `common.{domesticTours,internationalTours,blog}` ×2 file ("Domestic Tours"/"Tour trong nước", "International Tours"/"Tour nước ngoài", "Blog"/"Blog") · reuse `common.deals` (VI đã đúng "Ưu đãi & Gói du lịch", không sửa value tránh đụng footer/sitemap)
  - Route mới (foundational, static, **không fake data, không đổi Sanity schema** — dữ liệu hiện có 100% Vietnam-domestic, toàn repo không tồn tại field domestic/international): `src/app/[locale]/tours/{domestic,international}/page.tsx` (server comp + static metadata + ns `tours` ×2 locale; Domestic CTA → `/explore/destinations`; International honest empty-state "sắp ra mắt") · sitemap XML (`sitemap.ts` +2 route) + HTML sitemap discover group (+2 link, label từ `tc`)
  - Tests: NEW `tests/browser/l-navbar.mjs` **18 checks** (4 link đúng thứ tự/nhãn desktop + sheet, purge legacy ở toàn header, 4 href 200 + 4 h1 distinct + đúng i18n, search/my-trips giữ, 0 pageerror) · PATCH `j-about-contact.mjs:40-41`: 2 check cũ "header keeps /explore|/culture" (spec cũ) → "keeps /deals|/blog", giữ 2 check no-/about — assertion đổi theo spec, có ghi nhận (precedent F7/B6)
  - Verified: lint exit 0 · `npm test` **14/14** (parity EN/VI) · `npm run build` exit 0 (route table có 2 route mới) · `npm run test:browser` **10/11** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing) · curl `/vi`+`/en` tours domestic/international 200, h1 distinct, sitemap.xml 4 hits · `git diff g-header.mjs` rỗng · evidence `tests/.output/l-navbar-01..02.png`
  - Docs impact: minor (changelog này + plan statuses Complete)
- **[UI/Branding] Logo trong suốt + refactor footer navigation** (plan `260928-1835-transparent-logo-footer-refactor`)
  - Asset: `D:\logo duanmar.jpg` (1024² nền đen vuông) → script `plans/.../scripts/make-transparent-logo.py` (Pillow, mask tròn anti-alias supersample 4x, alpha=0 ngoài badge, đĩa đen bên trong GIỮ NGUYÊN) → `public/images/logo-duanmar.png` 512² RGBA · script + nguồn copy nằm trong plan dir (không thêm dep)
  - Header (`header.tsx:25-35`): lockup mới `Link aria-label="DuanMar"` = `<BrandLogo size={36} priority>` (`brand-logo.tsx` mới, `next/image`) + overlay `span[aria-hidden]` font-brand 7px **opacity 0.35** absolute trên emblem (không che chi tiết) + `BrandWordmark` solid bên cạnh · giữ nguyên `href="/"` → `l-navbar`/`j-about-contact` không đổi
  - Footer (`footer.tsx`, 127 LOC): bỏ 3 cũ (explore/plan/about) → **Brand block (logo + wordmark + tagline, `col-span-2 md:col-span-1`) + Tour du lịch + Liên hệ + Thông tin** · A: reuse `common.domesticTours/internationalTours` → `/tours/{domestic,international}` (**deviation**: không dùng chữ "Tour nội địa" để đồng nhất navbar) · B: `contact.nodes.{phone,email,facebook,instagram,tiktok}` qua `tc.raw` = **single source of truth với `/contact`** (href byte-equal, socials `target=_blank rel="noopener noreferrer"`, tel/mailto cùng tab) · C: `Cách đặt tour`→`/support`, `Bài viết`→`/blog`, `Tuyển dụng`→`/about/careers` · bottom bar giữ nguyên · key mồ côi `footer.{visaInfo,gettingAround,accommodation,healthSafety}` GIỮ (còn parity test, xóa là việc khác)
  - i18n: +4 key `footer.{tours,info,howToBook,articles}` ×2 file ("Tours"/"Tour du lịch", "Information"/"Thông tin", "How to Book"/"Cách đặt tour", "Articles"/"Bài viết") → parity pass
  - Tests: NEW `tests/browser/m-footer-brand.mjs` **24 checks** (H1-H5 header lockup/overlay opacity/no-overflow · F1-F10 4 block + title đúng thứ tự VI/EN + Col B href byte-equal `contact.nodes` + F6 target/rel + F9 bottom bar + F10 hết link cũ · R1 5 route 200 · cookie `NEXT_LOCALE` ghim locale vì `document.documentElement.lang` KHÔNG tồn tại trong HTML) · 0 test cũ sửa
  - Verified: lint exit 0 · `npm test` **14/14** · `npm run build` exit 0 (dev server dừng khi build) · `npm run test:browser` **11/12** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing) · evidence `tests/.output/m-brand-01..03.png`
  - Docs impact: minor (changelog này + plan statuses Complete)

### Added
- **[UI/Feature] Review image lightbox + heading "Form liên hệ" trên `/contact`** (plan `260928-1915-review-lightbox-contact-heading`)
  - AC1 lightbox: thumb ảnh review trong `review-card.tsx` → `<button data-testid="review-image-thumb">` (state `activeImage` per-card, aria-label đính index `1/n` để SR phân biệt ảnh) mở component mới `src/components/reviews/review-image-lightbox.tsx` (47 dòng, Base UI `Dialog` reuse `ui/dialog.tsx`, portal, `data-slot="review-lightbox"`, `closeSlot="review-lightbox-close"`, sr-only `DialogTitle`, plain `<img>` src=data URL, panel override `w-[min(96vw,64rem)] max-h-[92vh]`) · **single-image only** (0 prev/next/swipe/zoom — YAGNI) · lightbox render làm sibling của `<article>` → `g-reviews.mjs:220-221` (1 `img`/card) không đổi · thumb KHÔNG có `aria-pressed` (đúng contract `c-booking.mjs:48-49`)
  - AC2 heading: `<h2 id="contact-form-heading">` là **child đầu tiên** của `form[data-testid="contact-form"]` (`contact-form.tsx:94,99-104`) + `aria-labelledby` trên `<form>` · i18n `contact.formHeading` = `"Contact Form"`/`"Form liên hệ"` · 0 `role=alert`/button mới → contract `j-about-contact` (đúng 4 alert, 1 POST 5 key) giữ nguyên
  - Search fix: `search/page.tsx:116` `slug === "contact" ? "/contact"` → không còn emit `/about/contact` trong index · 308 stub `about/contact/page.tsx` GIỮ (`j-about-contact.mjs:159-164` assert) · Phone/Gmail card = verify-only (đã render `contact/page.tsx:39-64`)
  - i18n: +4 key ×2 file (`destinations.reviews.{lightboxClose,lightboxTitle,lightboxImageAlt}` + `contact.formHeading`) → parity pass
  - Tests: NEW `tests/browser/n-lightbox-contact.mjs` **27 checks** (seed 2 review: canvas JPEG data URL + không ảnh → thumb button semantics → card `img` invariant → portal `src` khớp → close/Escape/backdrop đóng → homepage CTA `/vi/contact` → 5 contact-node → heading đúng thứ tự + copy verbatim VI/EN → 4 alert/0 POST → 1 POST payload đúng 5 key → field cleared → search `/en/contact` + 0 `/about/contact` → 0 pageerror, cleanup `VN-N-*`)
  - Verified: lint exit 0 · `npm test` **14/14** · `npm run build` exit 0 (dev dừng khi build) · `npm run test:browser` **12/13** (fail duy nhất `revalidate-webhook` = env pre-existing, không sửa test cũ) · evidence `tests/.output/n-lightbox-01-open.png`, `n-contact-01-heading-vi.png`
  - Docs impact: minor (changelog này + plan statuses Complete)

### Changed
- **[UI/UX] Footer: phóng to wordmark thương hiệu + thu gọn khoảng cách cột** (plan `260928-2030-footer-brand-type-column-gaps`)
  - AC1: `footer.tsx:34` `BrandWordmark className="font-semibold"` → `text-4xl md:text-5xl font-bold tracking-tight leading-none` = **36px mobile (225%) / 48px desktop (300%)** của baseline 16px (preflight `h3 font-size:inherit`) · `leading-none` (lh 1.0) + `tracking-tight` (-1.2px) + Sora 700 theo chuẩn display-type `hero-section.tsx:37` · sửa **call-site footer thôi**, `brand-wordmark.tsx` không đổi → header 20px giữ nguyên · logo 44px + tagline + `<h3 className="mb-4">` (text `DuanMar`) giữ nguyên
  - AC2: `footer.tsx:30` `grid grid-cols-2 md:grid-cols-4 gap-8` → `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1fr_auto_auto_auto] md:gap-x-6` — 3 cột nav chuyển sang track `max-content` + gap 32→24px → **cụm nav ~928→313px @1280 (74%→25% bề rộng grid)** áp dụng cả desktop + tablet; cột brand `1fr` hút hết khoảng trống → cụm nav áp sát phải; mobile giữ `grid-cols-2` + brand `col-span-2`
  - Contract giữ nguyên: `footer .grid` vẫn đúng **4 children trực tiếp** + thứ tự, class `grid`/`mt-8` literal → `m-footer-brand.mjs` **24/24** (0 assertion sửa, 0 test cũ sửa)
  - Tests: NEW `tests/browser/o-footer-refinement.mjs` **19 checks** (O1 4 children + title order · O2 font-size 1280 ∈[32,48] và ≥ header · O3 tracking/line-height/weight · O4 width 215px + không tràn cột · O5 gap 24px ×2 + cluster ≤55% @1280 · O6 gap 24px + 0 overflow @768 · O7 0 overflow @375 + `col-span-2` nguyên + 36px · O8 logo/tagline/bottom bar · O10 0 pageerror) — ba viewport chụp `o-footer-01..03.png`
  - Verified: lint exit 0 · `npm test` **14/14** · `npm run build` exit 0 (dev dừng khi build) · `npm run test:browser` **13/14** (fail duy nhất `revalidate-webhook` = env pre-existing) · evidence `tests/.output/o-footer-01-1280.png`, `o-footer-02-768.png`, `o-footer-03-375.png`
  - Docs impact: minor (changelog này + plan statuses Complete)

### Added
- **[CMS/Feature] Mở rộng schema `destination` + lọc danh mục `/tours/*`** (plan `260928-2105-cms-tour-attributes-category-filter`)
  - AC1 schema (`src/sanity/schemaTypes/destination.ts`): + `difficultyLevel` enum optional (`easy|medium|hard|extreme`) · + `isSpecialTour` boolean `initialValue:false` · + `category` **required** enum `domestic|international` (title song ngữ "Trong nước (Domestic)"/"Nước ngoài (International)", `initialValue:"domestic"`) đặt ngay sau `region` — doc legacy chưa backfill sẽ **chặn publish khi mở sửa** (chấp nhận, editor tự backfill ở Studio) · `sanity schemas validate` 0 errors/0 warnings
  - AC3 query (`src/sanity/queries/destinations.ts`): NEW `DESTINATIONS_BY_CATEGORY_QUERY` — GROQ **không có toán tử ternary `?:`** (parse error 400 đã bắt khi smoke) → thay bằng boolean `($category=="international" && category=="international") || ($category!="international" && (!defined(category) || category=="domestic"))` = strict quốc tế, tolerant nội nước cho doc chưa có `category` · 3 query hiện có (`DESTINATIONS_QUERY`, `DESTINATION_BY_SLUG_QUERY`, `FEATURED_DESTINATIONS_QUERY`) chỉ **MỞ projection** +`difficultyLevel,isSpecialTour`, KHÔNG thêm param → 3 call-site `{region}`/`{slug}` (destinations/search/map/detail) không đổi
  - AC2/AC3 UI: `src/components/tours/tour-category-section.tsx` (server, 93 dòng) = pill `<nav aria-label="Tour category">` 2 `Link` + `aria-current="page"` (precedent `explore/events`) + `Promise.all` fetch category + pricing + i18n, grid copy listing (`DestinationCard` + `priceRange`) + empty-state `tours.empty` khi 0 kết quả · `src/components/explore/tour-attribute-badges.tsx` (client, 44 dòng) **null-gated**: render chip `difficulty.<level>`/`special` CHỈ khi field có dữ liệu, dùng chung cho card (region row) + detail (chip row trước `BookTicketButton`) → card listing/homepage giữ nguyên layout khi chưa backfill · 2 trang tours: chỉ thêm `<TourCategorySection>`, h1/subtitle/body/CTA **giữ nguyên** (contract `l-navbar:73`) · booking form không đổi
  - i18n: +6 key ×2 file (`tours.empty` = "No destinations in this category yet."/"Chưa có điểm đến nào trong danh mục này." + `destinations.difficulty.{easy,medium,hard,extreme}` = Easy/Medium/Hard/Extreme · Dễ/Trung bình/Khó/Cực khó + `destinations.special` = "Special tour"/"Tour đặc biệt") → parity **789/789** · nhãn tab reuse `common.{domesticTours,internationalTours}` (0 key nav mới)
  - Tests: NEW unit `tests/unit/tour-category-queries.test.mts` (**16 contract checks**, 0 network: + no-ternary/balanced-paren GROQ parse guard, param/strict/tolerant branch, projection +2 field, call-site safety `$region` còn `$category` vắng, slug queries nguyên vẹn) → runner **15/15** · NEW browser `tests/browser/p-tours-category.mjs` (**22 checks**, data-driven GROQ live qua unauthenticated API: set-equality slugs lọc 2 danh mục (domestic = `category=="domestic"||absent`, international strict) → hôm nay `["hcm","hcmc","nyc"]` vs `[]` + empty-state, no-leak 2 chiều, h1 VI/EN đúng i18n, tab nav + `aria-current` 2 chiều, badge fallback (0 doc flagged → 0 chip), listing/detail 200 + SSR `#customer-reviews` + h1 khớp live CMS `name`, chip-row detail khớp data (P18), status thật `resp.status()`, 0 pageerror) — **không fake data, 0 sửa test cũ**
  - Verified: lint exit 0 · `npm test` **15/15** · `npm run build` exit 0 (route `ƒ /[locale]/tours/domestic` + `ƒ /[locale]/tours/international`, không `●`/`○`) · `npm run test:browser` **14/15** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing, không sửa) · `sanity schemas validate` 0 errors · evidence `tests/.output/p-tours-01-domestic.png`, `tests/.output/p-tours-02-international.png`
  - Docs impact: minor (changelog này + plan statuses Complete)

### Changed
- **[Fix/Refactor] Booking form: gắn "Cấp độ thử thách" với toggle `isSpecialTour` + gỡ `difficultyLevel` khỏi schema** (plan `260928-2255-booking-challenge-level-tied-to-isSpecialTour`)
  - Root cause: `booking-form.tsx:151` render Section 4 vô điều kiện + `booking-validation.ts:84` bắt buộc `difficulty` + `booking-summary.tsx:64` luôn lưu `difficulty` — không nối với cờ `isSpecialTour` dù `checkout/page.tsx:31` đã fetch sẵn qua `DESTINATION_BY_SLUG_QUERY` (cờ cách 1 prop)
  - AC2: `checkout/page.tsx` truyền `isSpecialTour={destination.isSpecialTour === true}` → `BookingForm` render `<BookingDifficultySection>` **CHỈ khi `true`** (tour thường = đúng 3 section: liên hệ/ngày/khách) · `validateBooking(values, capacity?, isSpecialTour?)` gate rule `difficultyRequired` theo cờ (`=== true`; mặc định vắng cờ = standard)
  - AC3: "payload" = bản ghi localStorage `vn-my-trips:v1` (key `difficulty`, không có API booking) — tour thường **không còn key nào** (`booking-summary.tsx` conditional spread `...(isSpecialTour && { difficulty })`) · `TripBooking.difficulty?` optional + `isTripBooking` nhận record thiếu key (chặn bug record mới bị lọc khỏi My Trips = mất dữ liệu) nhưng vẫn lọc type sai (`difficulty: 123` → out) · `buildTicketRows` bỏ dòng difficulty khi value rỗng (sửa luôn record legacy `difficulty:""`) · `my-trips-detail` `difficulty ?? ""`
  - AC1 (hard remove): schema `destination.ts` gỡ field `difficultyLevel` (14 dòng), giữ `isSpecialTour` (đổi description → "…shows the Challenge Level (Cấp độ thử thách) step in the booking form") · 4 GROQ projection bỏ `difficultyLevel`, giữ `isSpecialTour` · `tour-attribute-badges.tsx` chỉ còn chip `special` · `Destination` interface + 2 pass-through (card, detail) gỡ · i18n bỏ `destinations.difficulty.{easy,medium,hard,extreme}` ×2 file (booking namespace `easy/medium/hard` riêng — giữ cho select ở special branch) → parity **785/785**
  - Tests — sửa test cũ theo spec, có ghi nhận (precedent F7/B6/j-about-contact): `c-booking.mjs` data-driven `SPECIAL` (fetch live `isSpecialTour` của hcm qua GROQ inline, envValue + `.env.local` fallback): section count `SPECIAL?4:3`, error `SPECIAL?5:4`, difficulty interactions/summary conditional + field-present assertion · **NEW `B13`** e2e nhánh standard trên `hcmc` (flag cũng fetch live, self-healing cleanup localStorage): 3 section, 0 `#booking-difficulty`, empty submit 4 errors, 0 lỗi "độ khó", summary không có row `Độ khó`, **submit + mock-payment → record `vn-my-trips:v1` không có key `difficulty`** (chứng minh trực tiếp AC3) · `f-ui`/`c-payment`/`d8-a11y` skip-guard 1 dòng khi selector vắng · `booking-logic.test.ts` bỏ "difficulty always required" → required-only-special +3 check mới (`empty form special`, `buildTicketRows` omit row, `listBookings` giữ record thiếu key/lọc type sai) = **16/16** · `tour-category-queries` 16→14 (bỏ 2 check projection positive, 2 check chuyển negative, +1 negative trong loop) · `p-tours` bỏ `LEVELS` + difficulty branches (P14/P18 special-only, GROQ bỏ field) — lockstep: sửa test TRƯỚC khi xoá i18n key
  - Verified: `sanity schemas validate` 0 errors/0 warnings · lint exit 0 · `npm test` **15/15** · `npm run build` exit 0 (`ƒ /[locale]/booking/checkout`, dev dừng khi build, restart sau) · `npm run test:browser` **14/15** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing, không sửa) · `c-booking` **31/31** (special `hcm` + standard `hcmc` + paid-record AC3), `p-tours` 22/22, `f-ui`/`c-payment`/`d8-a11y` xanh · dữ liệu live: `hcm.isSpecialTour=true` (nhánh special), `hcmc=null` (nhánh standard) — cả 2 nhánh đều được e2e · code review `DONE_WITH_CONCERNS` → P2 (thiếu test shape record) đã sửa bằng B13 paid-record check
  - Docs impact: minor (changelog này + plan statuses Complete)
- **[UI/UX/Footer] Co giãn logo 88px + bố cục bất đối xứng footer** (plan `260928-2223-footer-logo-scale-asym-layout`)
  - AC1: `footer.tsx:32` `<BrandLogo size={44}>` → `size={88}` **chỉ ở call-site footer** — `brand-logo.tsx` (default 36) + `header.tsx` không đụng → logo top-left cân wordmark 48px; 0 sửa test cũ
  - AC2/AC3: grid `:30` → `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` + col-starts (brand `md:col-start-1:31`, tours `md:col-start-3:39`, contact `md:col-start-4:55`, info `md:col-start-5:79`) → X=24px giữa các cột nav, brand→nav = 2X=48px (tỷ lệ 2.00 đo được), track `0.5fr` cuối giữ cụm nav **không áp sát mép phải** (right margin 312px @1280, 141px @768); mobile giữ `grid-cols-2` + brand `col-span-2`
  - Contract giữ nguyên: `footer .grid` đúng 4 children + thứ tự title → `m-footer-brand.mjs` **24/24**, `o-footer-refinement.mjs` **19/19** (O5a 24≤25, O4b wordmark còn dư cột) — **0 assertion sửa**
  - Tests: NEW `tests/browser/q-footer-asym-layout.mjs` **20 checks** (Q1a/Q1b logo 88×88±2 @1280/@375 · Q2–Q4 gap 48/24/24 ±2 · Q5 tỷ lệ 2.00 ∈[1.9,2.1] · Q6 Δ tâm cụm +156≥50 · Q7 right margin 312≥60 · Q8 cấu trúc 4 children + title order · Q9–Q10 wordmark 48px không tràn cột · Q11 logo+tagline · Q12–Q13 md gap + margin · Q14–Q16 mobile overflow/spans/logo · Q17 brand trái nav · Q18 0 pageerror) — ảnh `q-footer-01..03.png`, chạy tách + trong suite đều xanh
  - Verified: lint exit 0 · `npm test` **15/15** · `npm run build` exit 0 (dev dừng khi build, restart sau) · `npm run test:browser` **15/16** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing, không sửa; 16 file = + `q-footer`) · eyeball 3 viewport: bất đối xứng + margin phải đúng, 0 tràn
  - Docs impact: minor (changelog này + plan statuses Complete)
- **[CMS/Feature] Promo modal CMS-driven: singleton `siteConfiguration` + server fetch** (plan `260928-2320-promo-modal-cms-driven`)
  - AC1 schema: NEW `src/sanity/schemaTypes/site-configuration.ts` (`siteConfiguration`, "Site Configuration") — `entryPopupImage` image hotspot optional (title "Promo Modal Asset") + `enableEntryPopup` boolean `initialValue:true` (mô tả: tắt là ẩn entry popup) · register `schemaTypes/index.ts` (4 → 5 type — precedent `changelog:21`) · `structure.ts` singleton item ĐẦU TIÊN `S.listItem().id('siteConfiguration').schemaType('siteConfiguration').child(S.document()…)` + `.filter()` khỏi `documentTypeListItems()` (title "Content" giữ nguyên; `S.document()` thẳng bị `tsc` reject kiểu list item → dùng listItem+child) · `sanity schemas validate` 0 errors/0 warnings
  - AC2: NEW `src/sanity/queries/site-configuration.ts` (`*[_type=="siteConfiguration"][0]{ enableEntryPopup, entryPopupImage { imageFragment } }`, 0 param, no ternary) · `src/app/[locale]/layout.tsx` (server) `fetchPublished(…, {tags:["sanity:siteconfig"]})` → props `imageSrc` + `width/height` từ `asset.metadata.dimensions` (fallback 1200×800) + `enableEntryPopup` → `promo-modal.tsx` render `<Image src={asset.url}>`, alt giữ i18n `promo.imageAlt` (0 key mới) — hardcode `/images/promo-modal.png` bỏ khỏi modal, **FILE GIỮ** (còn là poster `promo-video.tsx:8`)
  - AC3: `enableEntryPopup === false || !imageSrc` → return **null** (vắng doc / vắng ảnh / false rõ ràng = ẩn; không broken img, không hộp rỗng) — chứng minh trực tiếp ở lượt chạy đầu (0 doc → 5/5 disabled checks), sau đó marketing publish doc + ảnh 1376×768 (18:17Z) → 8/8 enabled checks
  - Tests: NEW unit `tests/unit/site-configuration-query.test.mts` (7 contract checks, 0 network) + NEW browser `tests/browser/r-entry-popup-cms.mjs` (**data-driven** trên doc live — không hardcode mode: enabled → modal ×1 + img decode ra CDN asset (không bao giờ `/images/promo-modal.png`) + attrs khớp metadata + alt i18n + close dismiss + nav hoạt động; disabled/absent → 0 promo + 0 overlay sau 3s + nav hoạt động; `R4` chờ ảnh CDN load có bound thay vì đua `naturalWidth`) · **spec-change**: `tests/helpers/promo.mjs` `timeout:10000` → `2000` (39 call sites × 10s ≈ 6.5 phút suite burn khi modal vắng → 78s worst case; fast path giữ nguyên khi modal hiện; precedent F7/B6/j-about-contact) — 0 sửa test khác
  - Verified: lint exit 0 · tsc 0 errors · `npm test` **16/16** · `npm run build` exit 0 (dev dừng khi build, restart sau) · `npm run test:browser` **16/17** (fail duy nhất `revalidate-webhook` = env pre-existing, không sửa; 17 file = + `q-footer` + `r-entry-popup`) · `sanity schemas validate` 0 errors · r-test standalone 5/5 (disabled, trước publish) + 8/8 (enabled, sau publish) · evidence `tests/.output/r-entry-popup-01-enabled.png`
  - Docs impact: minor (changelog này + plan statuses)

## 2026-09-29

### Changed
- **[UI/UX/Promo] Entry promo modal frameless + size +20% + X chip overlay** (plan `260929-1440-promo-modal-frameless-resize`)
  - AC1 frameless: `promo-modal.tsx` truyền `className="w-[min(90vw,50.4rem)] border-0 bg-transparent p-0 shadow-none"` vào `DialogContent` → bỏ hẳn khung trắng card (padding/border/shadow = 0, nền trong suốt) · ảnh `rounded-lg` → `rounded-xl` khớp radius container (14px) → ảnh tràn **edge-to-edge**, 0 seam góc
  - AC2 kích thước: `w-[min(92vw,42rem)]` (672px) → `w-[min(90vw,50.4rem)]` = **806.4px @1280 (+20% chính xác)** · cap 90vw ở tablet/mobile (691.2px @768, 337.5px @375, không vượt viewport) · `max-h-[80vh] overflow-y-auto` giữ nguyên
  - AC3 close X: giữ vị trí `top-2 right-2` (overlay trên ảnh, nửa phải, luôn trong bounds) · chip tối `bg-black/60 text-white border-0 hover:bg-black/80 focus-visible:ring-white/60` thay `bg-card` viền trắng · implement bằng prop mới **`closeClassName`** ở `src/components/ui/dialog.tsx` (optional; default = class cũ → `cn()` không đổi string → `review-image-lightbox` + mọi dialog khác **byte-identical**; twMerge ghi đè đúng nhóm class: p-3→p-0, bg-card→bg-transparent, border→border-0, shadow-soft→shadow-none, w-[…]→w-[…])
  - Tests: `tests/browser/r-entry-popup-cms.mjs` +3 checks trong nhánh enabled — **R12** computed style (padding 4 bên `0px`, `background-color: rgba(0,0,0,0)`, `border-top-width: 0px`) · **R13** geometry (width ±2px = 806.4 và ≤ 90vw viewport) · **R14** close chip (visible, bounding box nằm trọn trong ảnh + nửa phải, bg alpha ≥ 0.5, icon trắng) · screenshot mới `r-entry-popup-02-frameless.png` · **R1–R11 giữ nguyên, 0 sửa** · `dismissPromo` (39 call sites / 14 file) không đổi selector → suite khác tự kiểm chứng
  - Verified: lint exit 0 · `npm test` **16/16** · `npm run build` exit 0 (dev dừng khi build, restart sau) · `node tests/browser/r-entry-popup-cms.mjs` **11/11** (enabled) · `npm run test:browser` **16/17** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing, không sửa) · smoke 3 viewport: 806.4 / 691.2 / 337.5px, padding 0, bg transparent, X chip alpha 0.6 white icon — evidence `tests/.output/promo-smoke-{1280,768,375}.png` + `r-entry-popup-02-frameless.png`
  - Docs impact: minor (changelog này + plan statuses + report)
- **[Feature] About Us video động từ Studio CMS — background autoplay + poster fallback** (plan `260929-1500-about-us-video-cms`)
  - AC1 schema: `src/sanity/schemaTypes/homepage.ts` +3 field trên doc `homepage` (doc live đã có `title`/`heroTitle`) — `aboutUsVideo` (**file**, `accept:"video/mp4,video/webm"`, thắng URL khi có cả hai) · `aboutUsVideoStreamUrl` (**url**, nguồn ngoài) · `aboutUsVideoPoster` (**image** hotspot) · `sanity schemas validate` **0 errors** · 0 field mới trên `siteConfiguration`
  - AC2 binding: `HOMEPAGE_QUERY` mở rộng projection (**0 param**, call-site `{}` không đổi) `aboutUsVideo{asset->{url}}` + `aboutUsVideoStreamUrl` + `aboutUsVideoPoster{asset->{url,metadata{dimensions{width,height}}}}` · `page.tsx` map `videoSrc = file url ?? streamUrl`, `posterSrc = poster url ?? null` → props `AboutUsSection` → `PromoVideo` · cache tag `sanity:homepage` sẵn có (webhook revalidateTag + TTL 300s)
  - AC3 player: `promo-video.tsx` viết lại — `<video autoPlay muted loop playsInline preload="metadata" poster aria-label onError>` **background autoplay**, gỡ bỏ hoàn toàn overlay click-to-play (`CirclePlay`, `useRef`, `play()`) · không có video trong CMS → `<Image fill>` poster (`aboutUsVideoPoster` → fallback local `/images/promo-modal.png`) cùng khung `aspect-video` → **grid 50/50 không đổi** (không suppress) · video đã cấu hình nhưng load lỗi → poster + caption `aboutSection.videoFallback` (i18n giữ nguyên, **0 key mới**, parity 789/789)
  - Tests: NEW unit `tests/unit/homepage-about-video-query.test.mts` (10 checks: 3 field projection, 0 param, hero giữ nguyên, no-ternary/balanced-paren, FEATURED không ảnh hưởng, schema text assert) → runner 16→**17 files** · **rewrite J2** trong `j-about-contact.mjs` (bỏ contract cũ "play button → caption" = lock bug mp4 thiếu; mới **data-driven** query live `homepage` doc — pattern `p-tours`): media query OK · 0 overlay `[data-testid=about-promo-play"]` · có `videoSrc` → `<video>` src khớp CMS + đủ 4 attr autoPlay/muted/loop/playsInline · không có → `<img>` poster lấp slot, 0 `<video>` · CTA/vị trí section/slot giữ nguyên
  - Verified: lint exit 0 · `npm test` **17/17** · `npm run build` exit 0 (dev dừng khi build, restart sau) · `node tests/browser/j-about-contact.mjs` exit 0 (**34 ok, 0 FAIL**) · `npm run test:browser` **16/17** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing) · smoke live `/vi`: poster `promo-modal.png` render 598×336 trong slot, `grid-cols 600px 600px`, 0 play button, 0 pageerror — ảnh `tests/.output/about-video-smoke.png`
  - Thuộc người dùng (post-deploy): mở `/studio` → doc **Homepage** → upload video (MP4/WebM) hoặc dán stream URL + poster → homepage tự phát (muted/loop) trong ≤300s hoặc ngay khi webhook `revalidateTag` chạy; nhánh `<video>` của J2 tự kích hoạt (hiện CMS chưa có video → nhánh poster đang xanh)
  - Docs impact: minor (changelog này + plan statuses + report)
- **[Feature] Tour detail hero carousel tự động phát + thu nhỏ khung −20%** (plan `260929-1537-tour-detail-hero-carousel`)
  - AC1 schema: `src/sanity/schemaTypes/destination.ts` **thay `image` bằng `galleryImages`** (`array` of image hotspot, `rule.min(3).required()`), preview `media: "galleryImages"` · `sanity schemas validate` **0 errors** · GROQ giữ nguyên projection `image { … }` **legacy fallback** (D1: không card nào về trống khi CMS chưa có gallery) + thêm `galleryImages[] { … }` (có **dấu phẩy** — GROQ parse error nếu thiếu) ở 4 query: `destinations.ts` ×3 + `homepage.ts` FEATURED · helper `src/lib/destination-gallery.ts`: `pickCoverImage` (gallery[0] ?? image) + `pickGalleryImages` (gallery, rỗng → [image])
  - AC2 carousel: NEW `src/components/explore/destination-hero-carousel.tsx` (client island) — autoplay **3000ms**, translateX + `transitionDuration 700ms` `cubic-bezier(0.4,0,0.2,1)`, **clone slide 0** cho vòng lặp 1→2→3→1 liền mạch (snap về index 0 khi clone vào vị trí, tắt transition 1 frame) · pause hover/focus · `prefers-reduced-motion` tắt autoplay · dot `aria-current` (**không** `aria-pressed` — bất biến c-booking B6) · ảnh slide 0 `priority`, còn lại `loading="eager"` · detail page `explore/destinations/[slug]` gắn component + resolve gallery (fallback legacy image)
  - AC3 sizing: hero `aspect-video` (0.5625w = 702px@1248) → **`aspect-[20/9]`** (0.45w = **562px, đúng 80%**) + shell `py-16`→`py-8` (D3) · đo live @1280×900: hero 145→707, CTA **739**, h1 **779**, PriceBlock **887** — **tất cả trên fold** (trước: CTA 911, price 1059 dưới fold) · selector `main .mt-8 > div` (p-tours P18) giữ nguyên
  - Tests: NEW unit `destination-gallery.test.mts` (query projection ×4 + legacy + param safety + **groq-js parse toàn bộ query** — bắt đúng bug thiếu phẩy đã gặp + schema source + 2 helper contract) + extend `tour-category-queries.test.mts` → runner 17→**18/18** · NEW browser `s-tour-hero-carousel.mjs` (**12 checks data-driven** theo `count(galleryImages[])` live: ≥2 → clone+dots+autoplay 3s+full cycle; =0 → static fallback · ratio 0.44–0.46 · CTA/h1/price < vh · `.mt-8` intact · 0 `aria-pressed` · mobile 375×812 ratio) → suite 17 files
  - Verified: lint exit 0 · `npm test` **18/18** · `npm run build` exit 0 · `npx sanity schemas validate` 0 errors · `npm run test:browser` **16/17** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing; `s-tour-hero-carousel` **12/12 ok**) · i18n thêm 1 key `destinations.slideLabel` (en+vi, parity giữ) · backfill NEW `scripts/backfill-destination-gallery.mjs` (`migrate:destination-gallery`, dry-run **3 pending**: image → galleryImages[0]) — `--apply` chờ `SANITY_WRITE_TOKEN`
  - Thuộc người dùng (post-deploy): Studio → destination → upload ≥2 ảnh nữa vào Gallery (min-3 validation) → carousel autoplay + test S2 multi-branch tự kích hoạt · `SANITY_WRITE_TOKEN` để chạy backfill
  - Docs impact: minor (changelog này + plan statuses + report)
- **[Feature] Promo popup đa ngôn ngữ (popupImage_vi/_en) + re-trigger khi đổi EN/VI** (plan `260929-1617-i18n-promo-popup`)
  - AC1 schema: `src/sanity/schemaTypes/site-configuration.ts` +fieldset `popup` +2 field **`popupImage_vi` / `popupImage_en`** (image, hotspot) · `entryPopupImage` **giữ lại** (D1 fallback, description rõ thứ tự) · `sanity schemas validate` **0 errors** · `SITE_CONFIGURATION_QUERY` +2 projection (đủ dấu phẩy), vẫn **0 `$` param** / no ternary / balanced paren
  - AC2 binding: `src/app/[locale]/layout.tsx` — `getLocale()` + chuỗi fallback **D2: `popupImage_<locale>` → `entryPopupImage` → field locale còn lại → null** · `popupSrc/width/height` đọc từ asset đã chọn (default 1200×800 giữ) · `PromoModal` **0 prop mới**
  - AC3 re-trigger: `promo-modal.tsx` — `useLocale()` + `useEffect(…, [locale])` (thay mount-only `[]`) → mở lại tức thì mỗi lần toggle EN/VI trong cùng soft navigation (segment `[locale]` remount hoặc cùng instance đều chạy effect) · không reload trang · không persistence (YAGNI giữ nguyên) · 0 i18n key mới (parity giữ)
  - Tests: unit `site-configuration-query.test.mts` +3 checks (`popupImage_vi {`/`popupImage_en {` + **groq-js parse**) → runner **18/18** · browser `r-entry-popup-cms.mjs`: GROQ + derivation 3 field theo đúng chuỗi D2 (mirror layout), R3/R4 so khớp asset VI đã chọn, **+R15** (click EN ở header → path `/en/...`, modal count=1, src khớp asset EN, alt `msg.en.promo.imageAlt` EN, marker no-reload=1) **+R16** (quay về VI tương ứng) → **13/13 checks**
  - Verified: lint exit 0 · `npm test` **18/18** · `npm run build` exit 0 (dev dừng/restart) · schema 0 errors · `npm run test:browser` **16/17** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing) · smoke live: mở → đóng → EN mở lại → đóng → VI mở lại, 0 pageerror, marker sống sót (không reload) — ảnh `tests/.output/promo-i18n-smoke.png` + `r-entry-popup-03-locale-en.png`
  - Thuộc người dùng (post-deploy): Studio → Site Configuration → upload ảnh popup riêng cho `popupImage_vi` và `popupImage_en` (hiện live chỉ có `entryPopupImage` → cả 2 locale dùng chung asset cũ, R15/R16 vẫn xanh nhờ fallback); ảnh per-locale tự kích hoạt khi upload
  - Docs impact: minor (changelog này + plan statuses + report)
- **[Bugfix] Footer nav typography +150% & layout redistribution** (plan `260929-1700-footer-nav-typography-layout`)
  - Root cause: grid `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` thả cột nav theo `auto` → cụm 313px (25% grid) dồn gần giữa, `0.5fr` trailing = 312px chết bên phải @1280; heading không có `text-*` (inherit 16px), link `text-sm` (14px)
  - Fix (`src/components/layout/footer.tsx`): grid → `md:grid-cols-[minmax(210px,1.5fr)_0_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(64px,0.35fr)]` (giữ track `0` + gap 24px → brandGap 48, tỉ lệ 1:2, bất đối xứng center-right nguyên vẹn) · `<h3>` → `text-2xl font-semibold mb-5` (×1.5) · link → `text-lg` (×1.29) · `space-y-2` → `space-y-3`
  - Contract sửa có duyệt (1 dòng): `o-footer-refinement.mjs` **O5b** cluster cap `0.55` → `0.65` (cho phép spread ~2.5×); mọi assertion khác giữ nguyên
  - Verified: `m-footer-brand` **24/24** · `o-footer-refinement` **19/19** · `q-footer-asym-layout` **20/20** · lint 0 · unit **18/18** · build 0 · schema 0 errors · suite **17/17 trừ revalidate env** (fail duy nhất = `SANITY_REVALIDATE_SECRET` pre-existing) · ảnh `tests/.output/footer-typography-{1280,768,375}-vi.png` + `-1280-en.png`
  - Supersedes AC2/AC3 của plan `260928-2030` + `260928-2223` (cụm compact/0.5fr cố định) theo yêu cầu hiện tại; docs impact: minor
- **[Bugfix] Tour detail hero carousel: endless loop + bỏ pagination dots** (plan `260929-1705-hero-carousel-loop-no-dots`)
  - Root cause (probe thực tế trên dev): **cơ chế loop đã hoạt động** (`1→2→3→clone→snap→0` verify 2 chu kỳ liên tục) — lỗi người dùng thấy là **`pause-on-hover`** (`onMouseEnter` → `setPaused(true)`) đóng băng autoplay mỗi khi con trỏ nằm trên hero; test suite che mất vì `s-tour-hero-carousel.mjs` chủ động park cursor ngoài hero + CDP first-move không sinh `mouseenter`
  - Fix (`destination-hero-carousel.tsx`): bỏ hover/focus pause + state `paused` (autoplay chạy liên tục vô hạn) · **giữ** disable theo `prefers-reduced-motion` (cơ chế pause còn lại, ghi nhận ở đây) · bỏ block dots (0 button dưới ảnh) · bỏ dead code `cadence`/`active`/`useTranslations` · bỏ key `destinations.slideLabel` ở **en.json + vi.json** (parity giữ)
  - Test update (có duyệt): S1/S2 dots → `buttons === 0`; theo dõi autoplay bằng **active-slide** (`aria-hidden`) thay `aria-current`; **chốt loop siết chặt**: phải thấy clone (child == galleryCount) rồi child 0 quay lại (check cũ sai vì `active===0` đã đúng cả khi clone đang hiện → snap hỏng vẫn pass)
  - Verified: probe live cursor-trên-hero vẫn `0→1→2→3→0→1` liên tục · `s-tour-hero-carousel` **16/16** · lint 0 · unit **18/18** (parity sau khi bỏ key) · build 0 · schema 0 errors · suite **17/18** (fail duy nhất = revalidate env pre-existing) · ảnh `tests/.output/s-hero-carousel-03-no-dots-desktop.png` + `-04-no-dots-mobile.png`
  - Docs impact: minor
- **[Bugfix] Strip in-page tour category sub-tabs, giữ route filtering** (plan `260929-1744-remove-tour-category-tabs`)
  - Root cause: pill nav trong trang do `tours/layout.tsx` render `<TourCategoryTabs />` (từ Feature 1) — trùng chức năng với 4 link header đã bị `l-navbar` L1/L4 lock
  - Fix: bỏ import/render ở `src/app/[locale]/tours/layout.tsx` (giữ container shell), **xóa** `src/components/tours/tour-category-tabs.tsx` (grep 0 tham chiếu) · data layer `TourCategorySection` + GROQ `category == $category` + 2 `page.tsx` + header + i18n **không đổi**
  - Test contract (có duyệt): `p-tours-category.mjs` — P7 → nav vắng mặt, P8/P9 → header vẫn đủ 2 link category (i18n labels), P20 ×2 → `count === 0`, **+P21** click header "Tour nước ngoài" → URL đúng + render đúng bộ dataset international (chứng minh filtering chạy end-to-end qua header); P1–P6/P10–P19 giữ nguyên
  - Verified: `p-tours-category` **27/27** (P21 `expected=[nyc] rendered=[nyc]`) · lint 0 + unit 18/18 chạy tại task này; build/schema/full suite chạy chung ở task kế tiếp · ảnh `p-tours-01/02` không còn pill bar
  - Ghi chú: lần chạy đầu P19 fail nhẹ do `nyc.isFeatured` vừa đổi ở Studio trong cửa sổ cache `unstable_cache` 300s của homepage (đọc trực tiếp API vs render cache) — chạy lại pass (27/27), không liên quan thay đổi code
  - Docs impact: minor

- **[Feature] Bỏ block promo "Destination" ở tour pages + nav "Home" tự refresh** (plan `260929-1758-prune-destination-home-nav`)
  - DOM: `tours/domestic` bỏ div `mx-auto max-w-3xl` (body + CTA "Khám phá điểm đến"), `tours/international` bỏ `<p>` body trùng ý subtitle — giữ nguyên h1 + subtitle + grid `TourCategorySection` (P3–P6 h1 khóa giữ xanh)
  - Header (`header.tsx`): `navItems` 4 → **5**, thêm `{key:"home", href:"/"}` đầu mảng (dùng key `common.home` sẵn có — 0 sửa i18n) · render cả desktop `<nav>` lẫn Sheet mobile · handler `handleHomeClick`: khi `usePathname()` (locale-stripped từ `@/i18n/navigation`) `=== "/"` → `e.preventDefault() + window.location.reload()` (hard reload có chủ đích), ngược lại NavLink bình thường
  - Test (có duyệt): `l-navbar` L1/L3/L4 → 5 link/5 URL/5 h1 distinct (home h1 = hero CMS fallback, index shift), **mới L6**: marker `window.__l6` wipe trên `/vi` (reload) + giữ nguyên khi đi từ `/tours/domestic` → `/vi` (chỉ refresh đúng khi đang ở home) · `p-tours` P8/P9 → `length===5`, `[0]=/vi + common.home` · **23/23 + 27/27**
  - Verified: lint 0 · unit 18/18 · build 0 · schema 0 · suite **19/20** (fail duy nhất = revalidate env) · ảnh `tests/.output/l-navbar-01-desktop.png` + `l-navbar-02-sheet.png` + `p-tours-01/02-*.png`
- **[Feature/CMS] Taxonomy vùng → quốc gia đa ngôn ngữ (country)** (plan `260929-1805-cms-country-taxonomy`)
  - Schema: doc type **`country`** mới (`code` ISO alpha-2 bắt buộc regex `^[A-Z]{2}$`, `name:{vi,en}` đều required — mỗi entry lưu cả 2 chuỗi) + field `destination.country` = **reference required** · `region` **deprecate in-place**: giữ required/dùng cho listing filter pills + map + search, description đánh dấu "Deprecated — hiển thị dùng Country" (D1/D2 duyệt: deprecate ≠ thay thế full)
  - Query: 4 query card/chip (`DESTINATIONS_QUERY`, `DESTINATION_BY_SLUG`, `DESTINATIONS_BY_CATEGORY`, `FEATURED`) cộng `country->{ "code": code, "vi": name.vi, "en": name.en },` + `category,` (comma-safe, groq-js parse đã cover) · `$region` giữ nguyên
  - Frontend: card (client `useLocale`) + chip chi tiết (server `getLocale` từ params) cùng chain `country?.[locale] ?? (category==="domestic" ? t("vietnam") : region fallback)` · i18n thêm `destinations.vietnam` (en+vi parity) · script `migrate:countries` (15 nước ISO, id deterministic `country-<code>`, dry-run default, `--apply` cần `SANITY_WRITE_TOKEN` — vẫn vắng, Studio tạo tay được)
  - Content: Admin đã gán country cho **3/3 destination** (vi "Việt Nam"/"Mỹ", en "Vietnam"/"The US") trong Studio
  - Test mới `t-country-locale.mjs` (live GROQ, không fake): T1 card vi/en + T2 chip vi/en đúng chuỗi CMS, T3 parity vi≠en đúng khi label phân kỳ → **25/25** · unit mở rộng: 4 query projection `country->` + schema `length(3)` → 18/18
  - Verified: lint 0 · build 0 · schema 0 · suite **19/20** · ảnh `t-country-01-card-vi.png` + `t-country-02-detail-en.png`
- **[Feature/CMS] Gallery đội ngũ bất đối xứng dưới About Us** (plan `260929-2030-team-gallery-about-us`)
  - Schema `homepage` singleton: field **`teamGallery`** = array image (hotspot), **`rule.required().length(3)`** đúng 3 slot (mô tả thứ tự ô: ảnh 1 cột trái full-height, ảnh 2 phải-trên, ảnh 3 phải-dưới) · `HOMEPAGE_QUERY` cộng `teamGallery[]{ imageFragment }` (tag `sanity:homepage` revalidate sẵn)
  - Component mới `src/components/homepage/team-gallery.tsx` (server): grid **2 cột** — cột trái 1 cell `relative` Image 1 `fill object-cover object-center rounded-lg`; cột phải nested `grid grid-rows-2 gap-4` chứa ảnh 2 + 3 · container `mt-10 grid h-[400px] max-h-[50vh] grid-cols-2 gap-4` (**max-height chặt**, block luôn compact) · **null khi <3 ảnh** (graceful, không fake placeholder) · tích hợp trong `about-us-section` **bên trong band**, ngay dưới grid 50/50 (vị trí duyệt) → dưới intro + CTA `/contact` + promo video
  - Test mới `u-team-gallery.mjs` (live GROQ `homepage.teamGallery`): nhánh content-missing → gallery vắng + không pageerror (**4/4**); 3 ảnh Studio → tự kích hoạt nhánh structure (2 cell con, right = 2 cell, rounded, gap-4, `max-h ≤ 400px`, object-cover/center, nằm sau promo video trong section)
  - Verified: lint 0 · unit 18/18 (mở rộng query/schema asserts) · build 0 · schema 0 errors · suite **19/20** · `j-about-contact` 34/34 + `n-lightbox` 27/27 không regressed
  - Outstanding: upload 3 ảnh team trong Studio (write token vắng → làm tay) để flip nhánh visible
  - Docs impact: minor
### Fixed
- **[Test] `c-booking` B13 live-driven sau khi CMS xóa destination `hcmc`** — root cause content drift (B13 404 → `[]` sections), không phải code regression: chọn subject = destination non-special **có pricing trước, không có thì lấy any non-special** (live GROQ `fetchDestinations` + `fetchPricingSlugs`) · nhánh không-pricing assert đúng hợp đồng P4 (`priceMissingNote` hiện, 0 payment UI, 0 record persisted — không fake totals) · thêm pricing cho `dn`/`nyc` trong Studio sẽ tự bật lại nhánh momo→record đầy đủ

### Added
- **[Feature/CMS] About Us narrative động (Portable Text EN/VI)** (plan `260929-2114-about-us-dynamic-narrative`)
  - Schema `homepage` +2 field PT: `narrativeStory_en` / `narrativeStory_vi` (fieldset Narrative) · `HOMEPAGE_QUERY` +2 projection · gỡ placeholder `aboutSection.body` hardcode khỏi en.json + vi.json (parity giữ)
  - Component NEW `src/components/homepage/about-narrative.tsx` (refactor dùng chung `PT_COMPONENTS`/`pickLocaleBlocks` từ `src/components/sanity/portable-text.tsx` — share với `ArticleRichText`): locale → fallback locale kia → **render nothing** khi 2 field rỗng · bound trong `about-us-section.tsx` dưới intro, trên CTA
  - Tests: `v-about-narrative.mjs` 8/8 (empty-CMS branch) · Verified: lint 0 · build 0 · schema 0 errors
- **[Cleanup/CMS] Purge `teamGallery` (revert plan `260929-2030` theo yêu cầu)** (plan `260929-2135-purge-team-gallery`)
  - Xóa field `teamGallery` khỏi schema `homepage` · gỡ projection `HOMEPAGE_QUERY` + prop `page.tsx` + import/render/doc-comment trong `about-us-section.tsx` · **xóa** `src/components/homepage/team-gallery.tsx` (grep `teamGallery` src → 0) · xóa `u-team-gallery.mjs`, NEW `w-about-gallery-removed.mjs` **25/25** (dual-viewport, container=1 child, py-16=64px) · unit checks đảo thành negative purge asserts
  - Script NEW `scripts/purge-team-gallery.mjs` (`migrate:purge-team-gallery`, dry-run: 3 slot pending trên homepage doc; `--apply` chờ `SANITY_WRITE_TOKEN`)
  - Verified: lint 0 · unit 18/18 ( tại thời điểm) · regressions w/j/n/v/l xanh
- **[Feature] Homepage prune + `article` schema thay `post` + blog CMS-only** (plan `260929-2151-homepage-prune-article-cms-newspaper-blog`)
  - `page.tsx` 10 → **6 section** (Hero→QuickAccess→Featured→AboutUs→Stories→Newsletter); xóa 4 component (ExperienceCategories/Itineraries/Events/Partners) + 12 i18n key en+vi (bottom-up, parity 18/18)
  - Schema: NEW `article.ts` bilingual fieldsets (`title/excerpt/content_en|_vi`, slug từ `title_en`, featuredImage/gallery/publishedAt) thay `post` (dataset 0 post doc → 0 migration) · xóa `post.ts` + `queries/posts.ts` · NEW `src/sanity/queries/articles.ts` (`ARTICLES_QUERY [0...12]`, `ARTICLE_BY_SLUG_QUERY`, `ARTICLE_FIELDS` shared)
  - `news-content-provider.ts` viết lại CMS-only (bỏ static+category): `getNewsList/getNewsArticle/getStories` giữ signature · purge messages `news.items`/`news.categories` (giữ `news.title/subtitle/viewArticle/backToList` — unit contract) · search/sitemap repoint · NEW `src/components/sanity/portable-text.tsx` shared (`PT_COMPONENTS` + `pickLocaleBlocks` + `ArticleRichText`) · seed script NEW `scripts/seed-articles.mjs` (`migrate:seed-articles`, 4 bài EN/VI, idempotent, `--apply` chờ token)
  - Note: bố cục newspaper 2 cột (`newspaper-article.tsx`) sinh ở plan này **bị thay bởi feed 1 cột ở plan 2254** (pivot đúng yêu cầu mới)
  - Verified: lint 0 · unit **19/19** (NEW `article-schema-queries.test.mts` groq-js parse guards)
- **[UI/UX] Header tooltips + full-card click + CTA scale ~1.5×** (plan `260929-2207-header-tooltips-full-card-cta-scale`)
  - NEW `src/components/ui/hover-tooltip.tsx` (CSS-only, 0 dep): wrap icon Search/My-trips desktop header — label reuse `common.search`/`myTrips.navLabel` (**0 i18n key mới**), visual span `aria-hidden`, hiện on hover **và** `group-focus-within`, opacity-0 khi idle
  - `destination-card.tsx`: root `group relative cursor-pointer transition-shadow hover:shadow-lg` + **overlay `<Link absolute inset-0 z-10 aria-label={name}>`** → bấm mọi vùng card vào detail (đúng chiến lược P14 `p-tours`: `closest('[data-slot=card]')` thấy đúng 1 destination anchor/card) · CTA `<Link>` → `<span>` phi tương tác, scale `px-6 py-3 text-base`
  - CTA scale: hero `px-8 py-4 text-lg` · about `mt-6 px-8 py-4 text-lg` (twMerge `cn` override size chuẩn)
  - Tests: NEW `a-ux-microinteractions.mjs` **26/26** (tooltips aria+hover/focus ×2 locale · card-body click → `/vi/explore/destinations/hcm` · CTA computed py≥16/fs≥18 ×2 locale · mobile 375 0 overflow · 0 pageerror) · regressions f/g/j xanh · lint 0
- **[Feature] Email xác nhận đặt tour trì hoán 2 phút, song ngữ EN/VI** (plan `260929-2229-delayed-booking-confirmation-email`)
  - Trigger: `booking-payment-section` `onPaid(method)` (paymentMethod trước đây **bị drop** → fix truyền qua callback) → `booking-summary.handlePaid` = `saveBooking(+paymentMethod)` + **fire-and-forget POST `/api/booking-confirmation`** (không block payment UX)
  - Queue: `src/lib/email/confirmation-email-queue.ts` — module Map + injected scheduler (route inject `after()` next/server) · delay `BOOKING_EMAIL_DELAY_MS` default **120000** (garbage/negative → default) · lifecycle queued→sent|dry-run|failed (log, không retry) · **in-process**: mất job nếu restart trong cửa sổ 2 phút (limitation đã duyệt, ghi docs)
  - Provider: `src/lib/email/email-provider.ts` — `RESEND_API_KEY`+`EMAIL_FROM` → Resend HTTP API (**0 npm dep**, fetch thuần); thiếu key → **dry-run** log `[email:dry-run]` (dev/tests default, không gửi thật)
  - Template: `confirmation-email-template.ts` — subject EXACT `[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - [Booking_ID]` · 8 field (tên/email/SDT/**DD/MM/YYYY**/guests/`Intl` total/payment method song ngữ momo|bank/notes→`None / Không có`) · footer disclaimer + closing + `DuanMar Travel Team` **byte-exact cả 2 ngôn ngữ** · `escapeHtml` mọi input · table HTML inline-style (email-client safe) · **0 i18n key mới** (1 email chứa 2 thứ tiếng by design)
  - Route: NEW `POST /api/booking-confirmation` guard chain như `/api/contact` (415→413 20KB→400 JSON→400 `validateBookingConfirmation`) → **202 `{queued,jobId,sendAt}`** · log masked (`maskEmail`/`maskPhone`) · GET 405
  - `.env.example` +`RESEND_API_KEY`/`EMAIL_FROM`/`BOOKING_EMAIL_DELAY_MS` · docs NEW `docs/booking-confirmation-email.md` (architecture + runbook + troubleshooting + limitations)
  - Tests: NEW unit `booking-confirmation-email.test.mts` (subject/footer/date/XSS/validation×9/delay/queue) · NEW browser `b-booking-confirmation-email.mjs` **12/12** (405/415/400/202 `sendAt≈+120007ms` · flow spy đúng 1 POST payload contract · difficulty-select fallback special tour `hcm`) · unit runner → **21/21**
  - Outstanding: chưa set `RESEND_API_KEY`/`EMAIL_FROM` → dry-run cho tới khi thêm
- **[Feature] Unified story routing + social feed liên tục + Heart reactions** (plan `260929-2254-unify-story-routing-social-feed-hearts`)
  - Routing: NEW `/[locale]/blog/[slug]` (detail render **cùng `FeedArticleBlock`** với feed, `single` = h1) · **xóa** `/[locale]/news` + `/[locale]/news/[...slug]` · `next.config` `redirects()` permanent: `/news`→`/blog`, `/news/:slug`→`/blog/:slug` + biến `/:locale/…` (verify 308 locale-aware `/vi/news`→`/vi/blog`) · href swaps: stories-section, search, sitemap.ts, sitemap page
  - Feed: `newspaper-article.tsx` → **`feed-article-block.tsx`** — sequence Oversized title `text-4xl md:text-5xl` → full-width featured image (`aspect-video rounded-xl`) → body **1 cột `mx-auto max-w-4xl` + `text-lg leading-relaxed`** (bỏ `md:columns-2 [&>*]:break-inside-avoid` = root cause clustering) → reaction bar · divider `border-t`, **0 ordinal** (assert vắng cả `Article N` lẫn `Bài N`) · `/blog` giữ `h1=blog.title` (L4/X2/Y4 contract), empty-state giữ
  - Heart: DB **`node:sqlite`** (Node 24 built-in, 0 dep) file `data/article-likes.db` (gitignored) — atomic `INSERT … ON CONFLICT DO UPDATE count=count+1 RETURNING count` · NEW `POST /api/articles/[slug]/like` (slug regex 400 · >1KB 413 · GET 405 · DB down → 503) · client `src/lib/article-likes.ts`: `vn-liked-articles:v1` append-only (**1 like/browser**, không re-vote) + changed-event + `storage` event · `HeartButton`: `useSyncExternalStore` đọc liked (SSR-safe, không setState-in-effect) → click: fill `text-red-500 fill-current` + count+1 **optimistic** + POST reconcile (fail → giữ optimistic) · `aria-pressed` · 2 key mới `blog.like`/`blog.liked` (parity giữ)
  - Tests: **rename + rewrite** `x-blog-newspaper.mjs` → **`x-blog-feed.mjs` 26/26** (X8 hrefs `/blog/` · X10 anti-columns-2 + `max-w-4xl` wrapper · X10b like-button/block · X12 redirect · X13/14 detail unified + back-link · X5 thêm `Bài \d`) · NEW `e-social-feed-heart.mjs` **12/12** (API 200/400/405/413 · click → pressed+red+count+1 · re-click không tăng · reload vẫn đỏ · count khớp server) · NEW unit `article-likes.test.mts` (storage L1-L6 + sqlite D1-D5 incl. degrade ENOTDIR)
  - Verified (combined gate cycle 6 plans): lint **0** · `npm test` **21/21** · `npm run build` **0** (fix type `PT_COMPONENTS` children optional — lỗi TS từ 2151 chưa từng build) · `sanity schemas validate` **0 errors** · `npm run test:browser` **25/26** (fail duy nhất `revalidate-webhook` = thiếu `SANITY_REVALIDATE_SECRET`, env pre-existing) · suite giờ 26 files (mới: `a`, `b`, `e`; rename `x`; xóa `u`)
  - Thuộc người dùng (post-deploy): thêm `RESEND_API_KEY`+`EMAIL_FROM` để gửi thật · `SANITY_WRITE_TOKEN` cho `migrate:purge-team-gallery --apply` + `migrate:seed-articles --apply` · CMS hiện 1 article `starup` (nhánh feed/detail live xanh)
  - Docs impact: minor (changelog này + `docs/booking-confirmation-email.md` + `.env.example` + `.gitignore data/` + plan statuses + reports)
- **[Feature] AI Tour Assistant — grounded CMS chatbot + floating widget** (plan `260929-2335-ai-tour-assistant-widget`)
  - Widget NEW `src/components/assistant/assistant-widget.tsx` (client): floating trigger bottom-right (`z-40`, `aria-expanded`) → panel `min(70vh,32rem)×min(92vw,24rem)`, greeting display-only, Enter/click gửi, streaming append qua `ReadableStream` reader, `data-streaming` hook, `Escape` đóng, session giữ qua reopen · mount trong `[locale]/layout.tsx` (mọi trang kể cả `/booking`, non-modal) · +8 key `assistant.*` en+vi (parity giữ) · **review fixes**: history window `MAX_MESSAGES-1` + drop leading assistant (gửi lần 5 không 400), filter empty bubbles + rollback rỗng khi lỗi (retry không poisoning), `maxLength=1000`, AbortController ref (unmount/new-send hủy stream), `aria-controls` chỉ khi open
  - API NEW `POST /api/assistant` (`src/app/api/assistant/route.ts`, runtime nodejs): **rate limit FIRST 60/ph/client-key in-memory → 429** (`rate-limit.ts`, key = x-real-ip → rightmost XFF → local, prune O(window)/call) → guard chain 415 → 413 (content-length fast path **+ capped stream read 32KB** — chunked không bypass được, `body-limit.ts`) → 400 JSON → 400 validation (≤8 msg, ≤1000 chars, first=user, locale enum; `toAssistantRequest` **merge consecutive same-role** cho Gemini alternation) → grounding server-side → **peek first delta trước khi stream headers** (`first.done` → 502) → provider fail = **502 `{error}` thật** · mid-stream fail append interruption note · GET 405 + `Allow: POST` · log masked (locale/msgCount/mode/ms, **0 nội dung, 0 key**)
  - Grounding: `grounding-fetch.ts` (`fetchPublished` ×3: `DESTINATIONS_QUERY`+`ALL_TOUR_PRICING_QUERY`+`ARTICLES_QUERY[0...12]` + contact nodes từ messages) → `serializeGrounding` markdown 4 section, cap **16KB**, per-field caps (300/240/160) · `system-prompt.ts` rules 2 locale: ground-only, không bịa giá/ngày, refuse off-topic, ignore embedded instructions (injection defense), ≤120 từ, ≤2 deep link theo slug trong context
  - Provider `assistant-provider.ts`: **Gemini `streamGenerateContent?alt=sse` plain fetch (0 npm dep)** khi `GEMINI_API_KEY` (model `ASSISTANT_MODEL` || `gemini-3.5-flash-lite` (2.5-flash retired cho key mới — key thật đã cấu hình 2026-09-30, 3.7/3.8 đang 503), abort qua `req.signal`) · keyless → **dry-run**: keyword-overlap top-3 context lines + deep link `/locale/explore/destinations/<slug>` | `/locale/blog/<slug>` + config note → test/dev xanh không cần key
  - Tests: NEW unit `assistant-grounding-prompt` **7/7** (groq-js parse 3 query, truncate, serializer sections+budget, prompt locale rules, contact 5 nodes, dry-run grounding+link) + `assistant-validation-rate-limit` **11/11** (V1–V8 validation, R1–R3 rate window) → unit runner **23/23** · NEW browser `i-ai-assistant.mjs` **13/13** (API 405/415/413/400×2 · VI panel+greeting · stream reply 3 bubbles · **reply echo tên destination live `HCM` + deep link** · Escape/reopen giữ session · EN flow · mobile 375 panel 345px 0 overflow · 0 pageerror)
  - Verified: lint **0** (0 warning) · `npm test` **23/23** · `npm run build` 0 (route `/api/assistant` trong manifest) · schema 0 errors · suite **26/27** (fail duy nhất `revalidate-webhook` env pre-existing)
  - Docs: NEW `docs/ai-assistant.md` · `.env.example` +`GEMINI_API_KEY`/`ASSISTANT_MODEL` · Key thật đã cấu hình (`.env.local`, gitignored; 2026-09-30): live Gemini xác minh end-to-end (15/15 browser checks chế độ live, model `gemini-3.5-flash-lite` — 2.5-flash retired, 3.7/3.8 503 tại thời điểm cấp key) · Docs impact: minor
- **[Test] `f-ui` F5 robust ở ranh giới cuối tháng** — fix latent date-boundary: khi "hôm nay" = ngày cuối tháng thì `startMonth={minDate}` (ngày mai = tháng sau) làm ô past/today trong tháng hiện tại render thành outside-cell **không có `<button>`** (`disabled:null`) → `dayInfo` fallback đọc `data-disabled` thay vì `btn.disabled` · KHÔNG liên quan code assistant — tự lộ sau khi clock sang 2026-09-30 00:00
