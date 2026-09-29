import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
});

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DuanMar",
  description: "Discover Vietnam - Your Premier Travel Destination",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${inter.variable} ${sora.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
