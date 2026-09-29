import type { ReactNode } from "react";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";

/**
 * Shared Portable Text typography (red/black/white brand tokens only).
 * Used by the About narrative, article rich text, and the newspaper feed
 * so every PT surface shares one voice (plan 260929-2151).
 */
export const PT_COMPONENTS = {
  block: {
    normal: ({ children }: { children?: ReactNode }) => (
      <p className="leading-relaxed">{children}</p>
    ),
  },
  list: {
    bullet: ({ children }: { children?: ReactNode }) => (
      <ul className="list-disc space-y-1 pl-5">{children}</ul>
    ),
    number: ({ children }: { children?: ReactNode }) => (
      <ol className="list-decimal space-y-1 pl-5">{children}</ol>
    ),
  },
  marks: {
    strong: ({ children }: { children?: ReactNode }) => (
      <strong className="font-semibold">{children}</strong>
    ),
  },
};

/** Locale → other-locale → null selection shared by all bilingual PT fields. */
export function pickLocaleBlocks(
  blocksEn: PortableTextBlock[] | null | undefined,
  blocksVi: PortableTextBlock[] | null | undefined,
  locale: string
): PortableTextBlock[] | null {
  const blocks =
    (locale === "vi" ? blocksVi : blocksEn) ??
    (locale === "vi" ? blocksEn : blocksVi) ??
    null;
  return blocks && blocks.length > 0 ? blocks : null;
}

/** Portable Text body for pre-picked blocks (null/empty → render nothing). */
export function ArticleRichText({
  blocks,
  className,
}: {
  blocks?: PortableTextBlock[] | null;
  className?: string;
}) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className={className}>
      <PortableText value={blocks} components={PT_COMPONENTS} />
    </div>
  );
}
