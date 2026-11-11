"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

import { SupportAccordionItem } from "./support-accordion-item";
import type {
  SupportCategory,
  SupportFaqItem,
  SupportHotline,
  SupportStep,
} from "./support-faq-types";

interface SupportFaqSectionProps {
  /** Tab order is authored by the page; the first tab is the default. */
  tabs: Array<{ id: SupportCategory; label: string }>;
  items: SupportFaqItem[];
  steps: SupportStep[];
  hotline: SupportHotline;
  supportEmail: string;
  supportMailto: string;
  tabsLabel: string;
  emptyLabel: string;
}

/**
 * Category-filtered FAQ accordions for /support.
 *
 * The filters use the standard body face (`font-sans`) on purpose — the
 * horror display face stays reserved for the page title.
 *
 * Both tabs render through the same `SupportAccordionItem`, so the "Sức khỏe"
 * list has identical toggle mechanics to "Hướng dẫn đặt tour": every panel
 * starts collapsed (`openId = null`), tab switches also reset to collapsed,
 * and only an explicit click/keyboard activation reveals an answer.
 *
 * Copy itself stays in the message catalogs; this leaf only owns the
 * tab/accordion state and the WAI-ARIA keyboard model (arrows, Home, End).
 */
export function SupportFaqSection({
  tabs,
  items,
  steps,
  hotline,
  supportEmail,
  supportMailto,
  tabsLabel,
  emptyLabel,
}: SupportFaqSectionProps) {
  const [active, setActive] = useState<SupportCategory>(tabs[0]?.id ?? "booking");
  // `null` = every FAQ starts fully collapsed on load and on every tab switch.
  const [openId, setOpenId] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visible = items.filter((item) => item.category === active);

  const selectTab = (id: SupportCategory) => {
    setActive(id);
    setOpenId(null);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
        next = index === 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      id="how-to-book"
      data-testid="how-to-book-stepper"
      className="mx-auto mb-12 max-w-5xl scroll-mt-24"
    >
      <div
        role="tablist"
        aria-label={tabsLabel}
        data-testid="support-tabs"
        className="mb-8 flex flex-wrap gap-x-8 gap-y-2 border-b border-white/10"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`support-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls="support-faq-list"
              tabIndex={selected ? 0 : -1}
              data-testid={`support-tab-${tab.id}`}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cn(
                "-mb-px cursor-pointer border-b-2 pb-3 font-sans text-sm font-medium tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected
                  ? "border-[#b3151b] text-[#b3151b]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id="support-faq-list"
        role="tabpanel"
        aria-labelledby={`support-tab-${active}`}
        data-testid="support-faq-list"
        className="border border-zinc-200 bg-card p-6 sm:p-10 dark:border-zinc-700/50 dark:bg-neutral-900/90"
      >
        {visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="space-y-4">
            {/* One shared item component for both tabs — no static health panel. */}
            {visible.map((item) => (
              <SupportAccordionItem
                key={item.id}
                item={item}
                open={item.id === openId}
                onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
                steps={steps}
                hotline={hotline}
                supportEmail={supportEmail}
                supportMailto={supportMailto}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
