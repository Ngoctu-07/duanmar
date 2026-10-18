"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useHeroReveal } from "@/components/layout/use-hero-reveal";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Home, Luggage, Menu, Search } from "lucide-react";

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
  const mt = useTranslations("myTrips");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Homepage-only: the header stays transparent/hidden over the full-viewport
  // hero and slides down once the visitor scrolls past 50% of the hero height.
  // Off the homepage it is always visible. Shared with the assistant widget so
  // both chrome elements reveal on the exact same scroll state.
  const isHome = pathname === "/";
  const revealed = useHeroReveal();

  // Hash hrefs (e.g. /support#how-to-book) match their base route so the
  // 5-step booking guide stays highlighted while reading /support.
  const isActive = (href: string) => {
    const clean = href.split("#")[0] || "/";
    return clean === "/"
      ? pathname === "/"
      : pathname === clean || pathname?.startsWith(`${clean}/`);
  };

  const linkClass = (href: string) =>
    isActive(href)
      ? "font-bold text-foreground transition-colors"
      : "font-medium text-muted-foreground hover:text-foreground transition-colors";

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
      className={`sticky top-0 z-50 w-full overflow-x-clip border-b bg-background/95 backdrop-blur transition-transform duration-300 will-change-transform supports-[backdrop-filter]:bg-background/60 print:hidden ${
        revealed ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="container mx-auto flex h-16 min-w-0 items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-1">
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
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            <Home className="size-5 stroke-[1.5]" />
          </Link>
        </div>

        <nav aria-label="Primary" className="hidden min-w-0 flex-1 items-center justify-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={item.href === "/" ? handleHomeClick : undefined}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`whitespace-nowrap text-sm ${linkClass(item.href)}`}
            >
              {t(item.key as keyof typeof t)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
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
          <HoverTooltip label={mt("navLabel")}>
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={<Link href="/my-trips" />}
              aria-label={mt("navLabel")}
              className="hidden md:inline-flex"
            >
              <Luggage className="size-6 stroke-[1.5]" />
            </Button>
          </HoverTooltip>
          <LocaleSwitcher />
          <ThemeSwitcher />

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
                <ThemeSwitcher />
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
                href="/my-trips"
                onClick={() => setOpen(false)}
                aria-current={isActive("/my-trips") ? "page" : undefined}
                className={`flex items-center gap-2 pl-1 text-sm ${linkClass("/my-trips")}`}
              >
                <Luggage className="h-5 w-5 stroke-[1.5]" />
                {mt("navLabel")}
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
