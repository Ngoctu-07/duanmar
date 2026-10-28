"use client";

import { useEffect, useRef } from "react";

/**
 * Minimal inverted laser cursor.
 *
 * A single 8px white dot with `mix-blend-mode: difference`: white on the dark
 * #060606 canvas, black over white copy or bright UI, and an automatic hue flip
 * over coloured surfaces. There are deliberately no rings, glows, labels or
 * trailing ghosts.
 *
 * - The native cursor is hidden only on fine pointers (`html.laser-cursor-active`),
 *   so touch and keyboard users keep the browser default.
 * - `pointermove` is passive and only records the viewport coordinates; one
 *   `requestAnimationFrame` tick writes `--cursor-x` / `--cursor-y`, keeping the
 *   transform on the compositor (`translate3d` + `translate(-50%, -50%)`).
 * - `pointer-events: none` means buttons, links and inputs still receive every
 *   click/hover untouched.
 * - The dot is hidden until the first real pointer move and again on blur or
 *   when the pointer leaves the document, so it never parks at (0, 0).
 * - Coarse pointers never mount tracking; CSS additionally hides the element.
 */

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

export function InvertedLaserCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;

    const finePointer = window.matchMedia(FINE_POINTER);
    const root = document.documentElement;
    let frame = 0;
    let x = -100;
    let y = -100;

    const paint = () => {
      frame = 0;
      dot.style.setProperty("--cursor-x", `${x}px`);
      dot.style.setProperty("--cursor-y", `${y}px`);
    };

    const showAt = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      x = event.clientX;
      y = event.clientY;
      // Hide the platform cursor only once the dot can actually replace it, so
      // loading a page without moving the mouse never leaves a cursorless UI.
      root.classList.add("laser-cursor-active");
      if (dot.dataset.visible !== "true") dot.dataset.visible = "true";
      if (frame === 0) frame = window.requestAnimationFrame(paint);
    };

    const hide = () => {
      root.classList.remove("laser-cursor-active");
      dot.dataset.visible = "false";
    };

    const syncMode = () => {
      const enabled = finePointer.matches;
      dot.dataset.enabled = enabled ? "true" : "false";
      if (enabled) {
        window.addEventListener("pointermove", showAt, { passive: true });
      } else {
        window.removeEventListener("pointermove", showAt);
        hide();
      }
    };

    const onLeave = () => hide();
    const onBlur = () => hide();

    syncMode();
    finePointer.addEventListener("change", syncMode);
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("pointermove", showAt);
      finePointer.removeEventListener("change", syncMode);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onBlur);
      root.classList.remove("laser-cursor-active");
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      aria-hidden
      data-testid="laser-cursor"
      data-visible="false"
      className="laser-cursor h-2 w-2 rounded-full"
    />
  );
}
