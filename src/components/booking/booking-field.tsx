import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";

interface FieldProps {
  id: string;
  label: string;
  /** i18n key from `booking.error.*`; absent means the field is valid. */
  error?: string;
  children: ReactNode;
}

/** Label + control + inline error, wired with `aria-describedby`. */
export function Field({ id, label, error, children }: FieldProps) {
  const t = useTranslations("booking");

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
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
