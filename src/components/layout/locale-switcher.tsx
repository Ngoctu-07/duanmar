"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Segmented EN / VI language switcher.
 *
 * `tone="inverse"` renders the light-on-dark variant used inside the zinc-900
 * footer bottom bar; the default tone keeps the theme-aware header styling.
 */
export function LocaleSwitcher({
  tone = "default",
}: {
  tone?: "default" | "inverse";
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const activeLocale = useLocale();
  const inverse = tone === "inverse";

  const switchLocale = (locale: string) => {
    const query = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`${pathname}${query}`, { locale });
  };

  const buttonClass = inverse
    ? "px-2.5 py-1.5 font-normal uppercase text-white/70 transition-colors hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:font-semibold data-[active=true]:text-white"
    : "px-2.5 py-1.5 font-normal uppercase text-muted-foreground opacity-60 transition-colors hover:bg-muted data-[active=true]:bg-muted data-[active=true]:font-semibold data-[active=true]:opacity-100 data-[active=true]:text-foreground";

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`flex items-center overflow-hidden rounded-none border text-xs ${
        inverse ? "border-white/20" : ""
      }`}
    >
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchLocale(locale)}
          data-active={locale === activeLocale}
          aria-current={locale === activeLocale ? "true" : undefined}
          className={buttonClass}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
