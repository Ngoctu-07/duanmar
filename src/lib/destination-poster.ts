import type { LocaleString } from "@/lib/bilingual-string";

/** Shared image shape returned by the `imageFragment` GROQ projection. */
export interface DestinationImage {
  asset?: { url: string };
  alt?: string;
}

/** Minimal structural shape both the card and detail page can supply. */
export interface PosterSource {
  /** Unread by the helper — typed loosely for localized `name`. */
  name?: LocaleString;
  /** Single CMS poster asset (schema field `posterImage`). */
  posterImage?: DestinationImage;
}

/**
 * The one image every destination surface renders: the Studio `posterImage`.
 * Returns `null` when the doc has no asset URL so the caller can fall back to a
 * text-only layout instead of painting a broken frame.
 */
export function pickPosterImage(dest: PosterSource): DestinationImage | null {
  return dest.posterImage?.asset?.url ? dest.posterImage : null;
}
