"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Autoplay cadence (brief: 3000ms) and slide animation duration. */
const AUTOPLAY_MS = 3000;
const TRANSITION_MS = 700;

export interface HeroSlide {
  src: string;
  alt: string;
}

/**
 * Tour detail hero carousel: auto-playing horizontal slider (3s interval,
 * infinite 1→2→3→1). The track appends a clone of the first slide so the wrap
 * glides seamlessly; once the clone has slid in (TRANSITION_MS), the index
 * snaps back to the real first slide with the transition disabled for a frame.
 *
 * Autoplay is continuous — a resting cursor must never stop the loop (no
 * hover/focus pause). The only pause mechanism is OS-level
 * prefers-reduced-motion, which disables autoplay entirely.
 */
export function DestinationHeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (total < 2 || reducedMotion) return;
    const timer = setInterval(
      () => setIndex((i) => (i >= total ? 0 : i + 1)),
      AUTOPLAY_MS
    );
    return () => clearInterval(timer);
  }, [total, reducedMotion]);

  // Clone (index === total) finished sliding in → jump to the real slide 0
  // with the transition off, then re-enable it for the next cycle.
  useEffect(() => {
    if (total < 2 || index !== total) return;
    const timer = setTimeout(() => {
      setAnimate(false);
      setIndex(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    }, TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [index, total]);

  if (total === 0) return null;

  return (
    <div
      data-testid="destination-hero-carousel"
      className="relative mt-6 aspect-[20/9] overflow-hidden rounded-xl bg-muted"
    >
      {/* Slide 0 plus its clone (only appended when total >= 2). */}
      {slides.concat(total > 1 ? [slides[0]] : []).map((slide, i) => (
        <div
          key={`${i}-${slide.src}`}
          className={cn(
            "absolute inset-0 h-full w-full",
            animate && "transition-transform ease-[cubic-bezier(0.4,0,0.2,1)]"
          )}
          style={{
            transform: `translateX(${(i - index) * 100}%)`,
            transitionDuration: animate ? `${TRANSITION_MS}ms` : undefined,
            zIndex: i === index ? 1 : 0,
          }}
          aria-hidden={i === index ? undefined : true}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 960px"
            className="object-cover"
            loading={i === 0 ? undefined : "eager"}
            priority={i === 0}
          />
        </div>
      ))}
    </div>
  );
}
