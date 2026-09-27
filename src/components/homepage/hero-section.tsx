"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Image from "next/image";

interface HeroProps {
  hero?: {
    heroTitle?: string;
    heroSubtitle?: string;
    heroImage?: { asset?: { url: string } };
  };
}

export function HeroSection({ hero }: HeroProps) {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <section className="relative h-[600px] bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {hero?.heroImage?.asset?.url && (
        <div className="absolute inset-0 z-0">
          <Image
            src={hero.heroImage.asset.url}
            alt={hero.heroTitle || t("heroTitle")}
            fill
            className="object-cover opacity-30"
            priority
            sizes="100vw"
          />
        </div>
      )}
      <div className="container mx-auto flex h-full items-center justify-center px-4 relative z-10">
        <div className="text-center space-y-6 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            {hero?.heroTitle || t("heroTitle")}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            {hero?.heroSubtitle || t("heroSubtitle")}
          </p>

          <form
            action={`/${locale}/search`}
            method="GET"
            className="relative max-w-xl mx-auto"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full h-12 pl-10 pr-4 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </form>

          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" nativeButton={false} render={<Link href="/explore" />}>
              {t("exploreNow")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
