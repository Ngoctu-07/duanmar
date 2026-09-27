import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const footerLinks = {
  explore: [
    { labelKey: "destinations", href: "/explore/destinations" },
    { labelKey: "thingsToDo", href: "/explore/things-to-do" },
    { labelKey: "itineraries", href: "/explore/itineraries" },
    { labelKey: "festivals", href: "/explore/festivals" },
    { labelKey: "blog", href: "/blog" },
    { labelKey: "events", href: "/explore/events" },
  ],
  plan: [
    { labelKey: "visaInfo", href: "/plan-your-trip/visa" },
    { labelKey: "gettingAround", href: "/plan-your-trip/getting-around" },
    { labelKey: "accommodation", href: "/plan-your-trip/accommodation" },
    { labelKey: "healthSafety", href: "/plan-your-trip/health-safety" },
  ],
  about: [
    { labelKey: "aboutUs", href: "/about" },
    { labelKey: "contact", href: "/about/contact" },
    { labelKey: "careers", href: "/about/careers" },
    { labelKey: "pressKit", href: "/about/press" },
    { labelKey: "trade", href: "/trade" },
  ],
};

export function Footer() {
  const t = useTranslations("common");
  const tf = useTranslations("footer");

  return (
    <footer className="border-t bg-muted/50 print:hidden">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Vietnam Tourism</h3>
            <p className="text-sm text-muted-foreground">
              {tf("tagline")}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("explore")}</h3>
            <ul className="space-y-2">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {tf(link.labelKey as "destinations")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("planTrip")}</h3>
            <ul className="space-y-2">
              {footerLinks.plan.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {tf(link.labelKey as "destinations")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("about")}</h3>
            <ul className="space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {tf(link.labelKey as "destinations")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t pt-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>&copy; {new Date().getFullYear()} Vietnam Tourism. {tf("rights")}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/support"
              className="hover:text-foreground transition-colors"
            >
              {tf("support")}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              {tf("privacy")}
            </Link>
            <Link
              href="/accessibility"
              className="hover:text-foreground transition-colors"
            >
              {tf("accessibility")}
            </Link>
            <Link
              href="/sitemap"
              className="hover:text-foreground transition-colors"
            >
              {tf("sitemapHtml")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
