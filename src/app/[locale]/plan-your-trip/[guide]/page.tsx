import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";

interface GuideSection {
  heading: string;
  body: string;
}

interface GuideData {
  title: string;
  summary: string;
  sections: GuideSection[];
}

interface PageProps {
  params: Promise<{ locale: string; guide: string }>;
}

async function getGuide(guide: string): Promise<{ t: (k: string) => string; data: GuideData } | null> {
  const t = await getTranslations("planTrip");
  const guides = t.raw("guides") as Record<string, GuideData>;
  const data = guides[guide];
  if (!data) return null;
  return { t, data };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { guide } = await params;
  const result = await getGuide(guide);
  if (!result) return {};
  return {
    title: `${result.data.title} | Vietnam Tourism`,
    description: result.data.summary,
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { guide } = await params;
  const result = await getGuide(guide);

  if (!result) notFound();

  const { t, data } = result;

  return (
    <div className="container mx-auto px-4 py-16">
      <Link
        href="/plan-your-trip"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← {t("title")}
      </Link>

      <div className="mt-6 max-w-3xl">
        <h1 className="text-4xl font-bold mb-3">{data.title}</h1>
        <p className="text-lg text-muted-foreground mb-10">{data.summary}</p>

        <div className="space-y-8">
          {data.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold mb-2">{section.heading}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
