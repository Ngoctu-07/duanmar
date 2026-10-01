import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Mail, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { SocialAnchor } from "@/components/contact/social-anchor";
import { SITE_CONFIGURATION_QUERY } from "@/sanity/queries/site-configuration";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { platformTitle, resolveSocialLinks, type SocialLink } from "@/lib/social-links";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact Us | DuanMar",
  description: "Get in touch with DuanMar — Vietnam tourism office",
};

/** Phone/Email are i18n constants (tel:/mailto:); order is a code-level contract. */
const NODE_KEYS = ["phone", "email"] as const;
type NodeKey = (typeof NODE_KEYS)[number];

/** i18n social fallback when `siteConfiguration.socialLinks` is empty. */
const SOCIAL_FALLBACK_KEYS = ["facebook", "instagram", "tiktok"] as const;

const NODE_ICONS: Partial<Record<NodeKey, typeof Phone>> = {
  phone: Phone,
  email: Mail,
};

const CARD_CLASS =
  "flex items-center gap-3 rounded-xl border border-border px-5 py-4 transition-colors hover:bg-muted";

type I18nNode = { label: string; value: string; href: string };

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const nodeFor = (key: string) =>
    (t.raw(`nodes.${key}`) ?? { label: key, value: "", href: "" }) as I18nNode;

  const siteConfig = await fetchPublished(SITE_CONFIGURATION_QUERY, {}, {
    tags: ["sanity:siteconfig"],
  });

  // CMS handles (Studio → Site Configuration) win; empty CMS → i18n nodes.
  const socials: SocialLink[] = resolveSocialLinks(siteConfig?.socialLinks, [
    ...SOCIAL_FALLBACK_KEYS.map((key) => {
      const node = nodeFor(key);
      return { platform: key, displayText: node.value || node.label, targetUrl: node.href };
    }),
  ]);

  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </header>

      <ul className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NODE_KEYS.map((key) => {
          const node = nodeFor(key);
          const Icon = NODE_ICONS[key];
          return (
            <li key={key}>
              <SocialAnchor
                data-testid="contact-node"
                data-node={key}
                targetUrl={node.href}
                className={CARD_CLASS}
              >
                {Icon && <Icon className="size-5 shrink-0 text-link" aria-hidden />}
                <span className="min-w-0">
                  <span className="block text-sm text-muted-foreground">
                    {node.label}
                  </span>
                  <span className="block truncate text-xl font-semibold">
                    {node.value}
                  </span>
                </span>
              </SocialAnchor>
            </li>
          );
        })}

        {socials.map((social, index) => (
          <li key={social._key ?? `${social.platform}-${index}`}>
            <SocialAnchor
              data-testid="contact-node"
              data-node={social.platform}
              targetUrl={social.targetUrl}
              className={CARD_CLASS}
            >
              <span className="min-w-0">
                <span className="block text-sm text-muted-foreground">
                  {platformTitle(social.platform)}
                </span>
                <span className="block truncate text-xl font-semibold">
                  {social.displayText}
                </span>
              </span>
            </SocialAnchor>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ContactForm />
        <Card>
          <CardHeader>
            <CardTitle>{t("info.hoursTitle")}</CardTitle>
            <CardDescription>{t("info.responseNote")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("info.hours")}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
