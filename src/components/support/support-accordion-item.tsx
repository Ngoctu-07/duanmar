"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import { SupportFaqAnswer } from "./support-faq-answer";
import type {
  SupportFaqItem,
  SupportHotline,
  SupportStep,
} from "./support-faq-types";

interface SupportAccordionItemProps {
  item: SupportFaqItem;
  open: boolean;
  onToggle: () => void;
  steps: SupportStep[];
  hotline: SupportHotline;
  supportEmail: string;
  supportMailto: string;
}

/**
 * One collapsible FAQ row — the single toggle used by *both* category tabs.
 *
 * Collapsed is the default for every item; the answer wrapper animates
 * `transition-all duration-300` through the 0fr→1fr grid track, and the
 * closed panel is `inert` (not just visually hidden) so its copy and links
 * stay out of the keyboard tab order. The chevron rotates 180° while open.
 */
export function SupportAccordionItem({
  item,
  open,
  onToggle,
  steps,
  hotline,
  supportEmail,
  supportMailto,
}: SupportAccordionItemProps) {
  return (
    <div
      data-testid="support-faq-item"
      data-faq-id={item.id}
      className="border border-zinc-200 bg-muted/40 dark:border-zinc-700/50 dark:bg-[#1f1f23]"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`support-faq-panel-${item.id}`}
        data-testid="support-faq-question"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left font-medium"
      >
        <span className="min-w-0 flex-1">{item.question}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        id={`support-faq-panel-${item.id}`}
        aria-hidden={!open}
        // `inert` keeps the collapsed copy unfocusable for keyboards.
        inert={!open}
        className={cn(
          "grid transition-all duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">
            <SupportFaqAnswer
              answer={item.answer}
              extras={item.extras}
              steps={steps}
              hotline={hotline}
              supportEmail={supportEmail}
              supportMailto={supportMailto}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
