"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useHeroReveal } from "@/components/layout/use-hero-reveal";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Home, Menu, Search, UserRound } from "lucide-react";

const navItems = [
  { key: "home", href: "/" },
  { key: "domesticTours", href: "/tours/domestic" },
  { key: "internationalTours", href: "/tours/international" },
  { key: "deals", href: "/deals" },
  { key: "howToBook", href: "/support#how-to-book" },
  { key: "blog", href: "/blog" },
];

export function Header() {
  const t = useTranslations("common");
  const at = useTranslations("account");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Homepage-only dual state. Above 50% of the hero the bar is a frameless
  // transparent overlay that paints ONLY the centered nav links ("floating").
  // Past the threshold the solid sticky bar (logo + links + utilities) slides
  // down. Off the homepage it is always fully revealed.
  const isHome = pathname === "/";
  const revealed = useHeroReveal();
  const floating = isHome && !revealed;

  // Hash hrefs (e.g. /support#how-to-book) match their base route so the
  // 5-step booking guide stays highlighted while reading /support.
  const isActive = (href: string) => {
    const clean = href.split("#")[0] || "/";
    return clean === "/"
      ? pathname === "/"
      : pathname === clean || pathname?.startsWith(`${clean}/`);
  };

  const linkClass = (href: string, overHero = false) => {
    if (overHero) {
      return isActive(href)
        ? "font-bold text-white transition-colors"
        : "font-medium text-white/70 hover:text-white transition-colors";
    }
    return isActive(href)
      ? "font-bold text-foreground transition-colors"
      : "font-medium text-muted-foreground hover:text-foreground transition-colors";
  };

  // Self-refresh: clicking Home while already on the homepage must visibly
  // reload (hard reload) instead of being a no-op client-side navigation.
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.location.reload();
    }
  };

  return (
    <header
      data-header-home={isHome ? "true" : "false"}
      data-header-revealed={revealed ? "true" : "false"}
      data-header-floating={floating ? "true" : "false"}
      className="sticky top-0 z-50 w-full overflow-x-clip print:hidden"
    >
      {/*
        Solid bar backdrop. Parked fully above the viewport while the hero is
        in view, so State A paints no fill, no blur and no border line — only
        the centered links remain. Past 50% of the hero it slides down (300ms)
        and brings the dark sticky bar with it.
      */}
      <div
        aria-hidden
        data-testid="header-backdrop"
        className={`pointer-events-none absolute inset-0 -z-10 border-b border-border bg-background/95 backdrop-blur transition-transform duration-300 ease-out will-change-transform supports-[backdrop-filter]:bg-background/60 ${
          revealed ? "translate-y-0" : "-translate-y-full"
        }`}
      />
      <div className="container mx-auto grid h-16 min-w-0 grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-4">
        <div
          aria-hidden={floating || undefined}
          className={`flex items-center gap-1 justify-self-start transition-opacity duration-300 ${
            floating ? "pointer-events-none invisible opacity-0" : "opacity-100"
          }`}
        >
          <Link href="/" aria-label="DuanMar" onClick={handleHomeClick} className="flex items-center gap-2">
            <span className="relative inline-flex h-9 w-9 shrink-0">
              <BrandLogo size={36} priority />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center justify-center font-brand text-[7px] font-bold leading-none text-foreground opacity-35"
              >
                DuanMar
              </span>
            </span>
            <BrandWordmark className="text-lg font-bold sm:text-xl" />
          </Link>
          <Link
            href="/"
            onClick={handleHomeClick}
            aria-label={t("home")}
            className="inline-flex size-8 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            <Home className="size-5 stroke-[1.5]" />
          </Link>
        </div>

        <nav
          aria-label="Primary"
          data-testid="header-nav"
          className="hidden min-w-0 items-center justify-center gap-8 justify-self-center md:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={item.href === "/" ? handleHomeClick : undefined}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`whitespace-nowrap text-sm ${linkClass(item.href, floating)}`}
            >
              {t(item.key as keyof typeof t)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 justify-self-end sm:gap-2 md:gap-4">
          <div
            aria-hidden={floating || undefined}
            data-testid="header-utilities"
            className={`flex items-center gap-1 transition-opacity duration-300 sm:gap-2 md:gap-4 ${
              floating ? "pointer-events-none invisible opacity-0" : "opacity-100"
            }`}
          >
            <HoverTooltip label={t("search")}>
              <Button
                variant="ghost"
                size="icon"
                nativeButton={false}
                render={<Link href="/search" />}
                aria-label={t("search")}
                className="hidden md:inline-flex"
              >
                <Search className="size-6 stroke-[1.5]" />
              </Button>
            </HoverTooltip>
            <HoverTooltip label={at("navLabel")}>
              <Button
                variant="ghost"
                size="icon"
                nativeButton={false}
                render={<Link href="/account" />}
                aria-label={at("navLabel")}
                className="hidden md:inline-flex"
              >
                <UserRound className="size-6 stroke-[1.5]" />
              </Button>
            </HoverTooltip>
            <LocaleSwitcher />
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" />
              }
            >
              <Menu className="size-6 stroke-[1.5]" />
              <span className="sr-only">{t("menu")}</span>
            </SheetTrigger>
            <SheetContent side="right" className="px-6">
              <div className="flex items-center gap-2 pl-1 pt-1">
                <LocaleSwitcher />
              </div>
              <Link
                href="/search"
                onClick={() => setOpen(false)}
                aria-current={isActive("/search") ? "page" : undefined}
                className={`flex items-center gap-2 pl-1 text-sm ${linkClass("/search")}`}
              >
                <Search className="h-5 w-5 stroke-[1.5]" />
                {t("search")}
              </Link>
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                aria-current={isActive("/account") ? "page" : undefined}
                className={`flex items-center gap-2 pl-1 text-sm ${linkClass("/account")}`}
              >
                <UserRound className="h-5 w-5 stroke-[1.5]" />
                {at("navLabel")}
              </Link>
              <nav className="flex flex-col space-y-4 pl-1">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={(e) => {
                      setOpen(false);
                      if (item.href === "/") handleHomeClick(e);
                    }}
                    className={`text-sm ${linkClass(item.href)}`}
                  >
                    {t(item.key as keyof typeof t)}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
