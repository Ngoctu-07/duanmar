import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { DESTINATIONS_QUERY } from "@/sanity/queries/destinations";
import {
  SearchClient,
  type SearchEntry,
  type SearchLabels,
} from "@/components/search/search-client";

export const metadata: Metadata = {
  title: "Search | Vietnam Tourism",
  description: "Search destinations, guides and stories",
};

interface SearchMessages {
  planTrip: { guides: Record<string, { title: string; summary: string }> };
  thingsToDo: {
    categories: Record<string, { title: string; summary: string; activities: string[] }>;
  };
  itineraries: {
    items: Record<string, { title: string; summary: string; regions: string }>;
  };
  festivals: {
    items: { name: string; description: string; when: string; location: string }[];
  };
  culture: { sections: Record<string, { heading: string; body: string }> };
  deals: { items: { title: string; description: string; tag: string }[] };
  news: {
    items: Record<
      string,
      { title: string; excerpt: string; content: string[] }
    >;
  };
  about: Record<"contact" | "careers" | "press", { title: string; subtitle: string }>;
}

interface DestinationRow {
  name: string;
  slug: { current: string };
  description: string | null;
  region: string | null;
}

const collect = (
  entries: SearchEntry[],
  type: string,
  href: string,
  title: string,
  desc: string,
  keywords?: string
) => {
  if (title) entries.push({ title, desc: desc ?? "", href, type, keywords });
};

function buildEntries(
  messages: SearchMessages,
  destinations: DestinationRow[]
): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const [slug, guide] of Object.entries(messages.planTrip?.guides ?? {})) {
    collect(entries, "guide", `/plan-your-trip/${slug}`, guide.title, guide.summary);
  }
  for (const [slug, category] of Object.entries(
    messages.thingsToDo?.categories ?? {}
  )) {
    collect(
      entries,
      "activity",
      `/explore/things-to-do/${slug}`,
      category.title,
      category.summary,
      (category.activities ?? []).join(" ")
    );
  }
  for (const [slug, itinerary] of Object.entries(
    messages.itineraries?.items ?? {}
  )) {
    collect(
      entries,
      "itinerary",
      `/explore/itineraries/${slug}`,
      itinerary.title,
      itinerary.summary,
      itinerary.regions
    );
  }
  for (const festival of messages.festivals?.items ?? []) {
    collect(
      entries,
      "festival",
      "/explore/festivals",
      festival.name,
      festival.description,
      `${festival.when} ${festival.location}`
    );
  }
  for (const section of Object.values(messages.culture?.sections ?? {})) {
    collect(entries, "page", "/culture", section.heading, section.body);
  }
  for (const deal of messages.deals?.items ?? []) {
    collect(entries, "page", "/deals", deal.title, deal.description, deal.tag);
  }
  for (const [slug, article] of Object.entries(messages.news?.items ?? {})) {
    collect(
      entries,
      "article",
      `/news/${slug}`,
      article.title,
      article.excerpt,
      (article.content ?? []).join(" ")
    );
  }
  for (const [slug, page] of Object.entries(messages.about ?? {})) {
    collect(entries, "page", `/about/${slug}`, page.title, page.subtitle);
  }
  for (const destination of destinations) {
    collect(
      entries,
      "destination",
      `/explore/destinations/${destination.slug.current}`,
      destination.name,
      destination.description ?? "",
      destination.region ?? ""
    );
  }

  return entries;
}

export default async function SearchPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, messages, destinations, t] = await Promise.all([
    searchParams,
    getMessages(),
    fetchPublished(DESTINATIONS_QUERY, { region: "" }, {
      tags: ["sanity:destination:list"],
    }),
    getTranslations("search"),
  ]);

  const entries = buildEntries(
    messages as unknown as SearchMessages,
    (destinations ?? []) as DestinationRow[]
  );

  const labels: SearchLabels = {
    title: t("title"),
    placeholder: t("placeholder"),
    hint: t("hint"),
    noResults: t("noResults"),
    types: {
      destination: t("destination"),
      guide: t("guide"),
      activity: t("activity"),
      itinerary: t("itinerary"),
      festival: t("festival"),
      article: t("article"),
      page: t("page"),
    },
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
      </div>
      <SearchClient entries={entries} labels={labels} initialQuery={q ?? ""} />
    </div>
  );
}
