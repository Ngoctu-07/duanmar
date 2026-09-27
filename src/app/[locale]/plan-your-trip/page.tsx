import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Plan Your Trip | Vietnam Tourism",
  description: "Everything you need to know before traveling to Vietnam",
};

interface GuideSummary {
  title: string;
  summary: string;
}

export default async function PlanYourTripPage() {
  const t = await getTranslations("planTrip");
  const guides = t.raw("guides") as Record<string, GuideSummary>;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(guides).map(([slug, guide]) => (
          <Link
            key={slug}
            href={`/plan-your-trip/${slug}`}
            className="group rounded-xl border p-6 transition-colors hover:bg-muted"
          >
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              {guide.title}
            </h2>
            <p className="text-sm text-muted-foreground">{guide.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
