import type { Metadata } from "next";
import { FileText, Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Business & MICE Travel | Vietnam Tourism",
  description:
    "Conferences, incentives, exhibitions and corporate events in Vietnam",
};

interface Service {
  heading: string;
  text: string;
}

export default async function BusinessMicePage() {
  const t = await getTranslations("mice");
  const services = t.raw("services") as Service[];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mx-auto max-w-3xl">
        <p className="mb-10 leading-relaxed text-muted-foreground">{t("intro")}</p>

        <h2 className="mb-4 text-xl font-semibold">{t("servicesTitle")}</h2>
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <div key={service.heading} className="rounded-xl border p-5">
              <h3 className="mb-2 font-medium">{service.heading}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {service.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <Link
            href="/plan-your-trip/visa"
            className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <FileText className="h-4 w-4" />
            {t("visaCta")}
          </Link>
        </div>

        <div className="rounded-xl border bg-muted/50 p-8 text-center">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-xl font-semibold">
            <Handshake className="h-5 w-5" />
            {t("contactTitle")}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("contactText")}</p>
          <Link
            href="/about/contact"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("contactCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
