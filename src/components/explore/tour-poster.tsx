import Image from "next/image";

export interface TourPosterImage {
  src: string;
  alt: string;
}

interface TourPosterProps {
  image: TourPosterImage;
}

/**
 * Tour detail media column: the Studio `mainPoster` rendered as a tall
 * portrait (2:3) so the media column reads like a framed movie poster. The
 * frame is capped at `max-w-md`, centered in the column and kept square-cornered
 * (sharp 90° edges) for a harsher poster feel.
 *
 * The figure is intentionally NOT sticky: it stays anchored to the top of its
 * column (`self-start` + the parent grid's `items-start`) so expanding the
 * itinerary or scrolling the long text column never drags, stretches or
 * resizes the artwork. The fixed 2:3 frame + `object-cover` keep the image's
 * aspect ratio (crop only, never distortion). On mobile it is ordered above the
 * copy, so the tour still opens with its poster.
 */
export function TourPoster({ image }: TourPosterProps) {
  return (
    <figure
      data-testid="tour-poster"
      className="order-first mx-auto w-full max-w-md self-start lg:order-none"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-none border bg-muted shadow-2xl">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 448px"
          className="object-cover"
        />
      </div>
    </figure>
  );
}
