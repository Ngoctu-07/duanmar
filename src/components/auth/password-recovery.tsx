"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import {
  NewPasswordStep,
  OtpStep,
  RequestOtpStep,
} from "@/components/auth/password-recovery-steps";

type Step = "request" | "otp" | "reset";

interface PasswordRecoveryProps {
  initialEmail: string;
  onAuthenticated: () => void;
  onBack: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Typed delivery failures → actionable, localized copy (no provider detail). */
const EMAIL_FAILURE_KEYS = {
  sender_domain_unverified: "emailSenderUnverified",
  invalid_api_key: "emailAuthFailed",
  missing_api_key: "emailNotConfigured",
  missing_sender: "emailNotConfigured",
  invalid_sender: "emailSenderInvalid",
  recipient_not_allowed: "emailRecipientNotAllowed",
  rate_limited: "emailRateLimited",
  network_error: "emailNetworkError",
  provider_error: "genericError",
} as const;

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/**
 * Three-step password recovery inside the auth modal.
 *
 * A: registered email → 6-digit OTP (60s TTL, emailed).
 * B: code + live 60-second countdown → single-use reset token.
 * C: new password → stored, then an immediate credentials sign-in so the
 *    visitor lands back in their account without re-typing anything.
 *
 * Expiry is server-authoritative; the countdown only mirrors `expiresIn` from
 * the issue/verify responses, so a background tab cannot extend the window.
 */
export function PasswordRecovery({
  initialEmail,
  onAuthenticated,
  onBack,
}: PasswordRecoveryProps) {
  const t = useTranslations("auth");
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState(initialEmail.trim());
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Only the clock state is updated from the interval; `remaining` is derived
  // during render so no effect ever writes React state synchronously.
  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [deadline]);

  const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;

  const requestCode = useCallback(
    async (targetEmail: string) => {
      if (!EMAIL_PATTERN.test(targetEmail.trim())) {
        setError(t("invalidEmail"));
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/auth/password-reset/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail.trim() }),
        });
        const data = await readJson(response);

        if (response.status === 429) {
          const seconds = Number(data.retryAfterSeconds);
          setError(
            Number.isFinite(seconds) && seconds > 0
              ? t("rateLimited", { seconds })
              : t("rateLimitedShort")
          );
          return;
        }
        if (!response.ok) {
          const reason = typeof data.reason === "string" ? data.reason : "";
          const key =
            EMAIL_FAILURE_KEYS[reason as keyof typeof EMAIL_FAILURE_KEYS] ??
            "genericError";
          setError(t(key));
          return;
        }

        const expiresIn = Number(data.expiresInSeconds);
        const issuedAt = Date.now();
        setNow(issuedAt);
        setDeadline(issuedAt + (Number.isFinite(expiresIn) ? expiresIn : 60) * 1000);
        setCode("");
        setStep("otp");
      } catch {
        setError(t("genericError"));
      } finally {
        setBusy(false);
      }
    },
    [t]
  );

  const handleRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void requestCode(email);
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await readJson(response);
      const reason = typeof data.error === "string" ? data.error : "";

      // Server-authoritative outcomes. The reset view is reachable ONLY through
      // the success branch below: a wrong or expired code never navigates.
      if (response.status === 410 || reason === "otp_expired") {
        const at = Date.now();
        setNow(at);
        setDeadline(at - 1);
        setError(t("otpExpired"));
        return;
      }
      if (response.status === 429 || reason === "too_many_attempts") {
        const at = Date.now();
        setNow(at);
        setDeadline(at - 1);
        setError(t("otpTooMany"));
        return;
      }
      if (!response.ok || typeof data.token !== "string") {
        setError(
          response.status === 400 || reason === "invalid_otp" ? t("otpInvalid") : t("genericError")
        );
        return;
      }

      setToken(data.token);
      setStep("reset");
    } catch {
      setError(t("genericError"));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("invalidPassword"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await readJson(response);

      if (!response.ok) {
        if (response.status === 410 || response.status === 400) {
          setStep("request");
          setDeadline(null);
          setCode("");
          setToken("");
          setError(t("resetExpired"));
          return;
        }
        setError(t("genericError"));
        return;
      }

      const targetEmail = typeof data.email === "string" ? data.email : email.trim();
      const session = await signIn("credentials", {
        email: targetEmail,
        password,
        redirect: false,
      });
      if (!session || session.error) {
        setError(t("genericError"));
        return;
      }

      setPassword("");
      setConfirmPassword("");
      onAuthenticated();
    } catch {
      setError(t("genericError"));
    } finally {
      setBusy(false);
    }
  };

  const title =
    step === "request" ? t("recoveryTitle") : step === "otp" ? t("otpTitle") : t("resetTitle");
  const body =
    step === "request"
      ? t("recoveryBody")
      : step === "otp"
        ? t("otpBody", { email: email.trim() })
        : t("resetBody");

  return (
    <div className="mt-6">
      <div aria-hidden className="mb-4 h-px w-full bg-white/10" />
      <h3 className="font-sans text-lg font-bold uppercase leading-tight tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>

      {step === "request" && (
        <RequestOtpStep
          email={email}
          onEmailChange={setEmail}
          busy={busy}
          onSubmit={handleRequest}
        />
      )}

      {step === "otp" && (
        <OtpStep
          code={code}
          onCodeChange={setCode}
          remaining={remaining}
          onResend={() => void requestCode(email)}
          busy={busy}
          onSubmit={handleVerify}
        />
      )}

      {step === "reset" && (
        <NewPasswordStep
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirmPassword}
          busy={busy}
          onSubmit={handleReset}
        />
      )}

      {error && (
        <p role="alert" className="mt-4 text-xs font-medium text-primary">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-4 w-full rounded-none text-center text-xs text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline"
      >
        {t("backToSignIn")}
      </button>
    </div>
  );
}
