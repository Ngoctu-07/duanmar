"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRecovery } from "@/components/auth/password-recovery";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { cn } from "cn";

type Mode = "signIn" | "register";
type View = "credentials" | "recovery";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

/**
 * Email/password modal shared by every guarded CTA. Brand contract: permanent
 * dark surface, zero radius, white type, red primary action, Barlow Semi
 * Condensed via `font-sans`.
 */
export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const t = useTranslations("auth");
  const [view, setView] = useState<View>("credentials");
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Closing the dialog always returns to the credentials view next time.
  const handleOpenChange = (next: boolean) => {
    if (next) return;
    setView("credentials");
    setError(null);
    setBusy(false);
    onClose();
  };

  const reset = () => {
    setError(null);
    setBusy(false);
  };

  const switchMode = (next: Mode) => {
    reset();
    setMode(next);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setError(t("invalidEmail"));
      return;
    }
    if (mode === "signIn" && password.length === 0) {
      setError(t("passwordRequired"));
      return;
    }
    // The 8-character minimum is a REGISTRATION rule only: legacy accounts may
    // have shorter passwords and must still be able to sign in.
    if (mode === "register" && password.length < MIN_PASSWORD_LENGTH) {
      setError(t("invalidPassword"));
      return;
    }
    if (mode === "register" && name.trim().length < 2) {
      setError(t("invalidName"));
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, password }),
        });
        if (response.status === 409) {
          setError(t("emailTaken"));
          setBusy(false);
          return;
        }
        if (!response.ok) {
          setError(t("genericError"));
          setBusy(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError(mode === "register" ? t("genericError") : t("invalidCredentials"));
        setBusy(false);
        return;
      }

      setBusy(false);
      setPassword("");
      onAuthenticated();
    } catch {
      setError(t("genericError"));
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(92vw,26rem)] rounded-none border border-white/15 bg-[#0b0b0b] p-0 text-white shadow-none"
      >
        <div aria-hidden className="h-1 w-full bg-primary" />
        <div className="p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-primary">
            DuanMar
          </p>
          <DialogTitle className="mt-2 font-sans text-2xl font-bold uppercase leading-tight tracking-tight text-white">
            {t("gateTitle")}
          </DialogTitle>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{t("gateBody")}</p>

          {view === "recovery" ? (
            <PasswordRecovery
              initialEmail={email}
              onAuthenticated={() => {
                setView("credentials");
                setPassword("");
                onAuthenticated();
              }}
              onBack={() => {
                setView("credentials");
                setError(null);
              }}
            />
          ) : (
            <>
          <div
            role="tablist"
            aria-label={t("gateTitle")}
            className="mt-6 grid grid-cols-2 border border-white/15"
          >
            {(["signIn", "register"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={cn(
                  "h-10 rounded-none font-sans text-xs font-semibold uppercase tracking-[0.18em] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white/40",
                  mode === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-white/60 hover:text-white"
                )}
              >
                {value === "signIn" ? t("signInTab") : t("registerTab")}
              </button>
            ))}
          </div>

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="auth-name" className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                  {t("name")}
                </Label>
                <Input
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-none border-white/20 bg-transparent text-white focus-visible:border-primary focus-visible:ring-primary/30"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="auth-email" className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                {t("email")}
              </Label>
              <Input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-none border-white/20 bg-transparent text-white focus-visible:border-primary focus-visible:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password" className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                {t("password")}
              </Label>
              <PasswordInput
                id="auth-password"
                name="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-none border-white/20 bg-transparent text-white focus-visible:border-primary focus-visible:ring-primary/30"
              />
            </div>

            {mode === "signIn" && (
              <div className="-mt-1 text-right">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setView("recovery");
                  }}
                  className="text-[11px] text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {t("forgotPassword")}
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs font-medium text-primary">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-none bg-primary font-sans text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? t("working") : mode === "register" ? t("register") : t("signIn")}
            </button>
          </form>

          <button
            type="button"
            onClick={() => switchMode(mode === "signIn" ? "register" : "signIn")}
            className="mt-4 w-full rounded-none text-center text-xs text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            {mode === "signIn" ? t("switchToRegister") : t("switchToSignIn")}
          </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
