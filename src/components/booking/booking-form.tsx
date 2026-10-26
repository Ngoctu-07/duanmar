"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { listBookings, BOOKINGS_STORAGE_KEY } from "@/lib/booking-history";
import { mergeDeviceBookings, type TourCapacity } from "@/lib/tour-capacity";
import { getCurrency, resolveTierForGuests, type PriceTier } from "@/lib/pricing";
import type { Voucher } from "@/lib/vouchers/voucher-store";
import {
  isVoucherApplicable,
  resolveVoucherDiscount,
  type VoucherDiscount,
} from "@/lib/vouchers/voucher-discount";
import { normalizeBookingDifficulty } from "@/lib/booking-difficulty";
import { BookingContactSection } from "./booking-contact-section";
import { BookingDateSection } from "./booking-date-section";
import { BookingDifficultySection } from "./booking-difficulty-section";
import { BookingPricingSection } from "./booking-pricing-section";
import { BookingSummary } from "./booking-summary";
import { BookingVoucherSection } from "./booking-voucher-section";
import {
  isValidGuests,
  travelDateErrorAfterGuestsChange,
  validateBooking,
  type BookingErrors,
  type BookingField,
  type BookingValues,
} from "./booking-validation";

const EMPTY_VALUES: BookingValues = {
  fullName: "",
  email: "",
  phone: "",
  notes: "",
  travelDate: "",
  guests: "1",
  difficulty: "",
};

interface BookingFormProps {
  slug: string;
  tourName: string;
  tiers: PriceTier[];
  locale: string;
  /** CMS capacity (`null` = none configured); device bookings merge in after mount. */
  capacity?: TourCapacity | null;
  /** Signed-in user's claimed vouchers (wallet snapshot). */
  vouchers?: Voucher[];
  /** Whether a session exists — drives the voucher empty state. */
  signedIn?: boolean;
}

export function BookingForm({
  slug,
  tourName,
  tiers,
  locale,
  capacity,
  vouchers = [],
  signedIn = false,
}: BookingFormProps) {
  const t = useTranslations("booking");
  const currency = getCurrency(locale);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  // Exactly one voucher can be applied; picking another replaces this value.
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  // Starts as the server value so hydration matches, then adds this device's bookings.
  const [activeCapacity, setActiveCapacity] = useState<TourCapacity | null>(
    () => capacity ?? null
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage read must run after mount
    setActiveCapacity(
      mergeDeviceBookings(capacity ?? null, slug, listBookings())
    );
  }, [capacity, slug]);

  // Another tab booked meanwhile → re-merge so the spots-left count stays true
  // (storage events only fire cross-tab, never for our own writes).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== BOOKINGS_STORAGE_KEY) return;
      setActiveCapacity(
        mergeDeviceBookings(capacity ?? null, slug, listBookings())
      );
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [capacity, slug]);

  const guestCount = Number(values.guests);
  // Price only a submittable guest count (validation allows 1..99), rounded
  // once so no float noise reaches the stored ticket or the QR amount.
  const tier = isValidGuests(guestCount)
    ? resolveTierForGuests(tiers, guestCount)
    : null;
  const total = tier ? Math.round(guestCount * tier.pricePerGuest * 100) / 100 : null;

  // Voucher math is derived, never stored: changing guests, switching or
  // clearing the voucher recomputes the payable amount in one render.
  const applicableVoucher =
    selectedVoucher && isVoucherApplicable(selectedVoucher, slug)
      ? selectedVoucher
      : null;
  const discount: VoucherDiscount | null =
    applicableVoucher && total !== null
      ? resolveVoucherDiscount(applicableVoucher, total)
      : null;
  const payable = discount ? discount.total : total;

  const change = (field: BookingField, value: string) => {
    // Bumping guests can push the already-picked date past its capacity;
    // decide that up front so the setErrors updater stays pure.
    const dateError =
      field === "guests"
        ? travelDateErrorAfterGuestsChange(
            errors.travelDate,
            values.travelDate,
            Number(value),
            activeCapacity
          )
        : undefined;

    setValues((previous) => {
      if (field === "difficulty") {
        return {
          ...previous,
          difficulty: normalizeBookingDifficulty(value) ?? "",
        };
      }
      return { ...previous, [field]: value };
    });
    setErrors((previous) => {
      const next: BookingErrors = { ...previous, [field]: undefined };
      if (field === "guests") next.travelDate = dateError;
      return next;
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateBooking(values, activeCapacity);
    setErrors(found);
    if (Object.keys(found).length === 0) setConfirmed(true);
  };

  if (confirmed) {
    return (
      <BookingSummary
        slug={slug}
        tourName={tourName}
        values={values}
        guestCount={guestCount}
        tier={tier}
        subtotal={total}
        discount={discount}
        voucherCode={applicableVoucher?.code ?? null}
        total={payable}
        locale={locale}
        currency={currency}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <BookingContactSection values={values} errors={errors} onChange={change} />
      <BookingDateSection
        values={values}
        errors={errors}
        onChange={change}
        locale={locale}
        capacity={activeCapacity}
        guestCount={guestCount}
      />
      <BookingPricingSection
        values={values}
        errors={errors}
        onChange={change}
        guestCount={guestCount}
        tier={tier}
        subtotal={total}
        discount={discount}
        voucherCode={applicableVoucher?.code ?? null}
        payable={payable}
        locale={locale}
        currency={currency}
      />

      <BookingDifficultySection
        values={values}
        errors={errors}
        onChange={change}
      />

      <BookingVoucherSection
        vouchers={vouchers}
        slug={slug}
        signedIn={signedIn}
        selected={applicableVoucher}
        onSelect={setSelectedVoucher}
        subtotal={total}
        locale={locale}
        currency={currency}
      />

      <Button type="submit" className="h-9 w-full">
        {t("submit")}
      </Button>
    </form>
  );
}
