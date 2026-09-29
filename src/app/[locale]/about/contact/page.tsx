import { permanentRedirect } from "@/i18n/navigation";

/**
 * `/about/contact` permanently moved to `/contact` — keep this stub so old
 * search results, external backlinks and the /about/contact search hit never
 * 404 (308 preserves the request method and is cacheable forever).
 */
export default async function LegacyContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect({ href: "/contact", locale });
}
