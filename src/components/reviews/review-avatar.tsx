import Image from "next/image";
import { UserRound } from "lucide-react";

interface ReviewAvatarProps {
  /** Live account avatar URL; guests and accounts without a preset pass null. */
  src?: string | null;
  size?: "sm" | "md";
}

const SIZES = { sm: "h-7 w-7", md: "h-9 w-9" } as const;
const ICONS = { sm: "h-3.5 w-3.5", md: "h-4 w-4" } as const;
const PIXELS = { sm: 28, md: 36 } as const;

/**
 * Circular review avatar. A live account image wins; otherwise render the
 * featureless default silhouette (Facebook-style placeholder) rather than
 * generated initials, so guest reviews never leak a booking name.
 */
export function ReviewAvatar({ src, size = "md" }: ReviewAvatarProps) {
  if (src) {
    return (
      <span
        data-testid="review-avatar"
        data-avatar-kind="image"
        className={`inline-flex shrink-0 overflow-hidden rounded-full border border-white/15 bg-muted ${SIZES[size]}`}
        aria-hidden
      >
        <Image
          src={src}
          alt=""
          width={PIXELS[size]}
          height={PIXELS[size]}
          className="h-full w-full rounded-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      data-testid="review-avatar"
      data-avatar-kind="default"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-muted text-muted-foreground ${SIZES[size]}`}
      aria-hidden
    >
      <UserRound className={ICONS[size]} />
    </span>
  );
}
