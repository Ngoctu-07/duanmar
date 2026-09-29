# Phase 2 — Frontend Binding: Background Autoplay + Poster Fallback

**Plan**: [plan.md](plan.md) · **Priority**: High · **Status**: Complete (100%) · **Depends on**: Phase 1

## Context Links
- `src/app/[locale]/page.tsx:20-34` (`homepageData`, `<AboutUsSection />` at `:36` region) · `src/components/homepage/about-us-section.tsx:10,28` · `src/components/homepage/promo-video.tsx` (59 LOC)
- Precedent for null-safe mapping: `popupSrc/popupWidth…` in `src/app/[locale]/layout.tsx:18-22`
- i18n: `home.aboutSection.{videoAria,videoFallback}` (EN/VI) — reuse, 0 new keys

## Overview
AC2 (dynamic binding) + AC3 (autoplay attrs + graceful fallback): map CMS payload → props → props-driven `PromoVideo`.

## Key Insights
- Precedence computed once in `page.tsx` (server): `aboutUsVideo.asset.url ?? aboutUsVideoStreamUrl` → `videoSrc`; poster `aboutUsVideoPoster.asset.url ?? null` (component applies local default).
- Poster rendered via `next/image` with `fill` + `sizes` → no width/height plumbing needed (dimensions projection stays for future use/preview).
- With no video: static poster `<Image>` inside the same `aspect-video` frame → grid untouched (decision 3).
- Caption `videoFallback` shown **only** when a configured video fails (`onError`) — never for "no video configured" (poster is the graceful state).

## Requirements
- `<video>` gets `autoPlay muted loop playsInline` (+ existing `poster`, `preload="metadata"`, `aria-label`, `onError`).
- No click-to-play button/overlay; `useRef`/`play()` removed.
- No CMS video → poster image (`aboutUsVideoPoster` → `/images/promo-modal.png`) fills frame; section/grid markup unchanged.
- `videoSrc` present but fails → poster + `videoFallback` caption.
- EN/VI identical behavior (translations, not literals).

## Related Code Files
**Modify**: `src/app/[locale]/page.tsx` · `src/components/homepage/about-us-section.tsx` · `src/components/homepage/promo-video.tsx`
**Create / Delete**: none

## Implementation Steps
1. `page.tsx`: derive
   ```ts
   const aboutVideoSrc = homepageData?.aboutUsVideo?.asset?.url ?? homepageData?.aboutUsVideoStreamUrl ?? null;
   const aboutPosterSrc = homepageData?.aboutUsVideoPoster?.asset?.url ?? null;
   ```
   and render `<AboutUsSection videoSrc={aboutVideoSrc} posterSrc={aboutPosterSrc} />`.
2. `about-us-section.tsx`: accept `{ videoSrc?: string | null; posterSrc?: string | null }`, pass through to `<PromoVideo videoSrc={videoSrc} posterSrc={posterSrc} />` (props type exported or inline; file stays ≪200 LOC).
3. `promo-video.tsx` rewrite (keep `data-testid`s `about-promo-video` on the frame):
   - Props `{ videoSrc?: string | null; posterSrc?: string | null }`; local `poster = posterSrc || POSTER_SRC`.
   - State: `failed` (only set by `<video onError>` when `videoSrc` exists).
   - `videoSrc && !failed` → `<video src={videoSrc} poster={poster} autoPlay muted loop playsInline preload="metadata" aria-label={t("aboutSection.videoAria")} onError={() => setFailed(true)} className="h-full w-full object-cover" />`.
   - else → `<Image src={poster} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" priority={false} />` inside the same frame; if `videoSrc && failed` also render the `videoFallback` caption span (existing classes).
   - Remove `CirclePlay`, `useRef`, play handler, unconditional caption.
4. Gates: `npm run lint` → `npm test` (17/17) → smoke `/vi` + `/en`: frame renders poster (CMS video not uploaded yet), 50/50 grid intact, no play overlay, 0 console/page errors; temporarily verify autoplay path only via unit/browser contract (do NOT fabricate CMS data).

## Todo List
- [ ] `page.tsx` → props mapping (file > URL precedence)
- [ ] `about-us-section.tsx` pass-through props
- [ ] `promo-video.tsx` background player + poster fallback
- [ ] Gates: lint, unit, visual smoke

## Success Criteria
- With current CMS (no video): poster fills frame, no play button, no caption, grid unbroken; lighthouse-style no layout shift.
- With a video configured: `<video>` has all 4 AC3 attributes and the live URL as `src`.
- Component ≤100 LOC; lint 0; unit 17/17.

## Risk Assessment
- `next/image` `fill` requires positioned parent → frame already `relative` (`about-promo-video` div).
- Removing overlay may leave unused i18n key if caption path also removed — caption path is kept, keys stay.

## Security Considerations
- `alt=""` decorative image (heading adjacent); video `aria-label` from i18n.

## Next Steps
Phase 3 — tests, pipeline, Studio check, changelog.
