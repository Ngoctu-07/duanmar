/** Shared types for the AI Tour Assistant (plan 260929-2335). */

export type AssistantRole = "user" | "assistant";
export type AssistantLocale = "en" | "vi";

export interface AssistantMessage {
  role: AssistantRole;
  content: string;
}

export interface AssistantRequest {
  messages: AssistantMessage[];
  locale: AssistantLocale;
}

/** One destination row trimmed for the grounding context. */
export interface GroundingDestination {
  name: string;
  slug: string;
  region: string;
  category: string;
  country: string | null;
  isSpecialTour: boolean;
  description: string;
}

export interface GroundingPricing {
  slug: string;
  minPriceVnd: number | null;
  minPriceUsd: number | null;
}

export interface GroundingArticle {
  title: string;
  slug: string;
  publishedAt: string | null;
  excerpt: string;
}

export interface GroundingContactNode {
  label: string;
  value: string;
  href: string;
}

/** Raw CMS rows feeding the serializer — pure data, easy to unit-test. */
export interface GroundingData {
  locale: AssistantLocale;
  destinations: GroundingDestination[];
  pricing: GroundingPricing[];
  articles: GroundingArticle[];
  contact: GroundingContactNode[];
}
