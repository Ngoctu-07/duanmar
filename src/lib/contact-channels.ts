/**
 * Unified contact channel view model — the single source of truth behind both
 * the Footer contact column and the Contact page grid.
 *
 * Input is the `siteConfiguration.contactSettings` payload (7 explicit
 * channels: phone, email + five social URLs) with an i18n fallback so an empty
 * CMS keeps the section rendered (same "CMS wins, empty → i18n" contract as
 * `bilingual-string.ts`).
 *
 * Channel order is a code-level contract asserted by the browser suite:
 * phone → email → facebook → tiktok → instagram → threads → youtube.
 *
 * Conditional-render contract: a channel with neither a CMS value nor an i18n
 * fallback is dropped, so neither surface ever shows an empty/dead slot.
 */
import { classifyHref, platformTitle } from "./social-links";

export type ContactChannelKind = "phone" | "email" | "social";

export type ContactChannelKey =
  | "phone"
  | "email"
  | "facebook"
  | "tiktok"
  | "instagram"
  | "threads"
  | "youtube";

export type ContactChannel = {
  /** Stable channel key, e.g. `phone` / `facebook`. */
  key: ContactChannelKey;
  kind: ContactChannelKind;
  /** Localized/brand label, e.g. "Điện thoại" or "Facebook". */
  label: string;
  /**
   * Visible value: phone number, email address, or — for social channels — the
   * explicit CMS handle (falls back to the sanitized domain, then the platform
   * name). Never the raw long URL.
   */
  value: string;
  /** Safe destination — `null` renders as plain text (no dead `#` anchor). */
  href: string | null;
};

/** Raw `siteConfiguration.contactSettings` shape from GROQ. */
export type ContactSettings = {
  phone?: string | null;
  email?: string | null;
  facebookUrl?: string | null;
  facebookHandle?: string | null;
  tiktokUrl?: string | null;
  tiktokHandle?: string | null;
  instagramUrl?: string | null;
  instagramHandle?: string | null;
  threadsUrl?: string | null;
  threadsHandle?: string | null;
  youtubeUrl?: string | null;
  youtubeHandle?: string | null;
};

/** i18n fallback node (`contact.nodes.<key>`): localized label + value + href. */
export type ContactFallbackNode = {
  label?: string | null;
  value?: string | null;
  href?: string | null;
};

export type ContactFallbacks = Partial<Record<ContactChannelKey, ContactFallbackNode>>;

type ChannelSpec = {
  key: ContactChannelKey;
  kind: ContactChannelKind;
  field: keyof ContactSettings;
  /** Optional explicit display handle (social channels, Contact page only). */
  handleField?: keyof ContactSettings;
};

/**
 * The 7 channels in render order. `key` doubles as the icon key and the i18n
 * fallback node key; `field` points at the CMS setting.
 */
export const CONTACT_CHANNELS: readonly ChannelSpec[] = [
  { key: "phone", kind: "phone", field: "phone" },
  { key: "email", kind: "email", field: "email" },
  { key: "facebook", kind: "social", field: "facebookUrl", handleField: "facebookHandle" },
  { key: "tiktok", kind: "social", field: "tiktokUrl", handleField: "tiktokHandle" },
  { key: "instagram", kind: "social", field: "instagramUrl", handleField: "instagramHandle" },
  { key: "threads", kind: "social", field: "threadsUrl", handleField: "threadsHandle" },
  { key: "youtube", kind: "social", field: "youtubeUrl", handleField: "youtubeHandle" },
];

/** Build a dialable `tel:` href, or `null` when the value has no digits. */
export function toTelHref(phone: string): string | null {
  const digits = phone.trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return /\d/.test(digits) ? `tel:${digits}` : null;
}

/** Build a `mailto:` href, or `null` when the value is not a plain address. */
export function toMailtoHref(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed.includes("@") || /[\s<>"']/.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}

/**
 * Sanitized domain shown when a social channel has no explicit handle: host
 * only, `www.` stripped (e.g. `instagram.com`). Returns "" for values that are
 * not an absolute http(s) URL, so callers fall back to the platform name.
 */
export function socialDomain(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  try {
    return new URL(trimmed).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * Resolve the ordered channel list from `contactSettings` + i18n fallbacks.
 * CMS values win; empty CMS values fall back to the i18n node; channels with
 * neither are omitted. `settings` is coerced, so raw GROQ payloads are safe.
 */
export function buildContactChannels(
  settings: unknown,
  fallbacks: ContactFallbacks = {}
): ContactChannel[] {
  const cms = asRecord(settings);
  const channels: ContactChannel[] = [];

  for (const spec of CONTACT_CHANNELS) {
    const cmsValue = asText(cms[spec.field]);
    const fallback = fallbacks[spec.key] ?? {};
    const fallbackHref = classifyHref(fallback.href)?.href ?? null;
    const fallbackValue = asText(fallback.value);
    const label = asText(fallback.label) || platformTitle(spec.key) || spec.key;

    let href: string | null = null;
    let value = "";

    if (spec.kind === "phone" && cmsValue) {
      href = toTelHref(cmsValue);
      value = cmsValue;
    } else if (spec.kind === "email" && cmsValue) {
      href = toMailtoHref(cmsValue);
      value = cmsValue;
    } else if (spec.kind === "social" && cmsValue) {
      href = classifyHref(cmsValue)?.href ?? null;
      // Contact-page label: explicit handle → sanitized domain → platform name.
      // The raw URL is never shown; it only lives in `href`.
      const handle = spec.handleField ? asText(cms[spec.handleField]) : "";
      value = handle || socialDomain(cmsValue) || platformTitle(spec.key) || spec.key;
    }

    if (!value && fallbackValue) {
      value = fallbackValue;
      href = fallbackHref;
    }

    if (!value) continue; // conditional render: omit empty channels

    channels.push({ key: spec.key, kind: spec.kind, label, value, href });
  }

  return channels;
}
