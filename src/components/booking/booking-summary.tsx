import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveBooking } from "@/lib/booking-history";
import type { PaymentMethod } from "@/lib/payment";
import type { PriceCurrency, PriceTier } from "@/lib/pricing";
import { BookingPaymentSection } from "./booking-payment-section";
import { buildTicketRows } from "./ticket-rows";
import type { BookingValues } from "./booking-validation";

interface BookingSummaryProps {
  slug: string;
  tourName: string;
  values: BookingValues;
  guestCount: number;
  tier: PriceTier | null;
  total: number | null;
  locale: string;
  currency: PriceCurrency;
  /** Whether the tour requires a Challenge Level pick (persisted only then). */
  isSpecialTour?: boolean;
}

/**
 * Client-side confirmation only — nothing is charged, so the copy says "we will
 * contact you". The ticket is persisted to My Trips only after the mock payment
 * reports success (see BookingPaymentSection → onPaid).
 */
export function BookingSummary({
  slug,
  tourName,
  values,
  guestCount,
  tier,
  total,
  locale,
  currency,
  isSpecialTour,
}: BookingSummaryProps) {
  const t = useTranslations("booking");
  const [reference] = useState(() =>
    `VN-${Date.now().toString(36).toUpperCase()}`
  );

  const rows = buildTicketRows({
    t,
    reference,
    tourName,
    values,
    guestCount,
    total,
    locale,
    currency,
  });

  const handlePaid = (paymentMethod: PaymentMethod) => {
    const paidAt = new Date().toISOString();
    saveBooking({
      reference,
      slug,
      tourName,
      travelDate: values.travelDate,
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      notes: values.notes.trim(),
      guests: guestCount,
      // Standard tours carry no difficulty key at all in the stored record.
      ...(isSpecialTour === true && { difficulty: values.difficulty }),
      pricePerGuest: tier?.pricePerGuest ?? null,
      total,
      currency,
      locale,
      paidAt,
      paymentMethod,
    });

    // Fire-and-forget: the delayed confirmation email is enqueued server-side
    // (2 min). Email failure must never block the payment UX (plan 260929-2229).
    if (total !== null) {
      void fetch("/api/booking-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          slug,
          tourName,
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          travelDate: values.travelDate,
          guests: guestCount,
          total,
          currency,
          paymentMethod,
          notes: values.notes.trim(),
          locale,
        }),
      }).catch(() => undefined);
    }
  };

  return (
    <section
      aria-labelledby="booking-summary-heading"
      className="rounded-xl border bg-card p-5"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2
          id="booking-summary-heading"
          className="text-sm font-semibold uppercase tracking-widest text-primary"
        >
          {t("summaryTitle")}
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t("summaryNote")}</p>

      <dl className="mt-4 divide-y divide-border text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 py-2.5"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={`text-right tabular-nums ${
                row.strong ? "font-semibold text-primary" : "font-medium"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <BookingPaymentSection
        total={tier && total !== null ? total : null}
        locale={locale}
        currency={currency}
        reference={reference}
        onPaid={handlePaid}
      />

      <Link
        href={`/explore/destinations/${slug}`}
        className="mt-4 inline-block text-sm text-primary hover:underline"
      >
        {t("backToTour")}
      </Link>
    </section>
  );
}
