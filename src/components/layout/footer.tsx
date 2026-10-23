import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { SocialAnchor } from "@/components/contact/social-anchor";
import { buildContactChannels, type ContactFallbacks } from "@/lib/contact-channels";

const tourLinks = [
  { key: "domesticTours", href: "/tours/domestic" },
  { key: "internationalTours", href: "/tours/international" },
] as const;

const infoLinks = [
  { labelKey: "howToBook", href: "/support" },
  { labelKey: "blog", href: "/blog" },
  { labelKey: "careers", href: "/about/careers" },
  { labelKey: "accessibility", href: "/accessibility" },
  { labelKey: "sitemapHtml", href: "/sitemap" },
] as const;

// E-commerce travel policies → deepest matching section of the pages that exist today.
const policyLinks = [
  { labelKey: "privacyPolicy", href: "/privacy#privacy-policy" },
  { labelKey: "terms", href: "/privacy#terms" },
  { labelKey: "refundPolicy", href: "/support#contact" },
  { labelKey: "faqs", href: "/support" },
] as const;

// Bottom utility bar legal links (Behance-style).
const legalLinks = [
  { labelKey: "terms", href: "/privacy#terms" },
  { labelKey: "privacyPolicy", href: "/privacy#privacy-policy" },
  { labelKey: "cookieSettings", href: "/privacy#privacy-policy" },
] as const;

// Phone/Email i18n nodes (tel:/mailto:) + social nodes used as CMS fallbacks.
const fallbackKeys = ["phone", "email", "facebook", "tiktok", "instagram"] as const;

type ContactNode = { label?: string; value?: string; href?: string };

/** Behance-style column label: tiny, uppercase, wide-tracked, white on the red canvas. */
function ColumnHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-4 text-xs font-sans font-semibold uppercase tracking-wider text-white">
      {children}
    </h3>
  );
}

// Muted body link: white/80 at rest, full white on hover/focus.
const linkClass =
  "text-sm text-white/80 transition-colors duration-200 hover:text-white focus-visible:text-white focus-visible:outline-none";

export function Footer({
  contactSettings,
  slogan,
}: {
  contactSettings?: unknown;
  /** CMS `siteConfiguration.footerSlogan` already resolved for the active locale. */
  slogan?: string | null;
}) {
  const t = useTranslations("common");
  const tf = useTranslations("footer");
  const tc = useTranslations("contact");

  const nodeFor = (key: string): ContactNode =>
    (tc.raw(`nodes.${key}`) ?? {}) as ContactNode;

  const contactFallbacks: ContactFallbacks = Object.fromEntries(
    fallbackKeys.map((key) => [key, nodeFor(key)])
  );

  // CMS `contactSettings` win; empty CMS → i18n nodes keep the column intact.
  const contactItems = buildContactChannels(contactSettings, contactFallbacks);
  // Brand column shows the primary phone/email; the Connect column shows socials.
  const primaryContacts = contactItems.filter((item) => item.kind !== "social");
  const socialChannels = contactItems.filter((item) => item.kind === "social");

  return (
    <footer
      id="site-footer"
      data-testid="site-footer"
      className="border-t border-white/20 bg-[#7F1D1D] text-white print:hidden"
    >
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div data-testid="footer-brand" className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link
              href="/"
              aria-label="DuanMar"
              className="inline-flex items-center gap-2.5"
            >
              <BrandLogo size={40} variant="knockout" />
              <BrandWordmark className="text-xl font-bold tracking-tight text-white" />
            </Link>
            <p
              data-testid="footer-slogan"
              className="mt-4 max-w-xs text-xs leading-relaxed text-white/70"
            >
              {slogan ?? tf("tagline")}
            </p>
            {primaryContacts.length > 0 && (
              <ul className="mt-5 space-y-2">
                {primaryContacts.map((item) => (
                  <li key={item.key}>
                    <SocialAnchor
                      targetUrl={item.href}
                      displayText={item.value}
                      className={`${linkClass} break-words`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <ColumnHeading>{tf("tours")}</ColumnHeading>
            <ul className="space-y-2.5">
              {tourLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {t(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/deals" className={linkClass}>
                  {t("deals")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <ColumnHeading>{tf("info")}</ColumnHeading>
            <ul className="space-y-2.5">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {tf(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div data-testid="footer-social">
            <ColumnHeading>{tf("connect")}</ColumnHeading>
            {socialChannels.length > 0 && (
              <ul className="space-y-2.5">
                {socialChannels.map((item) => (
                  <li key={item.key}>
                    <SocialAnchor
                      targetUrl={item.href}
                      displayText={item.label}
                      className={linkClass}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <ColumnHeading>{tf("policies")}</ColumnHeading>
            <ul className="space-y-2.5">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {tf(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          data-testid="footer-bottom"
          className="mt-12 flex flex-col items-center gap-4 border-t border-white/15 pt-6 text-xs text-white/70 sm:flex-row sm:justify-between"
        >
          <p>
            &copy; {new Date().getFullYear()} DuanMar. {tf("rights")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {legalLinks.map((link) => (
              <Link
                key={`${link.href}-${link.labelKey}`}
                href={link.href}
                className="text-white/80 transition-colors duration-200 hover:text-white"
              >
                {tf(link.labelKey)}
              </Link>
            ))}
            <LocaleSwitcher tone="inverse" />
          </div>
        </div>
      </div>
    </footer>
  );
}
