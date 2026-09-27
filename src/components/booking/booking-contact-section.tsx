import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, describedBy } from "./booking-field";
import type { BookingErrors, BookingField, BookingValues } from "./booking-validation";

interface BookingContactSectionProps {
  values: BookingValues;
  errors: BookingErrors;
  onChange: (field: BookingField, value: string) => void;
}

export function BookingContactSection({
  values,
  errors,
  onChange,
}: BookingContactSectionProps) {
  const t = useTranslations("booking");

  return (
    <section
      aria-labelledby="booking-contact-heading"
      className="rounded-xl border bg-card p-5"
    >
      <h2
        id="booking-contact-heading"
        className="text-sm font-semibold uppercase tracking-widest text-destructive"
      >
        {t("contactTitle")}
      </h2>

      <div className="mt-4 grid gap-4">
        <Field id="booking-full-name" label={t("fullName")} error={errors.fullName}>
          <Input
            id="booking-full-name"
            name="fullName"
            value={values.fullName}
            onChange={(event) => onChange("fullName", event.target.value)}
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={describedBy("booking-full-name", errors.fullName)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="booking-email" label={t("email")} error={errors.email}>
            <Input
              id="booking-email"
              name="email"
              type="email"
              inputMode="email"
              value={values.email}
              onChange={(event) => onChange("email", event.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy("booking-email", errors.email)}
            />
          </Field>

          <Field id="booking-phone" label={t("phone")} error={errors.phone}>
            <Input
              id="booking-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={describedBy("booking-phone", errors.phone)}
            />
          </Field>
        </div>

        <Field id="booking-notes" label={t("notes")}>
          <Textarea
            id="booking-notes"
            name="notes"
            rows={3}
            maxLength={500}
            value={values.notes}
            placeholder={t("notesPlaceholder")}
            onChange={(event) => onChange("notes", event.target.value)}
          />
        </Field>
      </div>
    </section>
  );
}
