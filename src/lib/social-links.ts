/**
 * Shared helpers for contact/social channels: brand labels (`platformTitle`)
 * and fail-closed href classification (`classifyHref`) used by the Contact page,
 * the Footer and `contact-channels.ts`.
 *
 * Security contract: only absolute `http(s)` destinations open in a new tab
 * (`target="_blank" rel="noopener noreferrer"`); `tel:`/`mailto:`/site-relative
 * paths stay same-tab; empty or unsafe values (`javascript:`, `data:`,
 * `//host`, garbage) classify as `null` so callers render plain text instead
 * of a dead or dangerous link.
 */

export type ClassifiedHref = { href: string; external: boolean };

/** Brand names are locale-independent — no EN/VI message keys needed. */
const PLATFORM_TITLES: Record<string, string> = {
  phone: "Phone",
  email: "Email",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
};

/** Row label for a platform slug; unknown slugs are title-cased, empty stays empty. */
export function platformTitle(platform?: string | null): string {
  const key = (platform ?? "").trim().toLowerCase();
  const known = PLATFORM_TITLES[key];
  if (known) return known;
  if (!key) return "";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Classify a raw CMS/i18n href. Returns `null` (render as plain text) unless
 * the value is an absolute http(s) URL, a `tel:`/`mailto:` target or a
 * site-relative path — never `javascript:`/`data:`/protocol-relative.
 */
export function classifyHref(raw?: string | null): ClassifiedHref | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    } catch {
      return null;
    }
    // Keep the original string byte-exact (URL normalization would rewrite it).
    return { href: value, external: true };
  }

  if (/^(?:tel|mailto):/i.test(value) && !/[\s"'<>]/.test(value)) {
    return { href: value, external: false };
  }

  if (value.startsWith("/") && !value.startsWith("//") && !/[\s"'<>]/.test(value)) {
    return { href: value, external: false };
  }

  return null;
}
