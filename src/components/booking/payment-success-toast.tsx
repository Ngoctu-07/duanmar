"use client"

import { useTranslations } from "next-intl";

function PaymentSuccessToast({ show }: { show: boolean }) {
  const t = useTranslations("booking");

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex">
      <div
        role="status"
        className="animate-in rounded-xl border-l-4 border-primary bg-foreground px-4 py-3 text-sm font-medium text-background shadow-soft fade-in-0 slide-in-from-bottom-2 duration-300"
      >
        {t("toastSuccess")}
      </div>
    </div>
  );
}

export { PaymentSuccessToast };
