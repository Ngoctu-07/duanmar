"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getBooking, type TripBooking } from "@/lib/booking-history";
import { buildTicketRows } from "@/components/booking/ticket-rows";
import type { BookingValues } from "@/components/booking/booking-validation";

interface MyTripsDetailProps {
  reference: string;
  locale: string;
}

/**
 * Detail view: renders the exact ticket rows the checkout summary shows,
 * rebuilt from the stored booking record.
 */
export function MyTripsDetail({ reference, locale }: MyTripsDetailProps) {
  const t = useTranslations("myTrips");
  const bookingT = useTranslations("booking");
  const [booking, setBooking] = useState<TripBooking | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage read must run after mount
    setBooking(getBooking(reference));
    setLoaded(true);
  }, [reference]);

  if (!loaded) return null;

  if (!booking) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Link
          href="/my-trips"
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  const values: BookingValues = {
    fullName: booking.fullName,
    email: booking.email,
    phone: booking.phone,
    notes: booking.notes,
    travelDate: booking.travelDate,
    guests: String(booking.guests),
    difficulty: booking.difficulty,
  };

  const rows = buildTicketRows({
    t: bookingT,
    reference: booking.reference,
    tourName: booking.tourName,
    values,
    guestCount: booking.guests,
    total: booking.total,
    locale,
    currency: booking.currency,
  });

  return (
    <section
      aria-labelledby="trip-detail-heading"
      className="rounded-xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="trip-detail-heading"
          className="text-sm font-semibold uppercase tracking-widest text-destructive"
        >
          {t("detailTitle")}
        </h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {t("paidBadge")}
        </span>
      </div>

      <p className="mt-3 text-lg font-semibold">{booking.tourName}</p>

      <dl className="mt-4 divide-y divide-border text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 py-2.5"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={`text-right tabular-nums ${
                row.strong ? "font-semibold text-destructive" : "font-medium"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <Link
        href="/my-trips"
        className="mt-4 inline-block text-sm text-primary hover:underline"
      >
        {t("back")}
      </Link>
    </section>
  );
}
