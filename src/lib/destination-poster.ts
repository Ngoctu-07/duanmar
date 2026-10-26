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
  /** Landscape homepage-card crop (schema field `cardThumbnail`). */
  cardThumbnail?: DestinationImage;
  /** Portrait detail-page poster (schema field `mainPoster`). */
  mainPoster?: DestinationImage;
  /** Deprecated single-image field, kept as a pre-backfill fallback. */
  posterImage?: DestinationImage;
  /** Pre-poster gallery frame, last-resort legacy fallback. */
  legacyGalleryImage?: DestinationImage;
}

const withAsset = (image?: DestinationImage | null): DestinationImage | null =>
  image?.asset?.url ? image : null;

/**
 * Homepage/listing cards render the landscape thumbnail, falling back to the
 * portrait poster (then legacy art) so a half-migrated document never paints a
 * broken frame. Objects whose asset has no URL are treated as empty.
 */
export function pickCardImage(dest: PosterSource): DestinationImage | null {
  return (
    withAsset(dest.cardThumbnail) ??
    withAsset(dest.mainPoster) ??
    withAsset(dest.posterImage) ??
    withAsset(dest.legacyGalleryImage)
  );
}

/**
 * Detail pages and booking surfaces render the portrait poster, falling back to
 * legacy art (then the landscape thumbnail) for documents that predate the
 * dual-image schema.
 */
export function pickMainPoster(dest: PosterSource): DestinationImage | null {
  return (
    withAsset(dest.mainPoster) ??
    withAsset(dest.posterImage) ??
    withAsset(dest.cardThumbnail) ??
    withAsset(dest.legacyGalleryImage)
  );
}
