"use client";

import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

/** Shared input styling — matches the sign-in/register form exactly. */
export const RECOVERY_FIELD_CLASS =
  "rounded-none border-white/20 bg-transparent text-white focus-visible:border-primary focus-visible:ring-primary/30";

const FIELD_LABEL = "text-[11px] uppercase tracking-[0.18em] text-white/70";

const SUBMIT_CLASS =
  "h-11 w-full rounded-none bg-primary font-sans text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60";

const SECONDARY_CLASS =
  "mt-2 h-9 w-full rounded-none border border-white/20 bg-transparent font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

interface StepProps {
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/** Step A — registered email → request the 6-digit code. */
export function RequestOtpStep({
  email,
  onEmailChange,
  busy,
  onSubmit,
}: StepProps & { email: string; onEmailChange: (value: string) => void }) {
  const t = useTranslations("auth");
  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recovery-email" className={FIELD_LABEL}>
          {t("email")}
        </Label>
        <Input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          className={RECOVERY_FIELD_CLASS}
        />
      </div>
      <button type="submit" disabled={busy} className={SUBMIT_CLASS}>
        {busy ? t("recoverySending") : t("recoverySend")}
      </button>
    </form>
  );
}

/** Step B — 6-digit code + 60-second countdown + resend. */
export function OtpStep({
  code,
  onCodeChange,
  remaining,
  onResend,
  busy,
  onSubmit,
}: StepProps & {
  code: string;
  onCodeChange: (value: string) => void;
  remaining: number;
  onResend: () => void;
}) {
  const t = useTranslations("auth");
  const expired = remaining <= 0;
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recovery-code" className={FIELD_LABEL}>
          {t("otpLabel")}
        </Label>
        <Input
          id="recovery-code"
          name="one-time-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) =>
            onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className={`${RECOVERY_FIELD_CLASS} text-center font-mono text-xl tracking-[0.5em]`}
        />
      </div>

      <p
        aria-live="polite"
        data-testid="otp-countdown"
        className={expired ? "text-xs font-medium text-primary" : "text-xs text-white/55"}
      >
        {expired ? t("otpExpired") : t("otpExpiresIn", { time: clock })}
      </p>

      <button type="submit" disabled={busy || expired || code.length !== 6} className={SUBMIT_CLASS}>
        {busy ? t("working") : t("otpVerify")}
      </button>
      <button
        type="button"
        onClick={onResend}
        disabled={busy || !expired}
        className={SECONDARY_CLASS}
      >
        {t("otpResend")}
      </button>
    </form>
  );
}

/** Step C — new password (auto sign-in happens in the parent). */
export function NewPasswordStep({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  busy,
  onSubmit,
}: StepProps & {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
}) {
  const t = useTranslations("auth");
  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recovery-password" className={FIELD_LABEL}>
          {t("newPassword")}
        </Label>
        <PasswordInput
          id="recovery-password"
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          className={RECOVERY_FIELD_CLASS}
          toggleTestId="recovery-password-visibility-toggle"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="recovery-confirm" className={FIELD_LABEL}>
          {t("confirmPassword")}
        </Label>
        <PasswordInput
          id="recovery-confirm"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => onConfirmChange(event.target.value)}
          className={RECOVERY_FIELD_CLASS}
          toggleTestId="recovery-confirm-visibility-toggle"
        />
      </div>
      <button type="submit" disabled={busy} className={SUBMIT_CLASS}>
        {busy ? t("resetSaving") : t("resetSave")}
      </button>
    </form>
  );
}
