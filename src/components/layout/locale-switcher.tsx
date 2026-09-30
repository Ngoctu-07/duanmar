"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const activeLocale = useLocale();

  const switchLocale = (locale: string) => {
    const query = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`${pathname}${query}`, { locale });
  };

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex items-center overflow-hidden rounded-md border text-xs"
    >
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchLocale(locale)}
          data-active={locale === activeLocale}
          aria-current={locale === activeLocale ? "true" : undefined}
          className="px-2.5 py-1.5 font-normal uppercase text-muted-foreground opacity-60 transition-colors hover:bg-muted data-[active=true]:bg-muted data-[active=true]:font-semibold data-[active=true]:opacity-100 data-[active=true]:text-foreground"
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
