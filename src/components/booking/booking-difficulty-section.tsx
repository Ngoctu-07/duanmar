"use client";

import { useTranslations } from "next-intl";
import {
  BOOKING_DIFFICULTIES,
  bookingDifficultyKey,
  normalizeBookingDifficulty,
} from "@/lib/booking-difficulty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, describedBy } from "./booking-field";
import type {
  BookingErrors,
  BookingField,
  BookingValues,
} from "./booking-validation";

interface BookingDifficultySectionProps {
  values: BookingValues;
  errors: BookingErrors;
  onChange: (field: BookingField, value: string) => void;
}

/**
 * Step 4 of checkout: one standard dropdown for the booking-time difficulty.
 *
 * The value is local to checkout and is never read from (or written back to)
 * the tour document. Options use the capitalized persisted contract.
 */
export function BookingDifficultySection({
  values,
  errors,
  onChange,
}: BookingDifficultySectionProps) {
  const t = useTranslations("booking");
  const selected = normalizeBookingDifficulty(values.difficulty);

  return (
    <section
      aria-labelledby="booking-difficulty-heading"
      className="rounded-none border bg-card p-5"
    >
      <h2
        id="booking-difficulty-heading"
        className="text-sm font-semibold uppercase tracking-widest text-link"
      >
        {t("difficultyTitle")}
      </h2>

      <div className="mt-4 max-w-xs">
        <Field
          id="booking-difficulty"
          label={t("difficulty")}
          error={errors.difficulty}
        >
          <Select
            value={selected}
            onValueChange={(value) => onChange("difficulty", String(value ?? ""))}
          >
            <SelectTrigger
              id="booking-difficulty"
              className="w-full rounded-none border-input bg-card font-sans text-foreground dark:bg-card"
              aria-invalid={Boolean(errors.difficulty)}
              aria-describedby={describedBy(
                "booking-difficulty",
                errors.difficulty
              )}
            >
              <SelectValue>
                {(value: string | null) =>
                  value
                    ? t(bookingDifficultyKey(value) ?? "difficulty")
                    : t("difficultyPlaceholder")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {BOOKING_DIFFICULTIES.map((difficulty) => (
                <SelectItem
                  key={difficulty}
                  value={difficulty}
                  data-difficulty={difficulty}
                  data-testid="booking-difficulty-option"
                >
                  {t(bookingDifficultyKey(difficulty) ?? "difficulty")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </section>
  );
}
