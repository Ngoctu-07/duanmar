import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Support & FAQs | DuanMar",
  description:
    "Visa, weather, money, transport and safety questions from travelers to Vietnam",
};

interface Faq {
  q: string;
  a: string;
}

export default async function SupportPage() {
  const t = await getTranslations("support");
  const faqs = t.raw("faqs") as Faq[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-4">
        {faqs.map((faq, index) => (
          <details key={index} className="group rounded-xl border p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {faq.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {faq.a}
            </p>
          </details>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-3xl rounded-xl border bg-muted/50 p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">{t("contactTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("contactText")}</p>
        <Link
          href="/contact"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t("contactCta")}
        </Link>
      </div>
    </div>
  );
}
