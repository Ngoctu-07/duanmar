"use client";

import { useTranslations } from "next-intl";

interface TourAttributeBadgesProps {
  isSpecialTour?: boolean;
}

/**
 * Special-tour flag chip. Renders nothing when the CMS doc carries no value,
 * so legacy cards/detail keep their exact layout until editors backfill fields.
 */
export function TourAttributeBadges({
  isSpecialTour,
}: TourAttributeBadgesProps) {
  const t = useTranslations("destinations");
  if (isSpecialTour !== true) return null;

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border px-3 py-1 text-xs font-medium">
        {t("special")}
      </span>
    </span>
  );
}
