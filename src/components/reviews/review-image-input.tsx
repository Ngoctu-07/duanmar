"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { downscaleImageToDataUrl } from "@/lib/reviews";

const MAX_IMAGES = 3;

interface ReviewImageInputProps {
  value: string[];
  disabled: boolean;
  onChange: (images: string[]) => void;
}

/**
 * Photo picker for the review form: ≤3 images, each downscaled client-side to
 * an 800px JPEG data URL (strips EXIF/scripts). Surfaces a quota/processing
 * error instead of silently dropping data.
 */
export function ReviewImageInput({ value, disabled, onChange }: ReviewImageInputProps) {
  const t = useTranslations("destinations");
  const [error, setError] = useState(false);

  const pick = async (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, MAX_IMAGES - value.length));
    let next = value;
    let failed = false;
    for (const file of picked) {
      if (next.length >= MAX_IMAGES) break;
      try {
        next = [...next, await downscaleImageToDataUrl(file, 800, 0.7)];
      } catch {
        failed = true;
      }
    }
    setError(failed);
    if (next.length !== value.length) onChange(next);
  };

  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground">{t("reviews.imagesHint")}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || value.length >= MAX_IMAGES}
          onChange={(event) => {
            void pick(event.target.files);
            event.target.value = "";
          }}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
        />
        {value.map((image, index) => (
          <span key={index} className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- data-URL preview */}
            <img
              src={image}
              alt=""
              className="h-14 w-14 rounded-md border object-cover"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label={`remove-${index}`}
              className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {error && (
        <p className="mt-1 text-sm text-destructive">{t("reviews.errorStorage")}</p>
      )}
    </div>
  );
}
