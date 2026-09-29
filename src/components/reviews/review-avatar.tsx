import { User } from "lucide-react";

interface ReviewAvatarProps {
  name: string;
  size?: "sm" | "md";
}

const SIZES = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm" } as const;

/** Initials bubble (first char of first two words); falls back to a User icon. */
export function ReviewAvatar({ name, size = "md" }: ReviewAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  if (!initials) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ${SIZES[size]}`}
        aria-hidden
      >
        <User className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary ${SIZES[size]}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
