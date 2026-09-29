/** Shared image shape returned by the `imageFragment` GROQ projection. */
export interface DestinationImage {
  asset?: { url: string };
  alt?: string;
}

/** Minimal structural shape both the card and detail page can supply. */
export interface GallerySource {
  name: string;
  image?: DestinationImage;
  galleryImages?: DestinationImage[];
}

/**
 * Cover thumbnail for every listing card: first gallery asset, falling back to
 * the legacy single `image` field until backfill/Studio edits land (plan
 * 260929-1537, decision D1).
 */
export function pickCoverImage(dest: GallerySource): DestinationImage | null {
  return dest.galleryImages?.[0] ?? dest.image ?? null;
}

/**
 * Slides for the tour detail hero carousel: the `galleryImages` array; when
 * empty, the legacy `image` so the page never renders without a hero.
 */
export function pickGalleryImages(dest: GallerySource): DestinationImage[] {
  const slides = (dest.galleryImages ?? []).filter((img) => img.asset?.url);
  if (slides.length > 0) return slides;
  return dest.image?.asset?.url ? [dest.image] : [];
}
