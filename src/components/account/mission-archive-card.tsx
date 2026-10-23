"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TripBooking } from "@/lib/booking-history";
import { formatTravelDate } from "@/lib/date-window";
import { formatMissionDuration, resolveMissionTelemetry } from "@/lib/missions";
import { cn } from "cn";

interface MissionArchiveCardProps {
  booking: TripBooking;
  locale: string;
}

/**
 * One archived mission: tour, outcome badge, clear time and clues used.
 * Success renders neon green (`#00FF66`), failure vivid red (`#FF0000`).
 */
export function MissionArchiveCard({ booking, locale }: MissionArchiveCardProps) {
  const t = useTranslations("account");
  const telemetry = resolveMissionTelemetry(booking);
  const success = telemetry.outcome === "success";

  return (
    <li
      data-mission-status={telemetry.outcome}
      className="rounded-none border border-white/10 bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-base font-semibold text-white">{booking.tourName}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {formatTravelDate(booking.travelDate, locale)}
          </p>
        </div>
        <span
          className={cn(
            "border px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.18em]",
            success ? "border-[#00FF66]/40 text-[#00FF66]" : "border-[#FF0000]/40 text-[#FF0000]"
          )}
        >
          {success ? t("missionAccomplished") : t("missionFailed")}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {t("clearTime")}
          </dt>
          <dd className="mt-1 font-condensed text-lg tabular-nums text-white">
            {formatMissionDuration(telemetry.clearTimeMs)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {t("clues")}
          </dt>
          <dd className="mt-1 font-condensed text-lg tabular-nums text-white">
            {telemetry.cluesUsed}/{telemetry.cluesTotal}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/my-trips/${booking.reference}`}
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-primary hover:underline"
        >
          {t("viewTicket")} →
        </Link>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {t("archiveNote")}
        </span>
      </div>
    </li>
  );
}
