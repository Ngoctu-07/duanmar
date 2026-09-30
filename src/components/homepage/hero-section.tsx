"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buildToursHref } from "@/lib/tour-search";
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Submit (button click or Enter) → tour listing filtered by the typed query.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildToursHref(searchQuery));
  };

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

          <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 stroke-[1.5] -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="w-full h-12 pl-10 pr-4 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button type="submit" size="lg" className="px-7 py-3.5 text-sm">
                {t("exploreNow")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
