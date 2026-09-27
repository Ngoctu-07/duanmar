import { Ticket } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/** CTA that opens the checkout page for this tour. */
export async function BookTicketButton({ slug }: { slug: string }) {
  const t = await getTranslations("booking");

  return (
    <Button
      size="sm"
      nativeButton={false}
      render={
        <Link href={`/booking/checkout?tour=${encodeURIComponent(slug)}`} />
      }
      className="print:hidden"
    >
      <Ticket aria-hidden="true" />
      {t("bookNow")}
    </Button>
  );
}
