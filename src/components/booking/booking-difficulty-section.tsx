"use client";

import { useTranslations } from "next-intl";
import {
  BOOKING_DIFFICULTIES,
  bookingDifficultyKey,
  normalizeBookingDifficulty,
} from "@/lib/booking-difficulty";
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

/** Decorative tier meter — one to three lit segments, game-select style. */
function DifficultyMeter({ level, active }: { level: number; active: boolean }) {
  return (
    <span className="flex items-end gap-1" aria-hidden="true">
      {[1, 2, 3].map((segment) => (
        <span
          key={segment}
          className={`w-1.5 rounded-none border transition-colors ${
            segment <= level
              ? active
                ? "border-link bg-link"
                : "border-foreground/40 bg-foreground/30"
              : "border-border bg-transparent"
          }`}
          style={{ height: `${6 + segment * 4}px` }}
        />
      ))}
    </span>
  );
}

/**
 * Step 4 of checkout: exactly one difficulty per booking.
 *
 * The three cards are the only source of the value, so the persisted payload
 * always matches `"Easy" | "Medium" | "Hard"`. Selection is local to checkout
 * and is never read from (or written back to) the tour document.
 */
export function BookingDifficultySection({
  values,
  errors,
  onChange,
}: BookingDifficultySectionProps) {
  const t = useTranslations("booking");
  const selected = normalizeBookingDifficulty(values.difficulty);
  const errorId = "booking-difficulty-error";

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
      <p className="mt-2 text-sm text-muted-foreground">
        {t("difficultyHint")}
      </p>

      <div
        id="booking-difficulty"
        role="radiogroup"
        aria-labelledby="booking-difficulty-heading"
        aria-describedby={errors.difficulty ? errorId : undefined}
        className="mt-4 grid gap-3 sm:grid-cols-3"
      >
        {BOOKING_DIFFICULTIES.map((difficulty, index) => {
          const key = bookingDifficultyKey(difficulty);
          const isSelected = selected === difficulty;
          return (
            <button
              key={difficulty}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid="booking-difficulty-option"
              data-difficulty={difficulty}
              onClick={() => onChange("difficulty", difficulty)}
              className={`group flex min-h-28 flex-col items-start justify-between rounded-none border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link ${
                isSelected
                  ? "border-link bg-primary/15"
                  : "border-border bg-background hover:border-link/60 hover:bg-primary/5"
              }`}
            >
              <span className="flex w-full items-start justify-between gap-2">
                <span className="font-condensed text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <DifficultyMeter level={index + 1} active={isSelected} />
              </span>
              <span className="mt-4 flex w-full items-end justify-between gap-2">
                <span className="font-display text-xl uppercase leading-none tracking-tight text-heading">
                  {key ? t(key) : difficulty}
                </span>
                <span
                  aria-hidden="true"
                  className={`mb-0.5 h-2.5 w-2.5 border transition-colors ${
                    isSelected
                      ? "border-link bg-link"
                      : "border-muted-foreground bg-transparent"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>

      {errors.difficulty && (
        <p id={errorId} role="alert" className="mt-3 text-xs text-destructive">
          {t(`error.${errors.difficulty}`)}
        </p>
      )}
    </section>
  );
}
