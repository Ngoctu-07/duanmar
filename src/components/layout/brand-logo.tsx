import Image from "next/image";
import { cn } from "cn";

/** Isolated DuanMar badge — circular alpha mask, transparent outside the emblem. */
export function BrandLogo({
  size = 36,
  className,
  priority = false,
  variant = "default",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  /** `knockout` = transparent white-stroke rendition for the red footer. */
  variant?: "default" | "knockout";
}) {
  return (
    <Image
      src={
        variant === "knockout"
          ? "/images/logo-duanmar-white.png"
          : "/images/logo-duanmar.png"
      }
      alt="DuanMar"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
