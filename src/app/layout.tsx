import type { Metadata } from "next";
import { Barlow_Semi_Condensed, Sora, Oswald } from "next/font/google";
import localFont from "next/font/local";
import { CrtStaticOverlay } from "@/components/layout/crt-static-overlay";
import "./globals.css";

// Global body/UI face: paragraphs, labels, descriptions and every generic UI
// element. Barlow Semi Condensed ships a Vietnamese subset, so both locales
// render with the same condensed voice (no per-locale fallback).
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-brand",
  display: "swap",
});

// Tall condensed accent face for prominent CTAs. Oswald has a Vietnamese
// subset, so accented fallback text never drops to the body font.
const oswald = Oswald({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-oswald",
  display: "swap",
});

// Hand-lettered display face for primary headings, editorial headings and tour
// titles (Gypsy Curse © Chad Savage, freeware). Self-hosted from
// `src/app/fonts`; the shipped file is a Vietnamese-localized build covering
// the full Vietnamese alphabet, so VI headings never fall back mid-word.
// Regenerate with `python scripts/build-vietnamese-gypsy-font.py`.
const gypsyCurse = localFont({
  src: "./fonts/gypsy-curse.woff2",
  variable: "--font-gypsy-curse",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DuanMar",
  description: "Discover Vietnam - Your Premier Travel Destination",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Dark mode is locked globally: `dark` is hardcoded here (no theme provider,
  // no toggle). The palette itself lives on `:root` in globals.css.
  return (
    <html
      className={`dark ${barlow.variable} ${sora.variable} ${oswald.variable} ${gypsyCurse.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {children}
        <CrtStaticOverlay />
      </body>
    </html>
  );
}
