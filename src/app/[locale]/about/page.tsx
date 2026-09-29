import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "About Us | DuanMar",
  description: "The national tourism organization promoting Vietnam to the world",
};

const SECTIONS = [
  { titleKey: "missionTitle", bodyKey: "missionBody" },
  { titleKey: "visionTitle", bodyKey: "visionBody" },
  { titleKey: "orgTitle", bodyKey: "orgBody" },
  { titleKey: "valuesTitle", bodyKey: "valuesBody" },
] as const;

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {SECTIONS.map((section) => (
          <section key={section.titleKey} className="rounded-xl border p-6">
            <h2 className="text-xl font-semibold mb-3">{t(section.titleKey)}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t(section.bodyKey)}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
