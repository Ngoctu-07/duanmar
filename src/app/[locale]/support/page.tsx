import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SupportFaqSection } from "@/components/support/support-faq-section";
import type {
  SupportCategory,
  SupportFaqExtras,
  SupportStep,
} from "@/components/support/support-faq-types";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { SITE_CONFIGURATION_QUERY } from "@/sanity/queries/site-configuration";
import { toMailtoHref } from "@/lib/contact-channels";

export const metadata: Metadata = {
  title: "Support & FAQs | DuanMar",
  description:
    "Visa, weather, money, transport and safety questions from travelers to Vietnam",
};

const HOTLINE_DISPLAY = "+84 813669240";
const HOTLINE_HREF = "tel:+84813669240";
/** Fallback when Studio `contactSettings.email` is empty (FAQ support-channels pill). */
const DEFAULT_SUPPORT_EMAIL = "Duanmartravel@gmail.com";

interface BookingFaq {
  q: string;
  a: string;
}

interface FaqMeta {
  category: SupportCategory;
  extras?: SupportFaqExtras;
}

/**
 * Category for each `bookingSteps.faq` entry, in authoring order:
 * 1 booking steps · 2 deposit · 3 health · 4 confirmation · 5 support channels.
 * Content stays in the message catalogs; only its grouping lives here.
 */
const FAQ_META: readonly FaqMeta[] = [
  { category: "booking", extras: "steps" },
  { category: "booking" },
  { category: "health" },
  { category: "booking" },
  { category: "booking", extras: "channels" },
];

export default async function SupportPage() {
  const t = await getTranslations("support");
  const tb = await getTranslations("bookingSteps");
  const steps = tb.raw("steps") as SupportStep[];
  const bookingFaqs = tb.raw("faq") as BookingFaq[];

  // Support-channels pill follows the single Studio source of truth
  // (`siteConfiguration.contactSettings.email`), defaulting when empty.
  const siteConfig = await fetchPublished(
    SITE_CONFIGURATION_QUERY,
    {},
    { tags: ["sanity:siteconfig"] }
  );
  const supportEmail =
    (siteConfig?.contactSettings?.email ?? "").trim() || DEFAULT_SUPPORT_EMAIL;
  const supportMailto =
    toMailtoHref(supportEmail) ?? `mailto:${DEFAULT_SUPPORT_EMAIL}`;

  const faqItems = bookingFaqs.map((faq, index) => {
    const meta = FAQ_META[index] ?? { category: "booking" as const };
    return {
      id: `faq-${index + 1}`,
      category: meta.category,
      question: faq.q,
      answer: faq.a,
      extras: meta.extras,
    };
  });

  const tabs = [
    { id: "booking" as const, label: t("tabs.booking") },
    { id: "health" as const, label: t("tabs.health") },
  ];

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: tb("title"),
    description: tb("subtitle"),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
    })),
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(howToJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mb-10 text-center">
        <h1 className="display-title mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <SupportFaqSection
        tabs={tabs}
        items={faqItems}
        steps={steps}
        hotline={{
          label: tb("hotlineLabel"),
          display: HOTLINE_DISPLAY,
          href: HOTLINE_HREF,
        }}
        supportEmail={supportEmail}
        supportMailto={supportMailto}
        tabsLabel={t("tabsLabel")}
        emptyLabel={t("empty")}
      />

      <section
        id="contact"
        data-testid="support-contact-box"
        className="mx-auto mt-12 max-w-[45.6rem] scroll-mt-24 border border-white/10 bg-card p-[1.9rem] text-center sm:p-[2.375rem]"
      >
        <h2 className="font-sans text-xl font-bold tracking-wide text-white uppercase">
          {t("contactTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t("contactText")}
        </p>
        <Link
          href="/contact"
          data-testid="support-contact-cta"
          className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-sm bg-[#b3151b] px-8 py-3 text-sm font-bold tracking-wider text-white uppercase transition-colors hover:bg-[#cc3d3d]"
        >
          {t("contactCta")}
        </Link>
      </section>
    </div>
  );
}
