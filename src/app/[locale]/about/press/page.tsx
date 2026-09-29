import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Press & Media | DuanMar",
  description: "Resources and contacts for journalists",
};

interface Fact {
  label: string;
  value: string;
}

export default async function PressPage() {
  const t = await getTranslations("about");
  const press = t.raw("press") as {
    title: string;
    subtitle: string;
    boilerplateTitle: string;
    boilerplateBody: string;
    factsTitle: string;
    facts: Fact[];
    factsDisclaimer: string;
    mediaContactTitle: string;
    mediaEmail: string;
    mediaNote: string;
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{press.title}</h1>
        <p className="text-lg text-muted-foreground">{press.subtitle}</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        <section className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-3">{press.boilerplateTitle}</h2>
          <p className="text-muted-foreground leading-relaxed">{press.boilerplateBody}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{press.factsTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {press.facts.map((fact) => (
              <div key={fact.label} className="rounded-xl border p-5 text-center">
                <div className="text-2xl font-bold text-primary">{fact.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{fact.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{press.factsDisclaimer}</p>
        </section>

        <section className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-3">{press.mediaContactTitle}</h2>
          <a
            href={`mailto:${press.mediaEmail}`}
            className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
          >
            <Mail className="h-4 w-4" />
            {press.mediaEmail}
          </a>
          <p className="mt-2 text-sm text-muted-foreground">{press.mediaNote}</p>
        </section>
      </div>
    </div>
  );
}
