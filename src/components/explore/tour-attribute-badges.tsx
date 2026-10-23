"use client";

import { useTranslations } from "next-intl";

interface TourAttributeBadgesProps {
  isSpecialTour?: boolean;
  /**
   * `compact` = tour-card meta rows: a smaller chip (12px / px-2 py-1) that
   * blends with the 11px location label instead of overpowering the title.
   */
  compact?: boolean;
}

/**
 * Special-tour flag chip. Renders nothing when the CMS doc carries no value,
 * so legacy cards/detail keep their exact layout until editors backfill fields.
 */
export function TourAttributeBadges({
  isSpecialTour,
  compact = false,
}: TourAttributeBadgesProps) {
  const t = useTranslations("destinations");
  if (isSpecialTour !== true) return null;

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span
        className={
          compact
            ? "rounded-none border px-2 py-1 text-xs font-medium"
            : "rounded-none border px-3 py-1 text-sm font-medium"
        }
      >
        {t("special")}
      </span>
    </span>
  );
}
