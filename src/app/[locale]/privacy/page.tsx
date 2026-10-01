import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Privacy Policy & Terms of Use | DuanMar",
  description:
    "How the DuanMar website handles your data and the rules for using this site",
};

interface Section {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

function SectionList({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-3 text-xl font-semibold">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="mb-3 leading-relaxed text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
          {section.bullets && (
            <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export default async function PrivacyPage() {
  const [t, ts] = await Promise.all([
    getTranslations("privacy"),
    getTranslations("support"),
  ]);
  const policy = t.raw("policy") as Section[];
  const terms = t.raw("terms") as Section[];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>
      </div>

      <div className="mx-auto max-w-3xl">
        <h2 id="privacy-policy" className="mb-6 scroll-mt-24 text-2xl font-bold">
          {t("policyHeading")}
        </h2>
        <SectionList sections={policy} />

        <hr className="my-10" />

        <h2 id="terms" className="mb-6 scroll-mt-24 text-2xl font-bold">
          {t("termsHeading")}
        </h2>
        <SectionList sections={terms} />
      </div>

      <div className="mx-auto mt-12 max-w-3xl rounded-xl border bg-muted/50 p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold">{ts("contactTitle")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{ts("contactText")}</p>
        <Link
          href="/contact"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {ts("contactCta")}
        </Link>
      </div>
    </div>
  );
}
