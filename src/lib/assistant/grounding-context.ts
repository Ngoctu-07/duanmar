import { ARTICLES_QUERY } from "@/sanity/queries/articles";
import { DESTINATIONS_QUERY } from "@/sanity/queries/destinations";
import { ALL_TOUR_PRICING_QUERY } from "@/sanity/queries/tour-pricing";
import type { GroundingData } from "@/lib/assistant/assistant-types";

/** Hard cap on serialized context — keeps prompts predictable/cheap. */
export const MAX_CONTEXT_CHARS = 16_000;
/** Per-field caps applied by `truncate`. */
export const FIELD_CAPS = { description: 300, excerpt: 240, title: 160 } as const;

/** Query sources exported for unit contract asserts (plan phase-04). */
export const GROUNDING_QUERY_SOURCES = [
  DESTINATIONS_QUERY,
  ALL_TOUR_PRICING_QUERY,
  ARTICLES_QUERY,
] as const;

export function truncate(text: string | null | undefined, max: number): string {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

/** Plain-text → compact markdown of grounding data (pure, unit-tested). */
export function serializeGrounding(data: GroundingData): string {
  const lines: string[] = [
    `# DuanMar Travel CMS grounding (locale: ${data.locale})`,
    "",
    `## Destinations (${data.destinations.length})`,
  ];
  for (const d of data.destinations) {
    const meta = [
      `slug: ${d.slug}`,
      `region: ${d.region}`,
      `category: ${d.category}`,
      d.country ? `country: ${d.country}` : null,
      d.isSpecialTour ? "special tour: yes" : null,
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(
      `- ${d.name} (${meta}): ${truncate(d.description, FIELD_CAPS.description) || "(no description)"}`
    );
  }

  lines.push("", `## Tour pricing (${data.pricing.length})`);
  for (const p of data.pricing) {
    const parts: string[] = [];
    if (p.minPriceVnd != null) parts.push(`from ${p.minPriceVnd.toLocaleString("en-US")} VND/guest`);
    if (p.minPriceUsd != null) parts.push(`from ${p.minPriceUsd} USD/guest`);
    lines.push(`- ${p.slug}: ${parts.join(" · ") || "pricing not published"}`);
  }

  lines.push("", `## Latest articles (${data.articles.length})`);
  for (const a of data.articles) {
    const date = a.publishedAt ? a.publishedAt.slice(0, 10) : "n/a";
    lines.push(
      `- "${truncate(a.title, FIELD_CAPS.title)}" (slug: ${a.slug}, published ${date}): ${truncate(
        a.excerpt,
        FIELD_CAPS.excerpt
      )}`
    );
  }

  lines.push("", `## Contact (${data.contact.length})`);
  for (const c of data.contact) {
    lines.push(`- ${c.label}: ${c.value} (${c.href})`);
  }

  const out = lines.join("\n");
  if (out.length <= MAX_CONTEXT_CHARS) return out;
  return `${out.slice(0, MAX_CONTEXT_CHARS)}\n…[context truncated at ${MAX_CONTEXT_CHARS} chars]`;
}
