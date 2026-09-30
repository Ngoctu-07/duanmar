/**
 * CMS social/contact links (`siteConfiguration.socialLinks`) view model +
 * fail-closed href classification shared by the Contact Section and Footer.
 *
 * Security contract: only absolute `http(s)` destinations open in a new tab
 * (`target="_blank" rel="noopener noreferrer"`); `tel:`/`mailto:`/site-relative
 * paths stay same-tab; empty or unsafe values (`javascript:`, `data:`,
 * `//host`, garbage) classify as `null` so callers render plain text instead
 * of a dead or dangerous link.
 */

export type SocialLink = {
  /** Sanity array member key (stable React key when present). */
  _key?: string;
  /** Platform slug, e.g. `facebook` — never empty (`other` default). */
  platform: string;
  /** Visible handle/label, e.g. `DuanMar` or `@duanmar.official`. */
  displayText: string;
  /** Raw CMS destination; empty/invalid → unlinked text. */
  targetUrl?: string | null;
};

export type ClassifiedHref = { href: string; external: boolean };

/** Brand names are locale-independent — no EN/VI message keys needed. */
const PLATFORM_TITLES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
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

/** Coerce the raw GROQ payload into usable entries (drops malformed rows). */
export function normalizeSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];

  const links: SocialLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;

    const displayText =
      typeof record.displayText === "string" ? record.displayText.trim() : "";
    if (!displayText) continue;

    const platform =
      typeof record.platform === "string" && record.platform.trim()
        ? record.platform.trim().toLowerCase()
        : "other";
    const targetUrl =
      typeof record.targetUrl === "string" && record.targetUrl.trim()
        ? record.targetUrl.trim()
        : null;

    links.push({
      _key: typeof record._key === "string" ? record._key : undefined,
      platform,
      displayText,
      targetUrl,
    });
  }
  return links;
}

/**
 * CMS entries win when the editor filled any in; otherwise the i18n fallback
 * nodes keep rendering (empty CMS field must never blank the section).
 */
export function resolveSocialLinks(
  cmsPayload: unknown,
  fallback: SocialLink[]
): SocialLink[] {
  const fromCms = normalizeSocialLinks(cmsPayload);
  return fromCms.length > 0 ? fromCms : fallback;
}
