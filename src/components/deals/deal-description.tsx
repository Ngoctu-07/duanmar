"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CLAMP_CLASS = "line-clamp-3";
const TRANSITION_MS = 300;

interface DealDescriptionProps {
  description: string;
  readMoreLabel: string;
  showLessLabel: string;
}

/**
 * Deal-card description with a 3-line preview and an inline expand/collapse
 * toggle.
 *
 * The card is a server component, so only this small leaf is client-side.
 * Overflow is measured against the rendered text (not character count): a
 * hidden clone is laid out at the same width with `line-clamp-3`, and its
 * full height is compared with its clamped height. This keeps the toggle
 * honest across card widths, font swaps and long promotional terms.
 *
 * Collapsing animates `max-height` from the full text height back to the
 * three-line height. The clamp class is applied only after that transition so
 * the text slides shut instead of snapping; expanding removes the clamp and
 * lets the same transition reveal the full copy. `prefers-reduced-motion`
 * skips the animation.
 */
export function DealDescription({
  description,
  readMoreLabel,
  showLessLabel,
}: DealDescriptionProps) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(true);
  const [overflowing, setOverflowing] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [fullHeight, setFullHeight] = useState<number | null>(null);

  // Measure the real rendered overflow. The clone is removed immediately, so
  // the card DOM never contains duplicate description text.
  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const width = text.clientWidth;
      if (width <= 0) return;

      const clone = text.cloneNode(true) as HTMLParagraphElement;
      clone.removeAttribute("id");
      clone.removeAttribute("data-testid");
      clone.setAttribute("aria-hidden", "true");
      clone.classList.remove(CLAMP_CLASS);
      Object.assign(clone.style, {
        position: "absolute",
        inset: "0 auto auto 0",
        width: `${width}px`,
        margin: "0",
        maxHeight: "none",
        overflow: "visible",
        visibility: "hidden",
        pointerEvents: "none",
        zIndex: "-1",
      });

      container.appendChild(clone);
      const full = clone.scrollHeight;

      clone.style.maxHeight = "";
      clone.style.overflow = "";
      clone.classList.add(CLAMP_CLASS);
      const collapsed = clone.clientHeight;
      clone.remove();

      if (cancelled) return;
      setFullHeight(Math.ceil(full) + 1);
      setCollapsedHeight(Math.ceil(collapsed));
      setOverflowing(full > collapsed + 1);
    };

    measure();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(container);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [description]);

  // Keep the clamp off while the collapse transition runs, then apply it so the
  // final three lines get their ellipsis. Expanding clears the timer.
  useEffect(() => {
    if (expanded || !overflowing || clamped) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => setClamped(true),
      reduceMotion ? 0 : TRANSITION_MS
    );
    return () => window.clearTimeout(timer);
  }, [expanded, overflowing, clamped]);

  const toggle = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setClamped(false);
    setExpanded(true);
  };

  const maxHeight = !overflowing
    ? undefined
    : expanded
      ? fullHeight ?? undefined
      : collapsedHeight ?? undefined;

  return (
    <div ref={containerRef} className="relative mt-3">
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out motion-reduce:transition-none"
        style={{ maxHeight }}
      >
        <p
          ref={textRef}
          id={panelId}
          data-testid="deal-description"
          className={cn("text-sm leading-relaxed text-body", clamped && CLAMP_CLASS)}
        >
          {description}
        </p>
      </div>
      {overflowing && (
        <button
          type="button"
          data-testid="deal-description-toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={toggle}
          className="mt-2 inline-flex text-xs font-medium text-link underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {expanded ? showLessLabel : readMoreLabel}
        </button>
      )}
    </div>
  );
}
