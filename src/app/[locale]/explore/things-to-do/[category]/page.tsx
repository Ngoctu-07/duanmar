import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";

interface CategoryData {
  title: string;
  summary: string;
  activities: string[];
}

interface PageProps {
  params: Promise<{ locale: string; category: string }>;
}

async function getCategory(category: string) {
  const t = await getTranslations("thingsToDo");
  const categories = t.raw("categories") as Record<string, CategoryData>;
  const data = categories[category];
  if (!data) return null;
  return { t, data };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const result = await getCategory(category);
  if (!result) return {};
  return {
    title: `${result.data.title} | Vietnam Tourism`,
    description: result.data.summary,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const result = await getCategory(category);

  if (!result) notFound();

  const { t, data } = result;

  return (
    <div className="container mx-auto px-4 py-16">
      <Link
        href="/explore/things-to-do"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← {t("title")}
      </Link>

      <div className="mt-6 max-w-3xl">
        <h1 className="text-4xl font-bold mb-3">{data.title}</h1>
        <p className="text-lg text-muted-foreground mb-10">{data.summary}</p>

        <ul className="space-y-4">
          {data.activities.map((activity) => (
            <li key={activity} className="flex items-start gap-3 rounded-lg border p-4">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="text-muted-foreground">{activity}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
