"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Share of the promo clip's frame that must stay inside the viewport for
 * playback to continue. Below this ratio the clip pauses and mutes.
 */
export const HERO_VIDEO_VISIBILITY_THRESHOLD = 0.5;

/**
 * Comfortable output level: 85% of the master volume (15% softer) so the
 * unmuted intro never blasts the visitor.
 */
export const HERO_VIDEO_VOLUME = 0.85;

/** Trusted gestures that satisfy browser autoplay policies. */
const UNLOCK_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

/** True when enough of the clip's frame is on screen to keep it playing. */
export function isHeroVideoVisible(isIntersecting: boolean, intersectionRatio: number) {
  return isIntersecting && intersectionRatio >= HERO_VIDEO_VISIBILITY_THRESHOLD;
}

/**
 * Hero promo clip playback: native audio, 85% volume, scroll-aware.
 *
 * The clip keeps its own embedded audio track (`<video>` without `muted`) — no
 * parallel `<audio>` element, so the browser's native media pipeline keeps A/V
 * locked. Playback is attempted unmuted at `volume = 0.85`; when the browser
 * blocks unmuted autoplay (`NotAllowedError`) the hook waits for a real user
 * gesture and then starts playback with sound, never surfacing an uncaught
 * rejection.
 *
 * An IntersectionObserver watches the clip's frame (not the window) at a 0.5
 * visibility ratio: below half visibility it pauses and mutes, returning to
 * ≥50% restores audio at 0.85 and resumes from the paused timestamp (pause/play
 * preserves `currentTime`, so `loop` keeps working). There is deliberately no
 * `window.addEventListener("scroll")`.
 *
 * Callback refs let the observer re-bind if the clip swaps/unmounts (e.g. the
 * poster-only fallback after a media error); cleanup disconnects the observer
 * and removes any pending autoplay-unlock listeners. The DOM nodes live in refs
 * (not state) because media properties are imperative.
 */
export function useHeroVideoAutopause() {
  const frameElRef = useRef<HTMLDivElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const [boundNodes, setBoundNodes] = useState(0);

  const frameRef = useCallback((node: HTMLDivElement | null) => {
    frameElRef.current = node;
    setBoundNodes((version) => version + 1);
  }, []);

  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    videoElRef.current = node;
    setBoundNodes((version) => version + 1);
  }, []);

  useEffect(() => {
    const frame = frameElRef.current;
    const video = videoElRef.current;
    if (!frame || !video) return;
    if (typeof IntersectionObserver === "undefined") return;

    let inView = false;
    let disposed = false;
    let waitingForGesture = false;

    /** Native track only — the element's own audio, calibrated to 85%. */
    const applyAudio = () => {
      video.muted = false;
      video.volume = HERO_VIDEO_VOLUME;
    };

    const handleUnlock = () => {
      removeUnlockListeners();
      if (!disposed && inView) playWithAudio();
    };

    const removeUnlockListeners = () => {
      waitingForGesture = false;
      for (const event of UNLOCK_EVENTS) {
        document.removeEventListener(event, handleUnlock, true);
      }
    };

    const waitForGesture = () => {
      if (waitingForGesture) return;
      waitingForGesture = true;
      for (const event of UNLOCK_EVENTS) {
        document.addEventListener(event, handleUnlock, true);
      }
    };

    const playWithAudio = () => {
      applyAudio();
      // Blocked autoplay rejects with NotAllowedError: arm the one-time gesture
      // listeners instead of letting the promise escape. AbortError (rapid
      // pause/play) needs no recovery.
      video.play().catch((error: unknown) => {
        if ((error as DOMException)?.name === "NotAllowedError") waitForGesture();
      });
    };

    applyAudio();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inView = isHeroVideoVisible(entry.isIntersecting, entry.intersectionRatio);

          if (!inView) {
            video.pause();
            video.muted = true;
            continue;
          }

          playWithAudio();
        }
      },
      { threshold: HERO_VIDEO_VISIBILITY_THRESHOLD },
    );

    observer.observe(frame);

    return () => {
      disposed = true;
      removeUnlockListeners();
      observer.disconnect();
    };
  }, [boundNodes]);

  return { frameRef, videoRef };
}
