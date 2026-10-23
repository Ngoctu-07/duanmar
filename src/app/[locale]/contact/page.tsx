import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/contact/contact-form";
import { SocialAnchor } from "@/components/contact/social-anchor";
import { ContactChannelIcon } from "@/components/contact/contact-channel-icons";
import { SITE_CONFIGURATION_QUERY } from "@/sanity/queries/site-configuration";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import {
  buildContactChannels,
  CONTACT_CHANNELS,
  type ContactFallbackNode,
  type ContactFallbacks,
} from "@/lib/contact-channels";
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

/** Phone/Email i18n node keys (fallback labels + tel:/mailto: defaults). */
const CARD_CLASS =
  "flex items-center gap-3 rounded-none border border-border px-5 py-4 text-foreground transition-colors hover:bg-muted";

export default async function ContactPage() {
  const t = await getTranslations("contact");
  // threads/youtube may have no i18n node yet (CMS-only channels) → return {} on
  // a missing key instead of letting next-intl throw MISSING_MESSAGE.
  const nodeFor = (key: string): ContactFallbackNode => {
    try {
      const node = t.raw(`nodes.${key}`);
      return node && typeof node === "object" ? (node as ContactFallbackNode) : {};
    } catch {
      return {};
    }
  };

  const siteConfig = await fetchPublished(SITE_CONFIGURATION_QUERY, {}, {
    tags: ["sanity:siteconfig"],
  });

  const fallbacks: ContactFallbacks = Object.fromEntries(
    CONTACT_CHANNELS.map(({ key }) => [key, nodeFor(key)])
  );

  // Explicit CMS channels win; empty CMS fields fall back to i18n nodes.
  // Order is the code-level contract: phone → email → facebook → … → youtube.
  // Social cards show the CMS display handle (or sanitized domain) as the
  // visible label — the raw target URL is only used as the anchor href. The
  // Footer intentionally ignores handles and keeps plain platform labels.
  const channels = buildContactChannels(siteConfig?.contactSettings, fallbacks);

  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mb-10 text-center">
        <h1 className="display-title mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </header>

      <ul className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <li key={channel.key}>
            <SocialAnchor
              data-testid="contact-node"
              data-node={channel.key}
              targetUrl={channel.href}
              className={CARD_CLASS}
            >
              <ContactChannelIcon
                channelKey={channel.key}
                className="size-6 shrink-0 text-link"
              />
              <span className="min-w-0">
                <span data-testid="contact-label" className="block text-sm text-muted-foreground">
                  {channel.label}
                </span>
                <span data-testid="contact-value" className="block truncate text-lg font-semibold">
                  {channel.value}
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
