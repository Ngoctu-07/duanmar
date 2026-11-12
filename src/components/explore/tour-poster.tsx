import Image from "next/image";

export interface TourPosterImage {
  src: string;
  alt: string;
}

interface TourPosterProps {
  image: TourPosterImage;
}

/**
 * Top of the booking sidebar: the Studio `mainPoster` as a full-width
 * portrait (2:3) so the sidebar reads like a framed movie poster. Sharp 90°
 * edges, square corners, `object-cover` crop only (never distortion).
 *
 * The stickiness lives on the sidebar wrapper, not here, so the poster and the
 * pricing/booking card travel together while the long left column scrolls.
 */
export function TourPoster({ image }: TourPosterProps) {
  return (
    <figure data-testid="tour-poster" className="w-full">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-none border bg-muted shadow-2xl">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    </figure>
  );
}
