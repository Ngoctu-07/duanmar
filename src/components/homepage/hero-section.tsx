"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import {
  HeroAmbientBackdrop,
  type HeroBackgroundMedia,
} from "@/components/homepage/hero-ambient-backdrop";
import { useHeroVideoAutopause } from "@/components/homepage/use-hero-video-autopause";

interface HeroProps {
  hero?: {
    title?: string | null;
    heroTitle?: string | null;
    heroImage?: { asset?: { url: string } };
  };
  /** Centered promo clip (CMS heroPromoVideo > legacy promo fields). */
  videoSrc?: string | null;
  /** Poster frame shown before playback / on video error. */
  posterSrc?: string | null;
  /** CMS `heroBackgroundMedia` — full-bleed looping video or animated GIF. */
  backgroundMedia?: HeroBackgroundMedia | null;
  /** Optional looping ambience used when no CMS background media is set. */
  ambientSrc?: string | null;
}

/**
 * Full-viewport horror hero with a breakout promo film.
 *
 * Layers, back to front: CMS background media (video/GIF → hero still → CSS
 * fog/grain) with a media-only 7% brightness grade (`brightness(0.93)`) plus
 * sepia/contrast, then a static 10% grain overlay → the promo film capped at
 * half the viewport width (`w-[50vw] max-w-3xl aspect-video`), anchored to the
 * hero's bottom edge and translated down by 40% of its own height. The result
 * is a 60/40 split: 60% of the film overlaps the background, 40% hangs outside
 * the hero and overlaps the search section below. The promo is a sibling above
 * the background, so neither the grade nor the grain touches it; it stays
 * sharp and bright.
 *
 * The hero intentionally does not clip its overflow; the ambient backdrop owns
 * its own clip so the fog/grain never spill. The search section reserves the
 * overhang and stacks above the film so no control is obscured.
 *
 * There is no hardcoded display wordmark anymore: the only heading is a
 * visually hidden H1 fed by the CMS (`heroTitle`), preserving SEO/landmarks
 * without painting static text over the media.
 *
 * Note: the header is transparent/hidden over this section (see header.tsx),
 * so `-mt-16` pulls the hero up under the sticky bar to fill the viewport.
 */
export function HeroSection({
  hero,
  videoSrc,
  posterSrc,
  backgroundMedia,
  ambientSrc,
}: HeroProps) {
  const t = useTranslations("home");
  const [failed, setFailed] = useState(false);
  const { frameRef, videoRef } = useHeroVideoAutopause();

  const imageSrc = hero?.heroImage?.asset?.url ?? null;
  const showVideo = Boolean(videoSrc) && !failed;
  const heroTitle = t("heroTitle") || hero?.heroTitle?.trim();

  const handleScrollDown = () => {
    const heroEl = document.getElementById("home-hero");
    const bottom = heroEl
      ? heroEl.getBoundingClientRect().bottom + window.scrollY
      : window.innerHeight;
    window.scrollTo({ top: bottom, behavior: "smooth" });
  };

  return (
    <section
      id="home-hero"
      data-testid="home-hero"
      className="relative -mt-16 flex h-screen min-h-[560px] w-full items-center justify-center bg-[#0a0a0a]"
    >
      <HeroAmbientBackdrop
        imageSrc={posterSrc ?? imageSrc}
        media={backgroundMedia}
        videoSrc={ambientSrc}
      />

      {/* CMS-driven landmark only — no static display wordmark is painted. */}
      <h1 className="sr-only">{heroTitle}</h1>

      {showVideo ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4">
          <div
            ref={frameRef}
            data-testid="hero-video-frame"
            className="w-[50vw] max-w-3xl translate-y-[40%]"
          >
            <div className="aspect-video overflow-hidden rounded-none bg-black/40 shadow-[0_30px_120px_-20px_rgba(0,0,0,0.95)]">
              <video
                ref={videoRef}
                data-testid="hero-video"
                src={videoSrc ?? undefined}
                poster={posterSrc ?? imageSrc ?? undefined}
                autoPlay
                loop
                playsInline
                preload="auto"
                onError={() => setFailed(true)}
                aria-label={t("heroVideoAria")}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleScrollDown}
        aria-label={t("scrollDown")}
        data-testid="hero-scroll-down"
        className="absolute right-4 bottom-8 z-30 animate-bounce rounded-none p-2 text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-8"
      >
        <ChevronDown className="h-7 w-7 stroke-[1.5]" />
      </button>
    </section>
  );
}
