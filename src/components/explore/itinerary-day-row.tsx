"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItineraryDayRowProps {
  title: string;
  meals?: string | null;
  /** False when the CMS day has no details — the row renders as plain text. */
  expandable: boolean;
  children?: ReactNode;
}

/**
 * One tour day in the detail-page itinerary accordion.
 *
 * Collapsed: title + meals on one line with a right chevron. Click expands the
 * panel smoothly by animating `grid-template-rows` 0fr → 1fr (no magic
 * max-height, so any content height animates in the same 300 ms) while the
 * chevron rotates 90° to point down. `prefers-reduced-motion` snaps both.
 *
 * Disclosure semantics: `button[aria-expanded]` + `aria-controls`, and the
 * collapsed panel is `aria-hidden` + `inert` so screen readers never read —
 * and keyboards can never reach — clipped text.
 */
export function ItineraryDayRow({
  title,
  meals,
  expandable,
  children,
}: ItineraryDayRowProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const heading = (
    <>
      <span className="block text-sm leading-snug font-semibold break-words">
        {title}
      </span>
      {meals ? (
        <span className="mt-1 block text-xs text-muted-foreground">{meals}</span>
      ) : null}
    </>
  );

  if (!expandable) {
    return (
      <li className="px-2 py-3">
        <h3 className="font-normal">{heading}</h3>
      </li>
    );
  }

  return (
    <li>
      <h3 className="font-normal">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1">{heading}</span>
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none",
              open && "rotate-90 text-link"
            )}
          />
        </button>
      </h3>
      <div
        id={panelId}
        aria-hidden={!open}
        // `inert` keeps clipped content unfocusable (aria-hidden alone does not).
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 px-2 pt-3 pb-4 text-sm leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </li>
  );
}
