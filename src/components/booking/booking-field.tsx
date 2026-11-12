import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";

interface FieldProps {
  id: string;
  label: string;
  /** i18n key from `booking.error.*`; absent means the field is valid. */
  error?: string;
  /** Hide the visible label when a section heading already names the field
      (the control keeps its own accessible name). */
  hideLabel?: boolean;
  /** Marks the label with the required asterisk (white, matches the label). */
  required?: boolean;
  children: ReactNode;
}

/** Label + control + inline error, wired with `aria-describedby`. */
export function Field({
  id,
  label,
  error,
  hideLabel,
  required,
  children,
}: FieldProps) {
  const t = useTranslations("booking");

  return (
    <div className="grid gap-1.5">
      {!hideLabel && (
        <Label htmlFor={id}>
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-white">
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {t(`error.${error}`)}
        </p>
      )}
    </div>
  );
}

export const describedBy = (id: string, error?: string) =>
  error ? `${id}-error` : undefined;
