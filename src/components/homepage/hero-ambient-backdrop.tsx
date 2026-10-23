import Image from "next/image";

export interface HeroBackgroundMedia {
  url: string;
  /** Sanity file asset mime type (`video/mp4`, `image/gif`, …). */
  mimeType?: string | null;
}

interface HeroAmbientBackdropProps {
  /** Still frame underneath the ambience (promo poster > CMS hero image). */
  imageSrc?: string | null;
  /** CMS `heroBackgroundMedia` — full-bleed looping video or animated GIF. */
  media?: HeroBackgroundMedia | null;
  /**
   * Optional looping ambience (mp4/webm) used when no CMS background media is
   * configured. Pass `NEXT_PUBLIC_HERO_AMBIENT_VIDEO`; the CSS fog/CRT layers
   * stay underneath as a graceful fallback.
   */
  videoSrc?: string | null;
}

const isVideoMedia = (media: HeroBackgroundMedia) => {
  const mime = media.mimeType?.toLowerCase().trim();
  if (mime) return mime.startsWith("video/");
  return /\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i.test(media.url);
};

/**
 * Full-bleed horror ambience for the homepage hero: CMS background media
 * (video/GIF → still frame → gradient), two slowly drifting fog banks and a low
 * ember glow. The media keeps its native clarity and is only dimmed to 88%
 * brightness — no noise/CRT/glitch overlay touches it. There is deliberately no
 * darkening vignette. Purely decorative (`aria-hidden`, pointer-events-none)
 * and motion-safe (all keyframes are disabled under `prefers-reduced-motion`).
 */
export function HeroAmbientBackdrop({
  imageSrc,
  media,
  videoSrc,
}: HeroAmbientBackdropProps) {
  return (
    <div
      data-testid="hero-ambient"
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0a0a]"
    >
      {media ? (
        <div
          data-testid="hero-background-media"
          data-media-type={isVideoMedia(media) ? "video" : "image"}
          className="hero-background-media absolute inset-0"
        >
          {isVideoMedia(media) ? (
            <video
              data-testid="hero-background-video"
              src={media.url}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              tabIndex={-1}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={media.url}
              alt=""
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover"
            />
          )}
        </div>
      ) : imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-background-media object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#2a0d0f_0%,#0a0708_60%,#050505_100%)]" />
      )}

      {!media && videoSrc ? (
        <video
          data-testid="hero-ambient-video"
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          className="hero-background-media absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      <div className="horror-fog horror-fog-a" />
      <div className="horror-fog horror-fog-b" />
      <div className="horror-ember" />
    </div>
  );
}
