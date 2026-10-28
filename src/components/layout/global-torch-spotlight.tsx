"use client";

import { useEffect, useRef } from "react";

/**
 * Global emissive torch + hidden lore layer.
 *
 * Sits behind the whole app (fixed, z-index -1) and replaces the old dark
 * vignette: outside the beam the layer paints pitch-black #060606, while a
 * 200px radial mask reveals the lore texture (Hua mansion plans, Lawang Sewu
 * arches, Mae Nak notes) only under the pointer.
 *
 * - `pointermove` only records coordinates; one requestAnimationFrame tick
 *   writes `--mouse-x` / `--mouse-y`, so bursts cost one style write per frame.
 * - Focusing any input, textarea, select, contenteditable, form or dialog pauses
 *   the effect (`data-paused`) and freezes updates until focus leaves.
 * - Touch / coarse pointers and `prefers-reduced-motion` get a static, dimmer
 *   centred glow with no pointer listeners.
 *
 * Decorative only: `aria-hidden`, `pointer-events-none`, behind all content, so
 * text contrast is untouched.
 */

const CENTRE = 50;
const EXCLUSION_SELECTOR = [
  "input",
  "textarea",
  "select",
  "form",
  "[contenteditable='true']",
  "[role='dialog']",
  "[data-torch-pause]",
].join(",");

export function GlobalTorchSpotlight() {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let nextX = CENTRE;
    let nextY = CENTRE;
    let paused = false;

    const paint = () => {
      frame = 0;
      layer.style.setProperty("--mouse-x", `${nextX.toFixed(2)}%`);
      layer.style.setProperty("--mouse-y", `${nextY.toFixed(2)}%`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (paused || event.pointerType === "touch") return;
      nextX = (event.clientX / window.innerWidth) * 100;
      nextY = (event.clientY / window.innerHeight) * 100;
      if (frame === 0) frame = window.requestAnimationFrame(paint);
    };

    const clearTracking = () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      layer.style.removeProperty("--mouse-x");
      layer.style.removeProperty("--mouse-y");
    };

    const syncExclusion = () => {
      const active = document.activeElement;
      paused =
        active instanceof HTMLElement &&
        active !== document.body &&
        active.closest(EXCLUSION_SELECTOR) !== null;
      layer.dataset.paused = paused ? "true" : "false";
      if (paused && frame !== 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const onFocusOut = () => {
      // activeElement is still the old node during focusout; re-check next frame.
      window.requestAnimationFrame(syncExclusion);
    };

    const syncMode = () => {
      if (finePointer.matches && !reducedMotion.matches) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
      } else {
        window.removeEventListener("pointermove", onPointerMove);
        clearTracking();
      }
    };

    syncMode();
    syncExclusion();
    finePointer.addEventListener("change", syncMode);
    reducedMotion.addEventListener("change", syncMode);
    document.addEventListener("focusin", syncExclusion);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      finePointer.removeEventListener("change", syncMode);
      reducedMotion.removeEventListener("change", syncMode);
      document.removeEventListener("focusin", syncExclusion);
      document.removeEventListener("focusout", onFocusOut);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      aria-hidden
      data-testid="global-torch"
      className="global-torch pointer-events-none fixed inset-0 overflow-hidden"
    >
      <div data-testid="global-torch-reveal" className="global-torch-reveal" />
      <div className="global-torch-glow" />
    </div>
  );
}
