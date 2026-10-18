"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import Image from "next/image";

interface HeroProps {
  hero?: {
    heroImage?: { asset?: { url: string } };
  };
  /** Hero promo video (uploaded file > stream URL); null → hero image fallback. */
  videoSrc?: string | null;
  /** Poster frame shown before playback / on video error. */
  posterSrc?: string | null;
}

/**
 * Full-viewport homepage hero. Renders the configured promo video (autoplay,
 * muted, looping, inline) as the background, degrading to the hero image or a
 * gradient when no video is available.
 *
 * The overlay is a single giant brand wordmark ("DECODE TRAVEL") that stretches
 * full-width with fluid viewport typography — no subtitle — plus a scroll-down
 * affordance that advances past the fold.
 *
 * Note: the header is transparent/hidden over this section (see header.tsx),
 * so `-mt-16` pulls the hero up under the sticky bar to fill the viewport.
 */
export function HeroSection({ hero, videoSrc, posterSrc }: HeroProps) {
  const t = useTranslations("home");
  const [failed, setFailed] = useState(false);

  const imageSrc = hero?.heroImage?.asset?.url ?? null;
  const showVideo = Boolean(videoSrc) && !failed;

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
      className="relative -mt-16 flex h-screen min-h-[560px] w-full items-center justify-center overflow-hidden bg-black"
    >
      {showVideo ? (
        <video
          data-testid="hero-video"
          src={videoSrc ?? undefined}
          poster={posterSrc ?? imageSrc ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setFailed(true)}
          aria-label={t("heroVideoAria")}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : imageSrc ? (
        <Image
          src={imageSrc}
          alt={t("heroDisplay")}
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-background to-secondary/40" />
      )}

      <div className="absolute inset-0 bg-black/40" aria-hidden />

      <div className="relative z-10 flex w-full items-center justify-center px-2">
        <h1
          data-testid="hero-display"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.65), 0 1px 3px rgba(0,0,0,0.8)" }}
          className="w-full text-center font-display font-normal uppercase leading-none tracking-[0.12em] whitespace-nowrap text-white text-[clamp(3rem,15vw,20rem)]"
        >
          {t("heroDisplay")}
        </h1>
      </div>

      <button
        type="button"
        onClick={handleScrollDown}
        aria-label={t("scrollDown")}
        data-testid="hero-scroll-down"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce rounded-full p-2 text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <ChevronDown className="h-7 w-7 stroke-[1.5]" />
      </button>
    </section>
  );
}
