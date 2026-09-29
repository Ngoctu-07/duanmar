import { fetchPublished } from "@/sanity/lib/fetch-published";
import { contactNodesFor } from "@/lib/assistant/contact-nodes";
import {
  GROUNDING_QUERY_SOURCES,
  serializeGrounding,
} from "@/lib/assistant/grounding-context";
import type { AssistantLocale, GroundingData } from "@/lib/assistant/assistant-types";

const [DESTINATIONS_QUERY, ALL_TOUR_PRICING_QUERY, ARTICLES_QUERY] =
  GROUNDING_QUERY_SOURCES;

interface RawDestination {
  name?: string | null;
  slug?: { current?: string } | null;
  region?: string | null;
  category?: string | null;
  country?: { vi?: string | null; en?: string | null } | null;
  isSpecialTour?: boolean | null;
  description?: string | null;
}

interface RawPricing {
  tourSlug?: string | null;
  tiers?: { pricePerGuestVnd?: number | null; pricePerGuestUsd?: number | null }[] | null;
}

interface RawArticle {
  title_en?: string | null;
  title_vi?: string | null;
  excerpt_en?: string | null;
  excerpt_vi?: string | null;
  slug?: { current?: string } | null;
  publishedAt?: string | null;
}

/**
 * Fetch CMS rows (cached, fail-open via `fetchPublished`) and serialize the
 * grounding context. Server-only — never called from client components.
 */
export async function buildGroundingContext(locale: AssistantLocale): Promise<string> {
  const [destinations, pricing, articles] = await Promise.all([
    fetchPublished(DESTINATIONS_QUERY, { region: "" }),
    fetchPublished(ALL_TOUR_PRICING_QUERY, {}),
    fetchPublished(ARTICLES_QUERY, {}),
  ]);

  // fetchPublished fails open to `null` — all three null means the CMS read
  // itself broke (vs. legitimately empty datasets returning []). Surface it so
  // the route can 502 instead of streaming a context-free reply (review fix).
  if (destinations === null && pricing === null && articles === null) {
    throw new Error("grounding fetch failed: all CMS reads returned null");
  }

  const data: GroundingData = {
    locale,
    destinations: ((destinations ?? []) as RawDestination[]).map((d) => ({
      name: d.name ?? "Unknown",
      slug: d.slug?.current ?? "",
      region: d.region ?? "",
      category: d.category ?? "",
      country: d.country?.[locale] ?? null,
      isSpecialTour: d.isSpecialTour === true,
      description: d.description ?? "",
    })),
    pricing: ((pricing ?? []) as RawPricing[]).map((p) => {
      const vnd = (p.tiers ?? [])
        .map((t) => t.pricePerGuestVnd)
        .filter((v): v is number => typeof v === "number");
      const usd = (p.tiers ?? [])
        .map((t) => t.pricePerGuestUsd)
        .filter((v): v is number => typeof v === "number");
      return {
        slug: p.tourSlug ?? "",
        minPriceVnd: vnd.length > 0 ? Math.min(...vnd) : null,
        minPriceUsd: usd.length > 0 ? Math.min(...usd) : null,
      };
    }),
    articles: ((articles ?? []) as RawArticle[]).map((a) => ({
      title: a[locale === "vi" ? "title_vi" : "title_en"] ?? a.title_en ?? a.title_vi ?? "",
      slug: a.slug?.current ?? "",
      publishedAt: a.publishedAt ?? null,
      excerpt:
        a[locale === "vi" ? "excerpt_vi" : "excerpt_en"] ?? a.excerpt_en ?? a.excerpt_vi ?? "",
    })),
    contact: contactNodesFor(locale),
  };

  return serializeGrounding(data);
}
