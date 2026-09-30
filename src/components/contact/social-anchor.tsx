import type { ReactNode } from "react";
import { classifyHref } from "@/lib/social-links";

type SocialAnchorProps = {
  /** Raw destination from the CMS — empty/unsafe values render plain text. */
  targetUrl?: string | null;
  /** Visible text when no `children` are supplied. */
  displayText?: string;
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
  "data-node"?: string;
};

/**
 * Renders `displayText` (or `children`) as a real `<a>` when the destination
 * classifies as a link, otherwise as unlinked text — no dead `#` anchors.
 * External http(s) links always open in a new tab with
 * `rel="noopener noreferrer"`; `tel:`/`mailto:`/relative hrefs stay same-tab.
 */
export function SocialAnchor({
  targetUrl,
  displayText,
  children,
  className = "hover:underline",
  ...rest
}: SocialAnchorProps) {
  const target = classifyHref(targetUrl);
  const content = children ?? displayText ?? null;

  if (!target) {
    return (
      <span className={className} {...rest}>
        {content}
      </span>
    );
  }

  return (
    <a
      href={target.href}
      {...(target.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={className}
      {...rest}
    >
      {content}
    </a>
  );
}
