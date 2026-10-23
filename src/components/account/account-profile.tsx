"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  BOOKINGS_STORAGE_KEY,
  clearBookings,
  listBookings,
  mergeBookings,
  type TripBooking,
} from "@/lib/booking-history";
import { formatTravelDate } from "@/lib/date-window";
import { splitMissions } from "@/lib/missions";
import { MissionArchiveCard } from "@/components/account/mission-archive-card";

/**
 * Gamified PROFILE tab.
 *
 * Active missions = paid bookings until one day after their travel date;
 * afterwards they are filed into the mission archive with escape-room
 * telemetry (outcome, clear time, clues used). Account rows come from SQLite
 * (server-rendered), merged with this device's legacy localStorage cache;
 * local-only tickets are backfilled to the account once per mount.
 */
export function AccountProfile({ serverBookings }: { serverBookings: TripBooking[] }) {
  const t = useTranslations("account");
  const locale = useLocale();
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const backfilled = useRef(false);

  useEffect(() => {
    const local = listBookings();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hydration after mount
    setBookings(mergeBookings(serverBookings, local));
    setLoaded(true);

    // One-shot migration for tickets claimed before account persistence.
    if (!backfilled.current) {
      backfilled.current = true;
      const known = new Set(serverBookings.map((booking) => booking.reference));
      for (const booking of local) {
        if (known.has(booking.reference)) continue;
        void fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(booking),
        }).catch(() => undefined);
      }
    }
  }, [serverBookings]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== BOOKINGS_STORAGE_KEY) return;
      setBookings(mergeBookings(serverBookings, listBookings()));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [serverBookings]);

  const deleteAll = () => {
    if (!window.confirm(t("deleteAllConfirm"))) return;
    clearBookings();
    setBookings([]);
    void fetch("/api/bookings", { method: "DELETE" }).catch(() => undefined);
  };

  const { active, archive } = splitMissions(bookings);

  return (
    <div className="space-y-10">
      <section aria-label={t("activeTitle")}>
        <SectionHeading title={t("activeTitle")} subtitle={t("activeSubtitle")} count={active.length} />

        {!loaded ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
        ) : active.length === 0 ? (
          <div className="mt-4 rounded-none border border-dashed border-white/15 p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("activeEmpty")}</p>
            <Link
              href="/explore/destinations"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-none bg-primary px-6 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("activeCta")}
            </Link>
          </div>
        ) : (
          <ul aria-label={t("activeTitle")} className="mt-4 grid gap-3">
            {active.map((booking) => (
              <li key={booking.reference}>
                <Link
                  href={`/my-trips/${booking.reference}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-none border border-white/10 bg-card p-5 transition-colors hover:border-primary/60"
                >
                  <div className="min-w-0">
                    <p className="font-sans text-base font-semibold text-white">
                      {booking.tourName}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {formatTravelDate(booking.travelDate, locale)} ·{" "}
                      {t("guests", { count: booking.guests })}
                    </p>
                  </div>
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                    {t("viewTicket")} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={t("archiveTitle")}>
        <SectionHeading
          title={t("archiveTitle")}
          subtitle={t("archiveSubtitle")}
          count={archive.length}
        />

        {!loaded ? null : archive.length === 0 ? (
          <div className="mt-4 rounded-none border border-dashed border-white/15 p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("archiveEmpty")}</p>
          </div>
        ) : (
          <ul aria-label={t("archiveTitle")} className="mt-4 grid gap-3">
            {archive.map((booking) => (
              <MissionArchiveCard key={booking.reference} booking={booking} locale={locale} />
            ))}
          </ul>
        )}
      </section>

      {loaded && bookings.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={deleteAll}
            className="h-9 rounded-none border border-white/15 px-4 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60 transition-colors hover:border-primary hover:text-white"
          >
            {t("deleteAll")}
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3">
      <div>
        <h2 className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-white">
          <span aria-hidden className="mr-2 inline-block h-2 w-2 bg-primary align-middle" />
          {title}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span className="font-condensed text-sm tabular-nums text-primary">
        {String(count).padStart(2, "0")}
      </span>
    </div>
  );
}
