import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SocialAnchor } from "@/components/contact/social-anchor";
import { buildContactChannels, type ContactFallbacks } from "@/lib/contact-channels";

const tourLinks = [
  { key: "domesticTours", href: "/tours/domestic" },
  { key: "internationalTours", href: "/tours/international" },
] as const;

const infoLinks = [
  { labelKey: "howToBook", href: "/support" },
  { labelKey: "articles", href: "/blog" },
  { labelKey: "careers", href: "/about/careers" },
] as const;

// E-commerce travel policies → deepest matching section of the pages that exist today.
const policyLinks = [
  { labelKey: "privacyPolicy", href: "/privacy#privacy-policy" },
  { labelKey: "terms", href: "/privacy#terms" },
  { labelKey: "refundPolicy", href: "/support#contact" },
  { labelKey: "faqs", href: "/support" },
] as const;

// Phone/Email i18n nodes (tel:/mailto:) + social nodes used as CMS fallbacks.
const fallbackKeys = ["phone", "email", "facebook", "tiktok", "instagram"] as const;

type ContactNode = { label?: string; value?: string; href?: string };

/** Column heading token — synced with the homepage "Stories & Inspiration" title. */
function ColumnHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-sm font-bold lg:mb-4 lg:text-3xl">{children}</h3>;
}

// Compact body link: text-xs on mobile, text-sm on lg + subtle opacity, full white on hover/focus.
const linkClass =
  "text-xs lg:text-sm opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100";

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

  return (
    <footer
      id="site-footer"
      data-testid="site-footer"
      className="bg-primary text-white print:hidden"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo size={72} variant="knockout" className="mb-3" />
            <h3 className="mb-3">
              <BrandWordmark className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-none" />
            </h3>
            <p data-testid="footer-slogan" className="text-xs lg:text-sm">
              {slogan ?? tf("tagline")}
            </p>
          </div>

          <div>
            <ColumnHeading>{tf("tours")}</ColumnHeading>
            <ul className="space-y-1.5 lg:space-y-2">
              {tourLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>{tf("contact")}</ColumnHeading>
            <ul className="space-y-1.5 lg:space-y-2">
              {contactItems.map((item) => (
                <li key={item.key}>
                  <SocialAnchor
                    targetUrl={item.href}
                    displayText={item.label}
                    className={`${linkClass} break-words`}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>{tf("info")}</ColumnHeading>
            <ul className="space-y-1.5 lg:space-y-2">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {tf(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>{tf("policies")}</ColumnHeading>
            <ul className="space-y-1.5 lg:space-y-2">
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

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-white/20 pt-4 text-xs sm:flex-row sm:justify-between sm:text-left lg:gap-3 lg:pt-6">
          <p>&copy; {new Date().getFullYear()} DuanMar. {tf("rights")}</p>
          <div className="flex flex-wrap justify-center gap-2 lg:gap-4">
            <Link
              href="/support"
              className="hover:text-white/80 transition-colors"
            >
              {tf("support")}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-white/80 transition-colors"
            >
              {tf("privacy")}
            </Link>
            <Link
              href="/accessibility"
              className="hover:text-white/80 transition-colors"
            >
              {tf("accessibility")}
            </Link>
            <Link
              href="/sitemap"
              className="hover:text-white/80 transition-colors"
            >
              {tf("sitemapHtml")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
