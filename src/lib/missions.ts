import type { TripBooking } from "@/lib/booking-history";
import { addDays, parseIsoDate, toIsoDate } from "@/lib/date-window";

/**
 * Trip gamification rules for the account "missions" view.
 *
 * A paid booking stays an ACTIVE mission until one full day after its travel
 * date (`travelDate + 1`), then moves to the MISSION ARCHIVE. Pure helpers so
 * the split and telemetry can be unit-tested without a browser.
 */

export const MISSION_ARCHIVE_DELAY_DAYS = 1;
export const MISSION_TOTAL_CLUES = 10;

export type MissionOutcome = "success" | "failed";

export interface MissionTelemetry {
  outcome: MissionOutcome;
  /** Milliseconds from insertion to extraction. */
  clearTimeMs: number;
  cluesUsed: number;
  cluesTotal: number;
}

/** True once the day AFTER the travel date has started. */
export function isMissionArchived(travelDate: string, today = new Date()): boolean {
  const travel = parseIsoDate(travelDate);
  if (!travel) return false;
  return toIsoDate(addDays(travel, MISSION_ARCHIVE_DELAY_DAYS)) <= toIsoDate(today);
}

export interface SplitMissions {
  /** Upcoming or in-flight trips — soonest travel date first. */
  active: TripBooking[];
  /** Completed trips — most recent first. */
  archive: TripBooking[];
}

export function splitMissions(bookings: TripBooking[], today = new Date()): SplitMissions {
  const active: TripBooking[] = [];
  const archive: TripBooking[] = [];

  for (const booking of bookings) {
    (isMissionArchived(booking.travelDate, today) ? archive : active).push(booking);
  }

  active.sort((a, b) => a.travelDate.localeCompare(b.travelDate));
  archive.sort((a, b) => b.travelDate.localeCompare(a.travelDate));
  return { active, archive };
}

/** FNV-1a — stable, dependency-free seed from the booking reference. */
function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Mission telemetry for an archived booking.
 *
 * The booking record has no field-level source for in-game performance yet, so
 * the fallback derives a stable outcome/time/clue spread from the reference
 * hash — the same ticket always shows the same result on every device. Real
 * telemetry (when a mission-completion feed exists) is written to
 * `booking.mission` and wins over the fallback.
 */
export function resolveMissionTelemetry(booking: TripBooking): MissionTelemetry {
  if (booking.mission) return booking.mission;

  const seed = fnv1a(booking.reference);
  const outcome: MissionOutcome = seed % 100 < 78 ? "success" : "failed";
  const minutes = 62 + (seed % 106); // 01h:02m → 02h:47m
  const seconds = (seed >>> 9) % 60;
  const cluesUsed =
    outcome === "failed"
      ? MISSION_TOTAL_CLUES
      : Math.min(MISSION_TOTAL_CLUES - 1, 2 + ((seed >>> 4) % 8));

  return {
    outcome,
    clearTimeMs: (minutes * 60 + seconds) * 1000,
    cluesUsed,
    cluesTotal: MISSION_TOTAL_CLUES,
  };
}

/** `HHh:MMm:SSs` — e.g. 1h 7m 9s → "01h:07m:09s". */
export function formatMissionDuration(clearTimeMs: number): string {
  const totalSeconds = Math.max(0, Math.round(clearTimeMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}h:${pad(minutes)}m:${pad(seconds)}s`;
}
