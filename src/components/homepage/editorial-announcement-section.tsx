import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { classifyHref } from "@/lib/social-links";

/** Image shape produced by the shared `imageFragment` GROQ fragment. */
type CmsImage = {
  asset?: { url?: string | null } | null;
  alt?: string | null;
};

/** One `homepage.editorialAnnouncement` object from the CMS. */
export interface EditorialAnnouncementData {
  announcement?: string | null;
  heading?: string | null;
  body?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  bgImage?: CmsImage | null;
  foregroundImage?: CmsImage | null;
}

const CTA_CLASS =
  "inline-flex items-center justify-center rounded-none bg-[#2F110F] px-5 py-2.5 text-xs uppercase tracking-wider text-[#D9D9D9] transition-colors hover:bg-[#2F110F]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9D9D9]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]";

/**
 * Fail-closed CTA: unsafe/empty hrefs render nothing; site-relative paths use
 * the locale-aware `Link`, externals open in a new tab with `noopener`.
 */
function CtaButton({ text, href }: { text: string; href?: string | null }) {
  const target = classifyHref(href);
  if (!target) return null;

  if (target.href.startsWith("/")) {
    return (
      <Link href={target.href} className={CTA_CLASS}>
        {text}
      </Link>
    );
  }

  return (
    <a
      href={target.href}
      className={CTA_CLASS}
      {...(target.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {text}
    </a>
  );
}

/**
 * Inverted editorial announcement band: overlapping portrait collage on the
 * left, divider + tag + heading + body + optional CTA on the right.
 *
 * Data lives in `homepage.editorialAnnouncement` (Studio). Missing data or
 * empty copy omits the whole section so the homepage layout never breaks.
 */
export function EditorialAnnouncementSection({
  data,
}: {
  data?: EditorialAnnouncementData | null;
}) {
  if (!data) return null;

  const announcement = data.announcement?.trim();
  const heading = data.heading?.trim();
  const body = data.body?.trim();
  const ctaText = data.ctaText?.trim();
  const bgUrl = data.bgImage?.asset?.url ?? null;
  const fgUrl = data.foregroundImage?.asset?.url ?? null;

  if (!announcement && !heading && !body && !ctaText && !bgUrl && !fgUrl) {
    return null;
  }

  const imageAlt =
    data.bgImage?.alt?.trim() ||
    heading ||
    announcement ||
    "Editorial announcement";

  return (
    <section
      data-testid="editorial-announcement-section"
      className="bg-[#121212] py-16 transition-opacity duration-300 lg:py-24"
    >
      <div className="container mx-auto px-4">
        <div className="my-8 grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="relative mx-auto min-h-[360px] w-full max-w-xs lg:mx-0 lg:max-w-sm">
              {bgUrl && (
                <div className="relative aspect-[3/4] w-[72%] overflow-hidden rounded-none bg-[#2F110F]/20 shadow-md">
                  <Image
                    src={bgUrl}
                    alt={imageAlt}
                    fill
                    sizes="(max-width: 1024px) 72vw, 28vw"
                    className="object-cover"
                  />
                </div>
              )}
              {fgUrl && (
                <div className="absolute -right-2 -bottom-6 aspect-[3/4] w-[62%] overflow-hidden rounded-none border border-[#D9D9D9]/15 shadow-2xl">
                  <Image
                    src={fgUrl}
                    alt={data.foregroundImage?.alt?.trim() || imageAlt}
                    fill
                    sizes="(max-width: 1024px) 62vw, 24vw"
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div className="mb-6 border-t border-[#D9D9D9]/20 pt-6">
              {announcement && (
                <p className="mb-3 text-xs uppercase tracking-widest text-[#D9D9D9]/70">
                  {announcement}
                </p>
              )}
              {heading && (
                <h2 className="mb-4 font-display text-2xl font-normal text-heading lg:text-3xl">
                  {heading}
                </h2>
              )}
              {body && (
                <p className="mb-6 whitespace-pre-line text-sm leading-relaxed text-body">
                  {body}
                </p>
              )}
              {ctaText && <CtaButton text={ctaText} href={data.ctaLink} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
