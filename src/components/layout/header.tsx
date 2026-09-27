"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Luggage, Menu, Search } from "lucide-react";

const navItems = [
  { key: "explore", href: "/explore" },
  { key: "planTrip", href: "/plan-your-trip" },
  { key: "culture", href: "/culture" },
  { key: "deals", href: "/deals" },
  { key: "news", href: "/news" },
  { key: "about", href: "/about" },
];

export function Header() {
  const t = useTranslations("common");
  const mt = useTranslations("myTrips");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Vietnam Tourism</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(item.key as keyof typeof t)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/search" />}
            aria-label={t("search")}
            className="hidden md:inline-flex"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/my-trips" />}
            aria-label={mt("navLabel")}
            className="hidden md:inline-flex"
          >
            <Luggage className="h-5 w-5" />
          </Button>
          <LocaleSwitcher />

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" />
              }
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t("menu")}</span>
            </SheetTrigger>
            <SheetContent side="right">
              <LocaleSwitcher />
              <Link
                href="/search"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Search className="h-4 w-4" />
                {t("search")}
              </Link>
              <Link
                href="/my-trips"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Luggage className="h-4 w-4" />
                {mt("navLabel")}
              </Link>
              <nav className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
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
