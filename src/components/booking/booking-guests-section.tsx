import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Field, describedBy } from "./booking-field";
import type {
  BookingErrors,
  BookingField,
  BookingValues,
} from "./booking-validation";

interface BookingGuestsSectionProps {
  values: BookingValues;
  errors: BookingErrors;
  onChange: (field: BookingField, value: string) => void;
}

const MIN_GUESTS = 1;
const MAX_GUESTS = 99;

/**
 * Step 3 of checkout: guest count only. The price breakdown lives in the final
 * summary below the voucher step, so applying a voucher never hides the total
 * above the section that changes it.
 *
 * The −/+ controls are real buttons rather than the native number-input spin
 * buttons (which Chromium only reveals on hover/focus): always visible, touch
 * friendly, and identical across browsers.
 */
export function BookingGuestsSection({
  values,
  errors,
  onChange,
}: BookingGuestsSectionProps) {
  const t = useTranslations("booking");

  const parsed = Number(values.guests);
  const hasNumber = values.guests.trim() !== "" && Number.isFinite(parsed);
  const current = hasNumber
    ? Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, Math.floor(parsed)))
    : MIN_GUESTS;
  const canDecrease = !hasNumber || current > MIN_GUESTS;
  const canIncrease = !hasNumber || current < MAX_GUESTS;

  const stepBy = (delta: number) => {
    const next = Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, current + delta));
    onChange("guests", String(next));
  };

  // Shared control chrome keeps the two steppers identical and always opaque.
  const stepperClass =
    "flex w-10 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent text-foreground transition-colors hover:bg-muted active:bg-muted/70 disabled:cursor-not-allowed disabled:text-muted-foreground/50 disabled:hover:bg-transparent";

  return (
    <section
      aria-labelledby="booking-guests-heading"
      className="rounded-none border bg-card p-5"
    >
      <h2
        id="booking-guests-heading"
        className="text-sm font-semibold uppercase tracking-widest text-link"
      >
        {t("guestsTitle")}
      </h2>

      <div className="mt-4 max-w-40">
        <Field
          id="booking-guests"
          label={t("guests")}
          error={errors.guests}
          required
        >
          <div
            className={cn(
              "flex h-9 items-stretch rounded-none border border-input bg-transparent shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
              errors.guests &&
                "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
            )}
          >
            <button
              type="button"
              data-testid="guest-decrement"
              aria-label={t("decreaseGuests")}
              onClick={() => stepBy(-1)}
              disabled={!canDecrease}
              className={stepperClass}
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>

            {/* Native spin buttons stay hidden so only the explicit, always
                visible steppers above/below remain. */}
            <Input
              id="booking-guests"
              name="guests"
              type="number"
              inputMode="numeric"
              min={MIN_GUESTS}
              max={MAX_GUESTS}
              step={1}
              value={values.guests}
              onChange={(event) => onChange("guests", event.target.value)}
              aria-invalid={Boolean(errors.guests)}
              aria-describedby={describedBy("booking-guests", errors.guests)}
              className="h-9 rounded-none border-0 bg-transparent px-0 text-center shadow-none [appearance:textfield] focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />

            <button
              type="button"
              data-testid="guest-increment"
              aria-label={t("increaseGuests")}
              onClick={() => stepBy(1)}
              disabled={!canIncrease}
              className={stepperClass}
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
        </Field>
      </div>
    </section>
  );
}
