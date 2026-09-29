import { PortableText, type PortableTextBlock } from "next-sanity";
import { PT_COMPONENTS, pickLocaleBlocks } from "@/components/sanity/portable-text";

/**
 * CMS-bound About Us narrative (Portable Text, plan 260929-2114).
 * Locale block → other-locale fallback → render nothing: the hardcoded
 * placeholder copy was removed, so an empty field shows no paragraph at all.
 */
export function AboutNarrative({
  storyEn,
  storyVi,
  locale,
}: {
  storyEn?: PortableTextBlock[] | null;
  storyVi?: PortableTextBlock[] | null;
  locale: string;
}) {
  const blocks = pickLocaleBlocks(storyEn, storyVi, locale);
  if (!blocks) return null;

  return (
    <div
      data-testid="about-narrative"
      className="mt-4 space-y-4 text-muted-foreground"
    >
      <PortableText value={blocks} components={PT_COMPONENTS} />
    </div>
  );
}
