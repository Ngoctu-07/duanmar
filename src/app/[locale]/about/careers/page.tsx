import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Careers | DuanMar",
  description: "Join us in promoting Vietnam to the world",
};

interface Position {
  title: string;
  type: string;
  location: string;
  summary: string;
}

export default async function CareersPage() {
  const t = await getTranslations("about");
  const careers = t.raw("careers") as {
    title: string;
    subtitle: string;
    intro: string;
    openingsTitle: string;
    positions: Position[];
    applyLabel: string;
    applyEmail: string;
    applyNote: string;
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{careers.title}</h1>
        <p className="text-lg text-muted-foreground">{careers.subtitle}</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        <p className="text-muted-foreground leading-relaxed">{careers.intro}</p>

        <section>
          <h2 className="text-xl font-semibold mb-4">{careers.openingsTitle}</h2>
          <div className="space-y-4">
            {careers.positions.map((position) => (
              <div key={position.title} className="rounded-xl border p-5">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="font-semibold">{position.title}</h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-link">
                    {position.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{position.location}</span>
                </div>
                <p className="text-sm text-muted-foreground">{position.summary}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border p-6">
          <a
            href={`mailto:${careers.applyEmail}`}
            className="inline-flex items-center gap-2 font-medium text-link hover:underline"
          >
            <Mail className="h-4 w-4" />
            {careers.applyLabel}: {careers.applyEmail}
          </a>
          <p className="mt-2 text-sm text-muted-foreground">{careers.applyNote}</p>
        </section>
      </div>
    </div>
  );
}
