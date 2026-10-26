"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { CurrentUser } from "@/lib/auth/session";
import type { Voucher } from "@/lib/vouchers/voucher-store";
import type { AvatarPreset } from "@/lib/avatars";
import type { TripBooking } from "@/lib/booking-history";
import type { TourReview } from "@/lib/reviews";
import { useAuthGate } from "@/components/auth/auth-provider";
import { AccountAvatar } from "@/components/account/account-avatar";
import { AccountReviews } from "@/components/account/account-reviews";
import { VoucherWallet } from "@/components/account/voucher-wallet";
import { AccountProfile } from "@/components/account/account-profile";
import { cn } from "cn";

type Tab = "profile" | "vouchers" | "reviews";

interface AccountDashboardProps {
  user: CurrentUser;
  vouchers: Voucher[];
  avatarPresets: AvatarPreset[];
  serverBookings: TripBooking[];
  reviews: TourReview[];
}

/**
 * `/account` shell: Gypsy Curse page title, identity summary, then three sharp
 * tabs — PROFILE (default, gamified missions), VOUCHER WALLET and REVIEWS.
 * Claiming a deal links here with `?tab=vouchers` so the new voucher is front
 * and centre.
 */
export function AccountDashboard({
  user,
  vouchers,
  avatarPresets,
  serverBookings,
  reviews,
}: AccountDashboardProps) {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const { signOutUser } = useAuthGate();
  const [tab, setTab] = useState<Tab>("profile");
  const [reviewRows, setReviewRows] = useState(reviews);

  useEffect(() => {
    // Re-sync when the revalidated RSC payload arrives; local deletions stay
    // applied across tab switches until then.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical server list
    setReviewRows(reviews);
  }, [reviews]);

  useEffect(() => {
    // Deep links: /account?tab=vouchers | /account?tab=reviews
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested === "vouchers" || requested === "reviews") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot deep-link sync after hydration
      setTab(requested);
    }
  }, []);

  const signOut = async () => {
    await signOutUser();
    router.refresh();
  };

  const tabs: Array<{ value: Tab; label: string }> = [
    { value: "profile", label: t("profileTab") },
    { value: "vouchers", label: t("walletTab") },
    { value: "reviews", label: t("reviewsTab") },
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="display-title">{t("title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="h-9 rounded-none border border-white/20 px-4 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:border-primary hover:text-white"
        >
          {t("signOut")}
        </button>
      </div>

      {/* Identity summary — avatar + name render directly on the page ground
          (no card/box), matching the open editorial layout of the account tabs. */}
      <div data-testid="account-identity" className="mt-8 flex items-center gap-6">
        <AccountAvatar user={user} presets={avatarPresets} />
        <div className="min-w-0">
          <p className="truncate font-sans text-[2rem] font-semibold leading-tight tracking-normal text-white md:text-[2.375rem]">
            {user.name || "—"}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {user.email || "—"}
          </p>
        </div>
      </div>

      <div role="tablist" aria-label={t("title")} className="mt-8 grid grid-cols-3 sm:max-w-lg">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={cn(
              "h-11 rounded-none border font-sans text-xs font-semibold uppercase tracking-[0.18em] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white/40",
              tab === item.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-white/15 bg-transparent text-white/60 hover:text-white"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "vouchers" ? (
          <VoucherWallet vouchers={vouchers} />
        ) : tab === "reviews" ? (
          <AccountReviews
            reviews={reviewRows}
            locale={locale}
            onDeleted={(reference) =>
              setReviewRows((current) =>
                current.filter((review) => review.reference !== reference)
              )
            }
          />
        ) : (
          <AccountProfile serverBookings={serverBookings} />
        )}
      </div>
    </div>
  );
}
