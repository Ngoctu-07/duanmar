"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Luggage, Menu, Search } from "lucide-react";

const navItems = [
  { key: "home", href: "/" },
  { key: "domesticTours", href: "/tours/domestic" },
  { key: "internationalTours", href: "/tours/international" },
  { key: "deals", href: "/deals" },
  { key: "blog", href: "/blog" },
];

export function Header() {
  const t = useTranslations("common");
  const mt = useTranslations("myTrips");
  const pathname = usePathname();

  // Self-refresh: clicking Home while already on the homepage must visibly
  // reload (hard reload) instead of being a no-op client-side navigation.
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" aria-label="DuanMar" className="flex items-center gap-2">
          <span className="relative inline-flex h-9 w-9 shrink-0">
            <BrandLogo size={36} priority />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center font-brand text-[7px] font-bold leading-none text-foreground opacity-35"
            >
              DuanMar
            </span>
          </span>
          <BrandWordmark className="text-xl font-bold" />
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={item.href === "/" ? handleHomeClick : undefined}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(item.key as keyof typeof t)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
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

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" />
              }
            >
              <Menu className="size-6 stroke-[1.5]" />
              <span className="sr-only">{t("menu")}</span>
            </SheetTrigger>
            <SheetContent side="right">
              <LocaleSwitcher />
              <Link
                href="/search"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Search className="h-5 w-5 stroke-[1.5]" />
                {t("search")}
              </Link>
              <Link
                href="/my-trips"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Luggage className="h-5 w-5 stroke-[1.5]" />
                {mt("navLabel")}
              </Link>
              <nav className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={item.href === "/" ? handleHomeClick : undefined}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
