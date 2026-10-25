import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/session";
import { listVouchers } from "@/lib/vouchers/voucher-store";
import { localizeVouchers } from "@/lib/vouchers/localize";
import { getAvatarPresets } from "@/lib/avatars";
import { listBookingsForUser } from "@/lib/bookings/booking-store";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { PROMOTIONS_BY_IDS_QUERY } from "@/sanity/queries/promotions";
import type { PromotionRecord } from "@/lib/promotions";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { AccountSignIn } from "@/components/account/account-sign-in";
import { BackToBookingLink } from "@/components/booking/back-to-booking-link";
import { safeBookingReturn } from "@/lib/booking-return";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

/**
 * `/account` — session-gated dashboard.
 *
 * Every piece of profile state comes from the server on each request:
 * users/avatars and bookings from SQLite, voucher copy re-localized from the
 * CMS. That is what makes a session two months later render the same profile
 * on any device.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeBookingReturn((await searchParams).returnTo);
  const backLink = returnTo ? (
    <div className="container mx-auto max-w-4xl px-4 pt-8">
      <BackToBookingLink href={returnTo} />
    </div>
  ) : null;

  const user = await currentUser();
  if (!user) {
    return (
      <>
        {backLink}
        <AccountSignIn />
      </>
    );
  }

  const vouchers = await listVouchers(user.id);
  const promotionIds = [...new Set(vouchers.map((voucher) => voucher.promotionId))];
  const [locale, avatarPresets, promotions] = await Promise.all([
    getLocale(),
    getAvatarPresets(),
    promotionIds.length > 0
      ? fetchPublished(
          PROMOTIONS_BY_IDS_QUERY,
          { ids: promotionIds },
          { tags: ["sanity:promotion:list"] }
        )
      : Promise.resolve([]),
  ]);

  return (
    <>
      {backLink}
      <AccountDashboard
        user={user}
        vouchers={localizeVouchers(
          vouchers,
          (promotions ?? []) as PromotionRecord[],
          locale
        )}
        avatarPresets={avatarPresets}
        serverBookings={await listBookingsForUser(user.id)}
      />
    </>
  );
}
