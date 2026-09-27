"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (locale: string) => {
    const query = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`${pathname}${query}`, { locale });
  };

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex items-center rounded-md border text-xs font-medium"
    >
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchLocale(locale)}
          className="px-2 py-1 uppercase transition-colors hover:bg-muted data-[active=true]:bg-muted data-[active=true]:text-foreground text-muted-foreground"
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
