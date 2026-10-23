"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CRT_ACTION_MS,
  CRT_SPLASH_KEY,
  CRT_SPLASH_MS,
  CRT_STATIC_ATTR,
  CRT_STATIC_EVENT,
  prefersReducedMotion,
  readTriggerDuration,
} from "@/lib/crt-static";
import { useStaticBurstAudio } from "./use-static-burst-audio";

/** Restart guard: the same burst cannot retrigger inside this window. */
const REPEAT_GUARD_MS = 120;

function splashAlreadyPlayed(): boolean {
  try {
    return window.sessionStorage.getItem(CRT_SPLASH_KEY) === "1";
  } catch {
    // Private mode / storage disabled: play it, just never remember.
    return false;
  }
}

function rememberSplash(): void {
  try {
    window.sessionStorage.setItem(CRT_SPLASH_KEY, "1");
  } catch {
    // Ignored — the splash is decorative.
  }
}

/**
 * Event-driven CRT static overlay (noise + scanlines + RGB split).
 *
 * Deliberately NOT tied to navigation: standard page links stay clean. Bursts
 * come from two sources only —
 *   1. the 500ms landing splash (once per session, see `CRT_SPLASH_KEY`);
 *   2. elements carrying `data-crt-static="300"` (book / checkout / auth).
 *
 * The page itself is never transformed, so the effect reads as a TV losing its
 * signal instead of a laggy UI. `prefers-reduced-motion` skips visuals AND
 * audio; the CSS animations are gated a second time in globals.css.
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

    // Capture phase: the burst starts on the gesture, even though CTA handlers
    // call preventDefault() to gate the action behind auth.
    const onGesture = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>(`[${CRT_STATIC_ATTR}]`);
      if (!trigger) return;
      run(readTriggerDuration(trigger));
    };

    window.addEventListener(CRT_STATIC_EVENT, onBurst);
    document.addEventListener("click", onGesture, true);
    document.addEventListener("submit", onGesture, true);

    // Landing splash: first visit of the session only, off the Studio route.
    // The flag is written inside the timeout so React StrictMode's
    // mount → cleanup → remount cycle cannot swallow the only chance to play.
    let splashFrame = 0;
    let splashTimer = 0;
    if (!splashAlreadyPlayed() && !window.location.pathname.startsWith("/studio")) {
      splashFrame = window.requestAnimationFrame(() => {
        // One more tick so the first paint lands before the overlay covers it.
        splashTimer = window.setTimeout(() => {
          rememberSplash();
          run(CRT_SPLASH_MS);
        }, 60);
      });
    }

    return () => {
      window.removeEventListener(CRT_STATIC_EVENT, onBurst);
      document.removeEventListener("click", onGesture, true);
      document.removeEventListener("submit", onGesture, true);
      window.cancelAnimationFrame(splashFrame);
      window.clearTimeout(splashTimer);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      const overlay = overlayEl;
      if (overlay) overlay.dataset.active = "false";
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
