"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Global theme provider: class-based (`dark` on `<html>`), default dark to
 * preserve the brand vibe, no system sniffing (explicit user choice only),
 * persisted by next-themes in localStorage. The hardcoded `dark` class in
 * `src/app/layout.tsx` stays as the pre-hydration/no-JS fallback.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
