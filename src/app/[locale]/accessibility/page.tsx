import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Accessibility Statement | Vietnam Tourism",
  description: "Our commitment to an inclusive website for every traveler",
};

export default async function AccessibilityPage() {
  const [t, ts] = await Promise.all([
    getTranslations("accessibility"),
    getTranslations("support"),
  ]);
  const measures = t.raw("measures") as string[];
  const limitations = t.raw("limitations") as string[];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-8">
        <p className="leading-relaxed text-muted-foreground">{t("commitment")}</p>

        <section>
          <h2 className="mb-3 text-xl font-semibold">{t("measuresTitle")}</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            {measures.map((measure) => (
              <li key={measure}>{measure}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">{t("limitationsTitle")}</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            {limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-muted/50 p-6">
          <h2 className="mb-2 text-xl font-semibold">{t("feedbackTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("feedbackText")}</p>
          <Link
            href="/about/contact"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {ts("contactCta")}
          </Link>
        </section>
      </div>
    </div>
  );
}
