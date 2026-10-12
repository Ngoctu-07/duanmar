"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

/**
 * Minimalist theme switcher modeled on `LocaleSwitcher`: a segmented
 * Moon | Sun group. The active mode renders prominent (solid pill,
 * full opacity, bolder stroke); the inactive one is muted (opacity-50,
 * thinner stroke) so the current setting is instantly recognizable.
 */
export function ThemeSwitcher() {
  const t = useTranslations("nav");
  const { resolvedTheme, setTheme } = useTheme();
  const active: "dark" | "light" =
    resolvedTheme === "light" ? "light" : "dark";

  const modes = [
    { value: "dark", label: t("darkMode"), Icon: Moon },
    { value: "light", label: t("lightMode"), Icon: Sun },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("theme")}
      data-testid="theme-switcher"
      className="flex items-center overflow-hidden rounded-md border text-xs"
    >
      {modes.map(({ value, label, Icon }) => {
        const isActive = value === active;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            data-testid={`theme-switcher-${value}`}
            data-active={isActive}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            className="p-1.5 text-muted-foreground opacity-50 transition-colors hover:bg-muted data-[active=true]:bg-muted data-[active=true]:opacity-100 data-[active=true]:text-foreground"
          >
            <Icon
              className="size-4"
              strokeWidth={isActive ? 2.5 : 1.5}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
