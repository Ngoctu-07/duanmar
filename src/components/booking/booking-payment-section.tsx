import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PaymentSuccessToast } from "@/components/booking/payment-success-toast";
import { formatPrice, type PriceCurrency } from "@/lib/pricing";
import {
  PAYMENT_METHODS,
  buildPaymentPayload,
  type PaymentMethod,
} from "@/lib/payment";

interface BookingPaymentSectionProps {
  total: number | null;
  locale: string;
  currency: PriceCurrency;
  reference: string;
  /** Fired once per successful payment with the method used — parent persists the ticket and dispatches the confirmation email. */
  onPaid?: (method: PaymentMethod) => void;
}

type PaymentStatus = "pending" | "success";

/** Mock webhook latency: pending resolves to success after this delay. */
const VERIFY_DELAY_MS = 3000;
const TOAST_DISMISS_MS = 5000;

export function BookingPaymentSection({
  total,
  locale,
  currency,
  reference,
  onPaid,
}: BookingPaymentSectionProps) {
  const t = useTranslations("booking");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [verifyToken, setVerifyToken] = useState(0);
  const [qr, setQr] = useState<{ payload: string; url: string } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<number | undefined>(undefined);

  // Keep the latest callback without restarting the mock-webhook timer
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  const payload =
    method && total !== null ? buildPaymentPayload(method, total, reference) : null;

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;

    QRCode.toDataURL(payload, { width: 240, margin: 1 })
      .then((url) => {
        if (!cancelled) setQr({ payload, url });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [payload]);

  useEffect(() => {
    if (!payload || !method) return;
    const paidMethod = method;
    const timer = setTimeout(() => {
      setStatus("success");
      onPaidRef.current?.(paidMethod);
      setShowToast(true);
      toastTimerRef.current = window.setTimeout(
        () => setShowToast(false),
        TOAST_DISMISS_MS
      );
    }, VERIFY_DELAY_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(toastTimerRef.current);
    };
  }, [payload, method, verifyToken]);

  // No authored price → nothing to charge and nothing to persist; say so
  // instead of showing a confirmation that quietly saves no ticket (P4: no
  // data → don't invent a price).
  if (total === null) {
    return (
      <p className="mt-5 rounded-xl border bg-muted/40 p-5 text-sm text-muted-foreground">
        {t("priceMissingNote")}
      </p>
    );
  }

  /** Only reuse a cached image when it matches the payload currently on screen. */
  const qrUrl = qr && qr.payload === payload ? qr.url : null;

  const selectMethod = (next: PaymentMethod) => {
    setMethod(next);
    setStatus("pending");
    setShowToast(false);
    clearTimeout(toastTimerRef.current);
    setVerifyToken((token) => token + 1);
  };

  return (
    <section
      aria-labelledby="booking-payment-heading"
      className="mt-5 rounded-xl border bg-card p-5"
    >
      <h2
        id="booking-payment-heading"
        className="text-sm font-semibold uppercase tracking-widest text-primary"
      >
        {t("paymentTitle")}
      </h2>

      <div
        role="radiogroup"
        aria-labelledby="booking-payment-heading"
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        {PAYMENT_METHODS.map((value) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
              method === value
                ? "border-primary bg-primary/5"
                : "hover:bg-muted"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              value={value}
              checked={method === value}
              onChange={() => selectMethod(value)}
              className="accent-primary"
            />
            {value === "momo" ? t("methodMomo") : t("methodBank")}
          </label>
        ))}
      </div>

      {method && (
        <div className="mt-4 rounded-lg bg-muted/40 p-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="rounded-lg bg-background p-2">
              {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- QR comes from a client-generated data URL
                <img
                  src={qrUrl}
                  alt={t("qrAlt")}
                  width={192}
                  height={192}
                  className="h-48 w-48"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="h-48 w-48 animate-pulse rounded bg-muted"
                />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-muted-foreground">{t("payable")}</p>
              <p className="text-xl font-semibold tabular-nums text-primary">
                {formatPrice(total, locale, currency)}
              </p>
              <p
                aria-live="polite"
                className={`mt-2 text-sm ${
                  status === "success"
                    ? "font-bold text-green-700"
                    : "text-muted-foreground"
                }`}
              >
                {status === "success" ? t("statusSuccess") : t("statusPending")}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{t("qrHint")}</p>
              <p className="text-xs text-muted-foreground">{t("demoQr")}</p>
              {status === "success" && (
                <Link
                  href="/my-trips"
                  className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                >
                  {t("viewMyTrips")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <PaymentSuccessToast show={showToast} />
    </section>
  );
}
