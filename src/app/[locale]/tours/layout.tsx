import type { ReactNode } from "react";

/**
 * Shared shell for /tours/domestic and /tours/international: owns the page
 * container. Category navigation lives exclusively in the global header; each
 * page runs its own strict category query.
 */
export default function ToursLayout({ children }: { children: ReactNode }) {
  return <div className="container mx-auto px-4 py-16">{children}</div>;
}
