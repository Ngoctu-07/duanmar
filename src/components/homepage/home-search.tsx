"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buildSearchHref } from "@/lib/tour-search";
import { Search } from "lucide-react";

/**
 * Standalone minimalist homepage search. Sits between the full-viewport hero
 * and "Featured Destinations": a border-only input (no CTA button) that
 * submits on Enter and redirects to the `/search` results page.
 */
export function HomeSearch() {
  const t = useTranslations("home");
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = () => router.push(buildSearchHref(query));

  return (
    <section
      data-testid="home-search"
      aria-label={t("searchPlaceholder")}
      className="container mx-auto px-4 py-10 md:py-14"
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="mx-auto max-w-2xl"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 stroke-[1.5] text-muted-foreground" />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="h-12 w-full rounded-full border border-black/30 bg-transparent pl-10 pr-5 text-foreground placeholder:text-muted-foreground focus:border-black focus:outline-none dark:border-white/30 dark:focus:border-white"
          />
        </div>
      </form>
    </section>
  );
}
