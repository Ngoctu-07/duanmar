/**
 * Event-driven CRT static contract (client only).
 *
 * The overlay is NOT bound to navigation, form typing, focus changes or
 * validation. It fires for exactly two product milestones:
 *
 * - successful authentication (sign-in / sign-up / password reset sign-in);
 * - successful booking (the paid ticket is persisted after checkout).
 *
 * Components call `fireCrtStatic()` from those success handlers. Keystrokes,
 * input change handlers, form submission attempts and CTA clicks stay silent.
 */

/** DOM event the success handlers dispatch to fire a burst. */
export const CRT_STATIC_EVENT = "crt-static";

/** Short burst used by both milestone events. */
export const CRT_ACTION_MS = 300;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fire one burst. Safe to call on the server (no-op) and harmless when the
 * overlay is not mounted yet.
 */
export function fireCrtStatic(durationMs: number = CRT_ACTION_MS): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CRT_STATIC_EVENT, { detail: { durationMs } })
  );
}
