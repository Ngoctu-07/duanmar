import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Culture & Heritage | Vietnam Tourism",
  description: "Two thousand years of living traditions",
};

interface CultureSection {
  heading: string;
  body: string;
  points: string[];
}

export default async function CulturePage() {
  const t = await getTranslations("culture");
  const sections = t.raw("sections") as Record<string, CultureSection>;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        {Object.entries(sections).map(([key, section]) => (
          <section key={key} className="rounded-xl border p-6">
            <h2 className="text-xl font-semibold mb-3">{section.heading}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">{section.body}</p>
            <ul className="space-y-2">
              {section.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {point}
                </li>
              ))}
            </ul>
            {key === "cuisine" && (
              <Link
                href="/explore/things-to-do/food"
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                {t("cuisineLink")}
              </Link>
            )}
            {key === "festivals" && (
              <Link
                href="/explore/festivals"
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                {t("festivalLink")}
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
