"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CRT_ACTION_MS,
  CRT_STATIC_EVENT,
  prefersReducedMotion,
} from "@/lib/crt-static";
import { useStaticBurstAudio } from "./use-static-burst-audio";

/** Restart guard: the same burst cannot retrigger inside this window. */
const REPEAT_GUARD_MS = 120;

/**
 * Event-driven CRT static overlay (noise + scanlines + RGB split).
 *
 * Only `fireCrtStatic()` from the two success milestones (authentication and
 * booking) dispatches the event. There is no landing splash, no click/submit
 * capture and no route binding, so typing, focus and validation never glitch.
 *
 * `prefers-reduced-motion` skips visuals AND audio; the CSS animations are
 * gated a second time in globals.css.
 */
export function CrtStaticOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);
  const playStatic = useStaticBurstAudio();

  const run = useCallback(
    (durationMs: number) => {
      if (prefersReducedMotion()) return;
      const now = performance.now();
      if (now - lastRunRef.current < REPEAT_GUARD_MS) return;
      lastRunRef.current = now;

      const overlay = overlayRef.current;
      if (!overlay) return;

      const duration = Math.max(80, Math.round(durationMs));
      // Reset first, force a style flush, then re-add so a burst fired while
      // another is still fading restarts its keyframes from zero.
      overlay.dataset.active = "false";
      overlay.style.setProperty("--crt-duration", `${duration}ms`);
      overlay.dataset.duration = String(duration);
      void overlay.offsetWidth;
      overlay.dataset.active = "true";

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        overlay.dataset.active = "false";
        timerRef.current = null;
      }, duration);

      playStatic(duration);
    },
    [playStatic]
  );

  useEffect(() => {
    const overlayEl = overlayRef.current;
    const onBurst = (event: Event) => {
      const detail = (event as CustomEvent<{ durationMs?: number }>).detail;
      run(detail?.durationMs ?? CRT_ACTION_MS);
    };

    window.addEventListener(CRT_STATIC_EVENT, onBurst);

    return () => {
      window.removeEventListener(CRT_STATIC_EVENT, onBurst);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      if (overlayEl) overlayEl.dataset.active = "false";
    };
  }, [run]);

  return (
    <div
      ref={overlayRef}
      data-testid="crt-static"
      data-active="false"
      aria-hidden="true"
      className="crt-static"
    >
      <span className="crt-static__noise" />
      <span className="crt-static__scanlines" />
      <span className="crt-static__chroma" />
      <span className="crt-static__vignette" />
    </div>
  );
}
