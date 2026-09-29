"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

const DEFAULT_POSTER_SRC = "/images/promo-modal.png";

/**
 * Background video slot for the homepage About Us section. Media comes from
 * the `homepage` CMS doc (uploaded file > stream URL): a configured video
 * autoplays muted/looping/inline; without one, the frame renders a static
 * poster so the 50/50 grid never breaks. A configured video that fails to
 * load degrades to the poster + the localized "coming soon" caption.
 */
export function PromoVideo({
  videoSrc,
  posterSrc,
}: {
  videoSrc?: string | null;
  posterSrc?: string | null;
}) {
  const t = useTranslations("home");
  const [failed, setFailed] = useState(false);
  const poster = posterSrc || DEFAULT_POSTER_SRC;

  return (
    <div
      data-testid="about-promo-video"
      className="relative aspect-video overflow-hidden rounded-xl border bg-muted"
    >
      {videoSrc && !failed ? (
        <video
          src={videoSrc}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={t("aboutSection.videoAria")}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Image
          src={poster}
          alt=""
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      )}
      {videoSrc && failed && (
        <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded bg-background/80 px-3 py-1 text-sm text-muted-foreground">
          {t("aboutSection.videoFallback")}
        </span>
      )}
    </div>
  );
}
