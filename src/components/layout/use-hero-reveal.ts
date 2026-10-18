"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

/** Element id of the full-viewport homepage promo hero ("DECODE TRAVEL"). */
export const HERO_ID = "home-hero";

/** Fraction of the hero height the visitor must scroll before chrome reveals. */
const REVEAL_RATIO = 0.5;

/**
 * Shared homepage reveal gate for the transparent header and the floating
 * assistant widget (ghost FAB). Over the full-viewport video hero both stay
 * hidden; once the visitor scrolls past 50% of the hero height they reveal
 * together. Off the homepage the gate is always open.
 *
 * Scroll/resize work is coalesced into a single rAF per frame and reads layout
 * only when the events fire (SSR-safe: first paint happens after mount). Both
 * consumers bind to this one hook so their reveal state can never drift apart.
 */
export function useHeroReveal(): boolean {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const heroEl = document.getElementById(HERO_ID);
      const threshold = (heroEl ? heroEl.offsetHeight : window.innerHeight) * REVEAL_RATIO;
      setScrolledPastHero(window.scrollY >= threshold);
    };
    frame = requestAnimationFrame(update);
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isHome]);

  return !isHome || scrolledPastHero;
}
