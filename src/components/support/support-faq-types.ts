/**
 * Shared data contracts for the /support FAQ section.
 *
 * Types live in their own tiny module so the page, the tab/accordion shell and
 * the answer renderer can all import them without a runtime circular import.
 */

export type SupportCategory = "booking" | "health";

/** Extra block rendered under an answer, keyed by the FAQ's role. */
export type SupportFaqExtras = "steps" | "channels";

export interface SupportFaqItem {
  id: string;
  category: SupportCategory;
  question: string;
  answer: string;
  extras?: SupportFaqExtras;
}

export interface SupportStep {
  title: string;
  body: string;
}

export interface SupportHotline {
  label: string;
  display: string;
  href: string;
}
