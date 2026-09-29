"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ReviewImageLightboxProps {
  src: string | null;
  author: string;
  onClose: () => void;
}

/** Single-image viewer for a review photo — Dialog portal keeps it outside the card DOM. */
export function ReviewImageLightbox({
  src,
  author,
  onClose,
}: ReviewImageLightboxProps) {
  const t = useTranslations("destinations");

  return (
    <Dialog
      open={src !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        data-slot="review-lightbox"
        closeSlot="review-lightbox-close"
        closeLabel={t("reviews.lightboxClose")}
        className="w-[min(96vw,64rem)] max-h-[92vh] p-3"
      >
        <DialogTitle className="sr-only">
          {t("reviews.lightboxTitle")}
        </DialogTitle>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- review photos are data-URL JPEGs; next/image forces unoptimized for data: src
          <img
            src={src}
            alt={t("reviews.lightboxImageAlt", { author })}
            className="mx-auto block max-h-[80vh] w-auto max-w-full rounded-md object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
