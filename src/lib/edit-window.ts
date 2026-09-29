/**
 * Time helpers for the review edit window: rules are pure + clock-injectable
 * so unit tests can pin boundaries; the app reads "now" from the server so a
 * wrong device clock cannot reopen an expired window (fail-closed on any
 * fetch/parse failure — no server time means "expired", never "fresh").
 */

/** Reviews can be edited for 3 hours after their original `createdAt`. */
export const EDIT_WINDOW_MS = 3 * 60 * 60 * 1000;

/**
 * `true` when `createdAtIso` is at least `windowMs` old relative to
 * `serverNowIso` (>= boundary: exactly 3h00 = expired). Either side
 * unparsable → `true` (fail closed).
 */
export function isEditWindowExpired(
  createdAtIso: string,
  serverNowIso: string,
  windowMs: number = EDIT_WINDOW_MS
): boolean {
  const created = Date.parse(createdAtIso);
  const now = Date.parse(serverNowIso);
  if (Number.isNaN(created) || Number.isNaN(now)) return true;
  return now - created >= windowMs;
}

/**
 * Reads the server clock from `GET /api/server-time`. Returns the ISO time
 * or `null` on non-2xx / bad JSON / non-ISO payload / network failure —
 * callers must treat `null` as "expired" (fail closed).
 */
export async function fetchServerNow(): Promise<string | null> {
  try {
    const response = await fetch("/api/server-time");
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const time = (body as { time?: unknown } | null)?.time;
    if (typeof time !== "string" || Number.isNaN(Date.parse(time))) return null;
    return time;
  } catch {
    return null;
  }
}
