"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  /** Override the toggle's test id when several toggles share a form. */
  toggleTestId?: string;
};

/**
 * Password field with an inline eye / eye-off toggle. The input starts as
 * `type="password"` and only this button flips it to `type="text"` — form
 * submissions and autofill keep their normal password semantics.
 *
 * Visibility state lives inside the component, so every instance toggles
 * independently even when several share the same form.
 */
export function PasswordInput({
  className,
  toggleTestId = "password-visibility-toggle",
  ...props
}: PasswordInputProps) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        data-testid={toggleTestId}
        className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-none text-white/55 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
