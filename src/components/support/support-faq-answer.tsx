import { Mail, Phone } from "lucide-react";

import type {
  SupportFaqExtras,
  SupportHotline,
  SupportStep,
} from "./support-faq-types";

interface SupportFaqAnswerProps {
  answer: string;
  extras?: SupportFaqExtras;
  steps: SupportStep[];
  hotline: SupportHotline;
  supportEmail: string;
  supportMailto: string;
}

function HotlineLink({ hotline }: { hotline: SupportHotline }) {
  return (
    <a
      href={hotline.href}
      className="inline-flex items-center gap-1 font-extrabold text-red-500 hover:underline"
    >
      <Phone aria-hidden="true" className="h-4 w-4 stroke-[2.5]" />
      {hotline.display}
    </a>
  );
}

/**
 * Body of one FAQ panel: the answer copy plus its role-specific block —
 * the numbered booking steps (with the hotline on step 01) or the direct
 * support channels (hotline + the CMS email pill).
 */
export function SupportFaqAnswer({
  answer,
  extras,
  steps,
  hotline,
  supportEmail,
  supportMailto,
}: SupportFaqAnswerProps) {
  return (
    <>
      <p className="text-sm leading-relaxed text-muted-foreground">{answer}</p>

      {extras === "steps" && (
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, stepIndex) => (
            <li
              key={step.title}
              data-testid={`booking-step-${stepIndex + 1}`}
              className="flex flex-col border border-zinc-200 bg-background p-5 transition-colors hover:border-zinc-300 dark:border-zinc-700/50 dark:bg-zinc-800 dark:hover:border-zinc-600"
            >
              <span
                aria-hidden="true"
                className="mb-3 flex size-10 items-center justify-center bg-primary text-sm font-bold text-primary-foreground"
              >
                {String(stepIndex + 1).padStart(2, "0")}
              </span>
              <h3 className="mb-2 text-base font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              {stepIndex === 0 && (
                <p className="mt-3">
                  <span className="mr-2 text-sm text-muted-foreground">
                    {hotline.label}:
                  </span>
                  <HotlineLink hotline={hotline} />
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {extras === "channels" && (
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 border border-red-900/30 bg-red-500/10 px-4 py-2 text-sm">
            <span className="text-muted-foreground">{hotline.label}/Zalo:</span>
            <HotlineLink hotline={hotline} />
          </span>
          <a
            href={supportMailto}
            data-testid="support-email-link"
            className="inline-flex items-center gap-2 border border-red-900/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 hover:underline"
          >
            <Mail aria-hidden="true" className="h-4 w-4 stroke-[2.5]" />
            {supportEmail}
          </a>
        </div>
      )}
    </>
  );
}
