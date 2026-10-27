import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/session";
import { loadVoucherWallet } from "@/lib/vouchers/load-voucher-wallet";
import { getAvatarPresets } from "@/lib/avatars";
import { listBookingsForUser } from "@/lib/bookings/booking-store";
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
 * users/avatars and bookings from SQLite, voucher copy + slot capacity from
 * the CMS. That is what makes a session two months later render the same
 * profile on any device. The review-history tab was removed; owners manage
 * their reviews from the tour detail page instead.
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

  const [locale, avatarPresets, serverBookings] = await Promise.all([
    getLocale(),
    getAvatarPresets(),
    listBookingsForUser(user.id),
  ]);
  // Dashboard retrieval is the cleanup point: claims whose master promotion was
  // deleted/unpublished are hidden AND permanently removed from the wallet.
  // Inactive-but-existing promotions are hidden only, so re-activation restores
  // them; a failed CMS read fails open and never purges.
  const vouchers = await loadVoucherWallet(user.id, locale, { purgeOrphans: true });

  return (
    <>
      {backLink}
      <AccountDashboard
        user={user}
        vouchers={vouchers}
        avatarPresets={avatarPresets}
        serverBookings={serverBookings}
      />
    </>
  );
}
