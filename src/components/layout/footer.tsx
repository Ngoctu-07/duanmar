import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SocialAnchor } from "@/components/contact/social-anchor";
import { resolveSocialLinks } from "@/lib/social-links";

const tourLinks = [
  { key: "domesticTours", href: "/tours/domestic" },
  { key: "internationalTours", href: "/tours/international" },
] as const;

const infoLinks = [
  { labelKey: "howToBook", href: "/support" },
  { labelKey: "articles", href: "/blog" },
  { labelKey: "careers", href: "/about/careers" },
] as const;

// Phone/Email always come from i18n (tel:/mailto: — not CMS-managed).
const contactKeys = ["phone", "email"] as const;
// Same order/set as contact.nodes — i18n fallback when the CMS list is empty.
const socialFallbackKeys = ["facebook", "instagram", "tiktok"] as const;

type ContactNode = { label: string; value: string; href: string };

export function Footer({ socialLinks }: { socialLinks?: unknown }) {
  const t = useTranslations("common");
  const tf = useTranslations("footer");
  const tc = useTranslations("contact");

  const nodeFor = (key: string) =>
    (tc.raw(`nodes.${key}`) ?? { label: key, value: "", href: "" }) as ContactNode;

  // CMS `socialLinks` (Studio) win; empty CMS → i18n nodes keep the column intact.
  const contactItems = [
    ...contactKeys.map((key) => {
      const node = nodeFor(key);
      return { id: key, label: node.label, href: node.href };
    }),
    ...resolveSocialLinks(socialLinks, [
      ...socialFallbackKeys.map((key) => {
        const node = nodeFor(key);
        return { platform: key, displayText: node.label, targetUrl: node.href };
      }),
    ]).map((link) => ({
      id: link._key ?? link.platform,
      label: link.displayText,
      href: link.targetUrl ?? "",
    })),
  ];

  return (
    <footer className="bg-primary text-white print:hidden">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[minmax(210px,1.5fr)_0_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(64px,0.35fr)] md:gap-x-6">
          <div className="col-span-2 md:col-span-1 md:col-start-1">
            <BrandLogo size={88} variant="knockout" className="mb-3" />
            <h3 className="mb-4">
              <BrandWordmark className="text-4xl md:text-5xl font-bold tracking-tight leading-none" />
            </h3>
            <p className="text-sm">{tf("tagline")}</p>
          </div>

          <div className="md:col-start-3">
            <h3 className="text-2xl font-semibold mb-5">{tf("tours")}</h3>
            <ul className="space-y-3">
              {tourLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-lg hover:text-white/80 transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-start-4">
            <h3 className="text-2xl font-semibold mb-5">{tf("contact")}</h3>
            <ul className="space-y-3">
              {contactItems.map((item, index) => (
                <li key={`${item.id}-${index}`}>
                  <SocialAnchor
                    targetUrl={item.href}
                    displayText={item.label}
                    className="text-lg break-words hover:text-white/80 transition-colors"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-start-5">
            <h3 className="text-2xl font-semibold mb-5">{tf("info")}</h3>
            <ul className="space-y-3">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-lg hover:text-white/80 transition-colors"
                  >
                    {tf(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/20 pt-8 text-sm sm:flex-row sm:justify-between sm:text-left">
          <p>&copy; {new Date().getFullYear()} DuanMar. {tf("rights")}</p>
          <div className="flex flex-wrap justify-center gap-4">
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
