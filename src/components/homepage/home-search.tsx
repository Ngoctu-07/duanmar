"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buildSearchHref } from "@/lib/tour-search";
import { Search } from "lucide-react";

interface HomeSearchProps {
  /**
   * Reserve space for the hero promo film, which hangs 40% of its height below
   * the 100vh hero. When false (no promo asset), keep the original compact gap.
   */
  breakoutVideo?: boolean;
}

/**
 * Standalone minimalist homepage search. Sits immediately below the full-
 * viewport hero and above "Featured Destinations": a border-only input (no CTA
 * button) that submits on Enter and redirects to the `/search` results page.
 *
 * The section stacks above the breakout promo film (`relative z-30`) and pads
 * its top by the film's overhang + 24px, so the film overlaps only the empty
 * top of the section and never covers the search control.
 *
 * The input stays transparent (`bg-transparent`) as asserted by the browser
 * suite — the horror theme is carried by the red eyebrow and the hairline
 * border rather than a filled control.
 */
export function HomeSearch({ breakoutVideo = false }: HomeSearchProps) {
  const t = useTranslations("home");
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = () => router.push(buildSearchHref(query));

  return (
    <section
      data-testid="home-search"
      aria-label={t("searchPlaceholder")}
      className={`container relative z-30 mx-auto px-4 pb-8 md:pb-12 ${
        breakoutVideo
          ? "pt-[calc(var(--hero-video-overhang)+1.5rem)]"
          : "pt-12 md:pt-16"
      }`}
    >
      <div className="mx-auto max-w-2xl">
        <p className="mb-5 text-center font-sans text-[11px] font-medium uppercase tracking-[0.45em] text-link">
          {t("searchEyebrow")}
        </p>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 stroke-[1.5] text-link" />
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
              className="h-14 w-full rounded-none border border-white/30 bg-transparent pr-5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:border-link focus:outline-none"
            />
          </div>
        </form>
      </div>
    </section>
  );
}
