/**
 * "Back to booking" round trip: checkout links to /deals or /account with
 * `?returnTo=/booking/checkout?tour=<slug>`, and those pages show a back link.
 * Only checkout paths are accepted so the param can't become an open redirect.
 */
const CHECKOUT_RETURN = /^\/booking\/checkout\?tour=[a-z0-9-]+$/;

export function bookingReturnPath(slug: string): string {
  return `/booking/checkout?tour=${encodeURIComponent(slug)}`;
}

export function withBookingReturn(href: string, slug: string): string {
  return `${href}?returnTo=${encodeURIComponent(bookingReturnPath(slug))}`;
}

export function safeBookingReturn(value: unknown): string | null {
  return typeof value === "string" && CHECKOUT_RETURN.test(value) ? value : null;
}
