import { createContext, useContext, useEffect, useState, type CSSProperties } from "react";
import {
  DayButton,
  DayPicker,
  labelDayButton as defaultLabelDayButton,
  type DayButtonProps,
} from "react-day-picker";
import { enUS, vi } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { useTranslations } from "next-intl";
import {
  formatTravelDate,
  parseIsoDate,
  toIsoDate,
  travelDateWindow,
} from "@/lib/date-window";
import {
  isDateBookable,
  remainingSlots,
  type TourCapacity,
} from "@/lib/tour-capacity";
import { Field, describedBy } from "./booking-field";
import { isValidGuests } from "./booking-validation";

/** Theme the calendar with the app's accent (destructive red) instead of rdp blue. */
const RDP_THEME: CSSProperties = {
  "--rdp-accent-color": "var(--color-destructive)",
  "--rdp-accent-background-color": "var(--color-destructive)",
  "--rdp-disabled-opacity": "0.6",
} as CSSProperties;

/** Room for the day number plus the spots-left line under it (7×46 fits 375px). */
const CAPACITY_CELL: CSSProperties = {
  "--rdp-day-width": "46px",
  "--rdp-day-height": "56px",
  "--rdp-day_button-width": "44px",
  "--rdp-day_button-height": "54px",
} as CSSProperties;

interface BadgeInfo {
  text: string;
  soldOut: boolean;
}

/** Day number + optional spots-left line, shared with the ARIA label builder. */
type BadgeFor = (iso: string) => BadgeInfo | null;

const CapacityContext = createContext<BadgeFor | null>(null);

function CapacityDayButton(props: DayButtonProps) {
  const badgeFor = useContext(CapacityContext);
  const badge = badgeFor?.(toIsoDate(props.day.date)) ?? null;

  return (
    <DayButton {...props}>
      <span className="block">{props.children}</span>
      {badge && (
        <span
          className={`block max-w-full text-center text-[9px] font-medium leading-[1.1] ${
            badge.soldOut ? "text-destructive" : "text-muted-foreground"
          }`}
          data-testid="capacity-badge"
        >
          {badge.text}
        </span>
      )}
    </DayButton>
  );
}

interface TravelDateFieldProps {
  value: string;
  onChange: (iso: string) => void;
  /** i18n key from `booking.error.*`; absent means the field is valid. */
  error?: string;
  locale: string;
  /** Injected by tests; defaults to the real clock after mount. */
  today?: Date;
  /** `null`/absent = tour has no capacity configured → no badges, no extra disabled days. */
  capacity?: TourCapacity | null;
  /** Current guest count: dates with fewer spots left become unselectable. */
  guestCount?: number;
}

/**
 * Rolling 7-day window: days before tomorrow and more than 7 days out stay
 * visible in the calendar but render disabled (grayed, unclickable). With
 * capacity data the window also shows spots left per date and disables dates
 * that cannot host the requested guest count.
 */
export function TravelDateField({
  value,
  onChange,
  error,
  locale,
  today,
  capacity,
  guestCount = 1,
}: TravelDateFieldProps) {
  const t = useTranslations("booking");
  // The window comes from the render-side clock and timezone, so SSR would
  // disagree with the client on a UTC host (~7h/day) and break hydration. Wait
  // for mount before rendering anything window-dependent; tests inject `today`
  // (static markup never runs effects) and render immediately.
  const [ready, setReady] = useState(() => today !== undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gate SSR markup on the client clock
    setReady(true);
  }, []);
  const { min, max } = travelDateWindow(today ?? new Date());
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);

  const badgeFor: BadgeFor = (iso) => {
    if (iso < min || iso > max) return null;
    const remaining = remainingSlots(capacity ?? null, iso);
    if (remaining === null) return null;
    if (remaining === 0) return { text: t("soldOut"), soldOut: true };
    return { text: t("spotsLeft", { count: remaining }), soldOut: false };
  };

  if (!minDate || !maxDate) return null;

  const requestedGuests = isValidGuests(guestCount) ? guestCount : 1;
  const rdpLocale = locale.startsWith("vi") ? vi : enUS;
  // `labels` values may be a plain string override, so keep the callable one.
  const localeLabel = rdpLocale.labels?.labelDayButton;
  const labelFn =
    typeof localeLabel === "function" ? localeLabel : defaultLabelDayButton;

  return (
    <Field id="booking-travel-date" label={t("travelDateLabel")} error={error}>
      <CapacityContext.Provider value={badgeFor}>
        <div
          id="booking-travel-date"
          role="group"
          aria-label={t("travelDateLabel")}
          aria-describedby={describedBy("booking-travel-date", error)}
          className="w-fit rounded-lg border bg-background p-2"
          style={{ ...(capacity ? CAPACITY_CELL : {}), ...RDP_THEME }}
        >
          {ready ? (
            <DayPicker
              mode="single"
              selected={parseIsoDate(value) ?? undefined}
              onSelect={(day) => onChange(day ? toIsoDate(day) : "")}
              disabled={[
                { before: minDate },
                { after: maxDate },
                (date) =>
                  !isDateBookable(capacity ?? null, toIsoDate(date), requestedGuests),
              ]}
              startMonth={minDate}
              endMonth={maxDate}
              showOutsideDays
              locale={rdpLocale}
              components={{ DayButton: CapacityDayButton }}
              labels={{
                labelDayButton: (date, modifiers, options, dateLib) => {
                  const label = labelFn(date, modifiers, options, dateLib);
                  const badge = badgeFor(toIsoDate(date));
                  return badge ? `${label}, ${badge.text}` : label;
                },
              }}
              classNames={{
                day_button:
                  "flex flex-col items-center justify-center gap-0.5 rounded-full text-sm text-inherit transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-destructive disabled:cursor-not-allowed",
                selected:
                  "rounded-full bg-destructive font-semibold text-destructive-foreground",
                disabled: "text-muted-foreground",
                today: "font-medium text-destructive",
                outside: "text-muted-foreground",
                caption_label: "text-sm font-semibold",
                month_caption: "flex h-9 items-center justify-center",
                weekday: "text-muted-foreground",
              }}
            />
          ) : (
            /* Holds the layout while the window is still server-side unknown. */
            <div className="h-[300px]" aria-hidden="true" />
          )}
        </div>
      </CapacityContext.Provider>
      {value && (
        <p className="text-xs text-muted-foreground" data-testid="selected-date">
          {formatTravelDate(value, locale)}
        </p>
      )}
    </Field>
  );
}
