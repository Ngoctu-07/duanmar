"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { TourRatingBadge } from "@/components/rating/tour-rating-badge";
import { normalizeSearchText } from "@/lib/search-normalize";

/** Destination entries link to `/explore/destinations/<slug>`; others carry no slug. */
const destinationSlug = (entry: SearchEntry): string | undefined =>
  entry.type === "destination"
    ? entry.href.split("/").filter(Boolean).pop()
    : undefined;

export interface SearchEntry {
  title: string;
  desc: string;
  href: string;
  type: string;
  keywords?: string;
}

export interface SearchLabels {
  title: string;
  placeholder: string;
  hint: string;
  noResults: string;
  types: Record<string, string>;
}

/** Accent/case folding lives in `src/lib/search-normalize.ts` (shared with tour search). */
const normalize = normalizeSearchText;

interface SearchClientProps {
  entries: SearchEntry[];
  labels: SearchLabels;
  initialQuery?: string;
}

export function SearchClient({ entries, labels, initialQuery = "" }: SearchClientProps) {
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => {
    const normalizedQuery = normalize(query).trim();
    if (!normalizedQuery) return [];
    const tokens = normalizedQuery.split(/\s+/);
    const matched = entries.filter((entry) => {
      const haystack = normalize(
        `${entry.title} ${entry.desc} ${entry.keywords ?? ""}`
      );
      return tokens.every((token) => haystack.includes(token));
    });
    return matched.sort(
      (a, b) =>
        Number(normalize(b.title).includes(normalizedQuery)) -
        Number(normalize(a.title).includes(normalizedQuery))
    );
  }, [entries, query]);

  const showResults = query.trim().length > 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-5 w-5 stroke-[1.5] -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="h-12 w-full rounded-lg border bg-background pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {!showResults && (
        <p className="text-center text-sm text-muted-foreground">{labels.hint}</p>
      )}

      {showResults && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">{labels.noResults}</p>
      )}

      {showResults && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((result) => (
            <li key={`${result.href}::${result.title}`}>
              <Link
                href={result.href}
                className="block rounded-xl border p-5 transition-colors hover:bg-muted"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-link">
                    {labels.types[result.type] ?? labels.types.page}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 font-medium">{result.title}</div>
                  <TourRatingBadge slug={destinationSlug(result)} />
                </div>
                <div className="line-clamp-1 text-sm text-muted-foreground">
                  {result.desc}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
