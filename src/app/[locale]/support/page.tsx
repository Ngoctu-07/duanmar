import type { Metadata } from "next";
import { ChevronDown, Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Support & FAQs | DuanMar",
  description:
    "Visa, weather, money, transport and safety questions from travelers to Vietnam",
};

const HOTLINE_DISPLAY = "+84 813669240";
const HOTLINE_HREF = "tel:+84813669240";
const SUPPORT_EMAIL = "duanmar@hcmussh.edu.vn";

function HotlineLink() {
  return (
    <a
      href={HOTLINE_HREF}
      className="font-extrabold text-red-500 hover:underline inline-flex items-center gap-1"
    >
      <Phone className="h-4 w-4 stroke-[2.5]" />
      {HOTLINE_DISPLAY}
    </a>
  );
}

interface BookingStep {
  title: string;
  body: string;
}

interface BookingFaq {
  q: string;
  a: string;
}

export default async function SupportPage() {
  const t = await getTranslations("support");
  const tb = await getTranslations("bookingSteps");
  const steps = tb.raw("steps") as BookingStep[];
  const bookingFaqs = tb.raw("faq") as BookingFaq[];

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: tb("title"),
    description: tb("subtitle"),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
    })),
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(howToJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section
        id="how-to-book"
        data-testid="how-to-book-stepper"
        className="mx-auto mb-12 max-w-5xl scroll-mt-24 rounded-3xl border border-zinc-200 bg-card p-6 sm:p-10 dark:border-zinc-700/50 dark:bg-neutral-900/90"
      >
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {tb("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            {tb("subtitle")}
          </p>
        </div>
        <div className="mx-auto max-w-3xl space-y-4">
          {bookingFaqs.map((item, index) => (
            <details
              key={item.q}
              data-testid={`booking-faq-${index + 1}`}
              className="group rounded-xl border border-zinc-200 bg-muted/40 p-5 dark:border-zinc-700/50 dark:bg-[#1f1f23]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4">
                {index === 0 ? (
                  <>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {steps.map((step, stepIndex) => (
                        <li
                          key={step.title}
                          data-testid={`booking-step-${stepIndex + 1}`}
                          className="flex flex-col rounded-2xl border border-zinc-200 bg-background p-5 transition-colors hover:border-zinc-300 dark:border-zinc-700/50 dark:bg-zinc-800 dark:hover:border-zinc-600"
                        >
                          <span
                            aria-hidden
                            className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                          >
                            {String(stepIndex + 1).padStart(2, "0")}
                          </span>
                          <h3 className="mb-2 text-base font-semibold">
                            {step.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {step.body}
                          </p>
                          {stepIndex === 0 && (
                            <p className="mt-3">
                              <span className="mr-2 text-sm text-muted-foreground">
                                {tb("hotlineLabel")}:
                              </span>
                              <HotlineLink />
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                    {index === 4 && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-red-900/30 bg-red-500/10 px-4 py-2 text-sm">
                          <span className="text-muted-foreground">
                            {tb("hotlineLabel")}/Zalo:
                          </span>
                          <HotlineLink />
                        </span>
                        <a
                          href={`mailto:${SUPPORT_EMAIL}`}
                          className="inline-flex items-center gap-2 rounded-full border border-red-900/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 hover:underline"
                        >
                          <Mail className="h-4 w-4 stroke-[2.5]" />
                          {SUPPORT_EMAIL}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="mx-auto mt-12 max-w-3xl text-center">
        <h2 id="contact" className="mb-2 scroll-mt-24 text-xl font-semibold">
          {t("contactTitle")}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("contactText")}</p>
        <Link
          href="/contact"
          className="text-sm font-medium text-link hover:underline"
        >
          {t("contactCta")}
        </Link>
      </div>
    </div>
  );
}
