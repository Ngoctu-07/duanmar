import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Things to Do | Vietnam Tourism",
  description: "Discover experiences across Vietnam",
};

interface CategorySummary {
  title: string;
  summary: string;
}

export default async function ThingsToDoPage() {
  const t = await getTranslations("thingsToDo");
  const categories = t.raw("categories") as Record<string, CategorySummary>;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(categories).map(([slug, category]) => (
          <Link
            key={slug}
            href={`/explore/things-to-do/${slug}`}
            className="group rounded-xl border p-6 transition-colors hover:bg-muted"
          >
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              {category.title}
            </h2>
            <p className="text-sm text-muted-foreground">{category.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
