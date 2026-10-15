"use client";

import * as React from "react";

export const FAB_FOOTER_ID = "site-footer";

/**
 * Footer-boundary ghost inversion.
 *
 * Pixel-exact seam: overlap measured from the footer's top edge
 * (`fab.bottom - footerTop`), both layer clips derived from one pixel
 * value with a 1px overlap favoring the outline layer, so antialiased
 * edges never open a background gap (no black bar) and zero white
 * pixels render above the footer boundary.
 *
 * Smoothness: clips are written directly to layer styles inside rAF —
 * no React state per scroll frame. A continuous loop runs only while
 * the footer is near the viewport (IO + 200px rootMargin), so the
 * float-bob animation is tracked per-frame near the boundary and costs
 * nothing elsewhere. SSR-safe (paints after mount).
 */
export function useFabFooterInversion(
  fabRef: React.RefObject<HTMLElement | null>,
  solidRef: React.RefObject<SVGSVGElement | null>,
  outlineRef: React.RefObject<SVGSVGElement | null>,
  footerId: string = FAB_FOOTER_ID
): void {
  React.useEffect(() => {
    let raf = 0;
    let nearFooter = false;
    let looping = false;

    const paintSolidFull = () => {
      if (solidRef.current) solidRef.current.style.clipPath = "none";
      if (outlineRef.current)
        outlineRef.current.style.clipPath = "inset(100% 0 0 0)";
      if (fabRef.current) fabRef.current.dataset.overlap = "0.00";
    };

    const paint = () => {
      const fab = fabRef.current;
      const solid = solidRef.current;
      const outline = outlineRef.current;
      const footer =
        document.getElementById(footerId) ?? document.querySelector("footer");
      if (!fab || !solid || !outline || !footer) return;
      const fabBounds = fab.getBoundingClientRect();
      const footerTop = (footer as HTMLElement).getBoundingClientRect().top;
      const h = fabBounds.height;
      if (!(h > 0)) return;
      // Pixels of the FAB at/below the footer top edge (strict boundary).
      const overlapPx = Math.min(h, Math.max(0, fabBounds.bottom - footerTop));
      fab.dataset.overlap = (overlapPx / h).toFixed(2);
      if (overlapPx <= 0) {
        solid.style.clipPath = "none";
        outline.style.clipPath = "inset(100% 0 0 0)";
        return;
      }
      if (overlapPx >= h) {
        solid.style.clipPath = "inset(0 0 100% 0)";
        outline.style.clipPath = "none";
        return;
      }
      const seamPx = h - overlapPx;
      solid.style.clipPath = `inset(0 0 ${overlapPx.toFixed(1)}px 0)`;
      outline.style.clipPath = `inset(${(seamPx - 1).toFixed(1)}px 0 0 0)`;
    };

    const loop = () => {
      paint();
      raf = requestAnimationFrame(loop);
    };
    const startLoop = () => {
      if (!looping) {
        looping = true;
        raf = requestAnimationFrame(loop);
      }
    };
    const stopLoop = () => {
      looping = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      paintSolidFull();
    };

    const onScrollResize = () => {
      // Loop paints every frame while near; otherwise one exact paint.
      if (!looping) paint();
    };

    paint();
    window.addEventListener("scroll", onScrollResize, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", onScrollResize);
    const footerEl =
      document.getElementById(footerId) ?? document.querySelector("footer");
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              nearFooter = entry.isIntersecting;
              if (nearFooter) startLoop();
              else stopLoop();
            },
            { rootMargin: "200px" }
          )
        : null;
    if (footerEl && observer) observer.observe(footerEl);

    return () => {
      looping = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollResize, { capture: true });
      window.removeEventListener("resize", onScrollResize);
      observer?.disconnect();
    };
  }, [fabRef, solidRef, outlineRef, footerId]);
}
