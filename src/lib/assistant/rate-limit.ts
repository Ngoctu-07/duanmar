/** Sliding-window in-memory rate limiter for `/api/assistant` (plan 260929-2335).
 * Review fix: prune ONLY the accessed key per call (O(window)) and run the
 * full sweep only when the key table grows past a bound. */

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 60;
const MAX_TRACKED_KEYS = 10_000;

type Hits = number[];

const store = new Map<string, Hits>();

/**
 * Record a hit for `key` at `now`. Returns false when over the limit
 * (window: `RATE_LIMIT_MAX` hits per `RATE_LIMIT_WINDOW_MS`).
 * Pure w.r.t. `now` — unit tests inject a fake clock.
 */
export function checkRateLimit(key: string, now: number = Date.now()): boolean {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT_MAX) {
    store.set(key, hits);
    return false;
  }
  hits.push(now);
  store.set(key, hits);
  if (store.size > MAX_TRACKED_KEYS) sweep(now);
  return true;
}

/** Full expired-key sweep — only invoked when the table hits its size bound. */
function sweep(now: number): void {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, hits] of store) {
    const live = hits.filter((t) => t > cutoff);
    if (live.length === 0) store.delete(key);
    else store.set(key, live);
  }
  if (store.size > MAX_TRACKED_KEYS) {
    const excess = store.size - MAX_TRACKED_KEYS;
    let removed = 0;
    for (const key of store.keys()) {
      if (removed >= excess) break;
      store.delete(key);
      removed += 1;
    }
  }
}

/** Test hook — clears all windows. */
export function resetRateLimit(): void {
  store.clear();
}
