import type { ReactNode, SVGProps } from "react";

/**
 * Minimal brand-red line-art icon for a Contact grid channel.
 *
 * Most glyphs are 24×24 stroke-only SVGs (`fill="none"`, 1.75px stroke) that
 * inherit their colour from the parent via `currentColor` — the card applies
 * the brand red token (`text-link` → `#7F1D1D` in the default theme).
 */

type IconProps = SVGProps<SVGSVGElement> & { children: ReactNode };

/** Shared line-art defaults for every channel glyph. */
function Glyph({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function PhoneChannelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </Glyph>
  );
}

export function MailChannelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Glyph>
  );
}

export function FacebookChannelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </Glyph>
  );
}

export function InstagramChannelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </Glyph>
  );
}

/**
 * TikTok note glyph. Optically scaled 1.14× around the viewBox centre so its
 * visual weight matches the Facebook/Instagram marks (which read wider).
 */
export function TikTokChannelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <g transform="translate(12 12) scale(1.14) translate(-12 -12)">
        <circle cx="8.5" cy="16" r="3.5" />
        <path d="M12 16V4c.6 2.6 2.9 4.5 5.5 4.5" />
      </g>
    </Glyph>
  );
}

/**
 * Threads — the canonical @ spiral brand mark (Simple Icons path, filled).
 */
export function ThreadsChannelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z" />
    </svg>
  );
}

export function YouTubeChannelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </Glyph>
  );
}

const CHANNEL_ICONS: Record<string, (props: SVGProps<SVGSVGElement>) => ReactNode> = {
  phone: PhoneChannelIcon,
  email: MailChannelIcon,
  facebook: FacebookChannelIcon,
  instagram: InstagramChannelIcon,
  tiktok: TikTokChannelIcon,
  threads: ThreadsChannelIcon,
  youtube: YouTubeChannelIcon,
};

/** Render the channel glyph, or `null` for an unknown key. */
export function ContactChannelIcon({
  channelKey,
  ...props
}: SVGProps<SVGSVGElement> & { channelKey: string }) {
  const Icon = CHANNEL_ICONS[channelKey];
  return Icon ? <Icon {...props} /> : null;
}
