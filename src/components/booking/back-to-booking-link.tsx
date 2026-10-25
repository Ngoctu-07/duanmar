import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Shown on /deals and /account when the visitor came from checkout. */
export function BackToBookingLink({ href }: { href: string }) {
  const t = useTranslations("booking");
  return (
    <Link
      href={href}
      data-testid="back-to-booking"
      className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-link hover:underline"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {t("backToBooking")}
    </Link>
  );
}
