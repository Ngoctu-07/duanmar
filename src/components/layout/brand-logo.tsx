import Image from "next/image";
import { cn } from "cn";

/** Isolated DuanMar badge — circular alpha mask, transparent outside the emblem. */
export function BrandLogo({
  size = 36,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/images/logo-duanmar.png"
      alt="DuanMar"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
