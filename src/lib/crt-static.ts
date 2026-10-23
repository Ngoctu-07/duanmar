/**
 * Event-driven CRT static contract (client only).
 *
 * The effect is no longer bound to route changes: navigation is silent and the
 * burst fires only on meaningful user events.
 *
 * - Landing splash: once per browser session, 500ms on the first visit.
 * - Critical actions: 300ms on "Book tour", "Checkout / Pay" and the
 *   sign-in / register submit.
 *
 * Components opt in declaratively with `data-crt-static="<ms>"`. The overlay
 * listens for those clicks/submits in the capture phase, so the burst starts on
 * the gesture even when the handler calls `preventDefault()`.
 */

/** DOM event any component may dispatch to fire a burst. */
export const CRT_STATIC_EVENT = "crt-static";

/** Initial TV-static splash on the first visit of a session. */
export const CRT_SPLASH_MS = 500;

/** Short burst for critical CTAs (book / checkout / auth submit). */
export const CRT_ACTION_MS = 300;

/** Session flag so the splash plays once, not on every hard refresh. */
export const CRT_SPLASH_KEY = "duanmar:crt-splash-played";

/** Attribute marking a CTA or form as a static trigger. */
export const CRT_STATIC_ATTR = "data-crt-static";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolve the duration declared on a trigger element (falls back to 300ms). */
export function readTriggerDuration(element: HTMLElement): number {
  const raw = Number(element.getAttribute(CRT_STATIC_ATTR));
  return Number.isFinite(raw) && raw > 0 ? raw : CRT_ACTION_MS;
}
