import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, describedBy } from "./booking-field";
import type { BookingErrors, BookingField, BookingValues } from "./booking-validation";

interface BookingDifficultySectionProps {
  values: BookingValues;
  errors: BookingErrors;
  onChange: (field: BookingField, value: string) => void;
}

export function BookingDifficultySection({
  values,
  errors,
  onChange,
}: BookingDifficultySectionProps) {
  const t = useTranslations("booking");

  return (
    <section
      aria-labelledby="booking-difficulty-heading"
      className="rounded-xl border bg-card p-5"
    >
      <h2
        id="booking-difficulty-heading"
        className="text-sm font-semibold uppercase tracking-widest text-primary"
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
            value={values.difficulty || null}
            onValueChange={(value) => onChange("difficulty", String(value ?? ""))}
          >
            <SelectTrigger
              id="booking-difficulty"
              className="w-full"
              aria-invalid={Boolean(errors.difficulty)}
              aria-describedby={describedBy(
                "booking-difficulty",
                errors.difficulty
              )}
            >
              {/* base-ui Select.Value renders the raw value unless it is told how to label it */}
              <SelectValue>
                {(value: string | null) =>
                  value ? t(value) : t("difficultyPlaceholder")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">{t("easy")}</SelectItem>
              <SelectItem value="medium">{t("medium")}</SelectItem>
              <SelectItem value="hard">{t("hard")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </section>
  );
}
