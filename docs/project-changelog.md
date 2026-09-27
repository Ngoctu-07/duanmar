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
