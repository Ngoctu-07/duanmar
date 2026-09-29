import { cn } from "cn";

/** Brand wordmark — Sora display face, single source for "DuanMar" in the UI. */
export function BrandWordmark({ className }: { className?: string }) {
  return <span className={cn("font-brand", className)}>DuanMar</span>;
}
