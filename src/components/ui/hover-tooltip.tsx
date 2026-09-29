import type { ReactNode } from "react";

/**
 * Lightweight accessible hover tooltip (pure CSS, zero deps, plan 260929-2207).
 * The trigger keeps its own aria-label for screen readers; the visual pill
 * is aria-hidden and appears on hover OR keyboard focus (group-focus-within).
 */
export function HoverTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
