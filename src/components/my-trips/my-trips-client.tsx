"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  BOOKINGS_STORAGE_KEY,
  clearBookings,
  listBookings,
  type TripBooking,
} from "@/lib/booking-history";
import { formatTravelDate } from "@/lib/date-window";

interface MyTripsClientProps {
  locale: string;
}

/** Master view: one card per paid booking (tour name + travel date). */
export function MyTripsClient({ locale }: MyTripsClientProps) {
  const t = useTranslations("myTrips");
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load once on mount (after hydration, to avoid SSR mismatch)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage read must run after mount
    setBookings(listBookings());
    setLoaded(true);
  }, []);

  // Another tab booked or deleted → refresh in place (storage events only
  // fire cross-tab, so this never loops with our own writes).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== BOOKINGS_STORAGE_KEY) return;
      setBookings(listBookings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const deleteAll = () => {
    if (!window.confirm(t("deleteAllConfirm"))) return;
    clearBookings();
    setBookings([]);
  };

  if (!loaded) return null;

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link
          href="/explore/destinations"
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={deleteAll}>
          {t("deleteAll")}
        </Button>
      </div>
      <ul aria-label={t("listLabel")} className="grid gap-3">
        {bookings.map((booking) => (
          <li key={booking.reference}>
            <Link
              href={`/my-trips/${booking.reference}`}
              className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div>
                <p className="font-semibold">{booking.tourName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTravelDate(booking.travelDate, locale)}
                </p>
              </div>
              <span aria-hidden="true" className="text-muted-foreground">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
