"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Pencil, UserRound } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuthGate } from "@/components/auth/auth-provider";
import { notifyReviewsChanged } from "@/lib/reviews";
import type { CurrentUser } from "@/lib/auth/session";
import type { AvatarPreset } from "@/lib/avatars";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "cn";

interface AccountAvatarProps {
  user: CurrentUser;
  presets: AvatarPreset[];
}

/**
 * Profile avatar + CMS preset picker.
 *
 * There is deliberately no file input: visitors may only choose one of the
 * active `avatarPreset` documents. Only the preset id travels to the API; the
 * server resolves the asset URL before writing it to the user row.
 */
export function AccountAvatar({ user, presets }: AccountAvatarProps) {
  const t = useTranslations("account");
  const router = useRouter();
  const { refreshUser } = useAuthGate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const select = async (preset: AvatarPreset) => {
    if (saving) return;
    setSaving(preset._id);
    setFailed(false);
    try {
      const response = await fetch("/api/account/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: preset._id }),
      });
      if (!response.ok) {
        setFailed(true);
        setSaving(null);
        return;
      }
      setOpen(false);
      setSaving(null);
      // Historical review cards join the live user row, so notify mounted
      // lists to refetch and refresh the session's avatar preview immediately.
      notifyReviewsChanged();
      await refreshUser().catch(() => undefined);
      router.refresh();
    } catch {
      setFailed(true);
      setSaving(null);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <span
        data-testid="account-avatar"
        className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-none border border-primary/40 bg-[radial-gradient(circle_at_30%_20%,#3b1216_0%,#12080a_75%)] text-primary"
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name || t("avatarAlt")}
            width={96}
            height={96}
            className="h-full w-full rounded-none object-cover"
          />
        ) : (
          <UserRound className="h-10 w-10" aria-hidden />
        )}
      </span>

      <button
        type="button"
        aria-label={t("changeAvatar")}
        title={t("changeAvatar")}
        onClick={() => setOpen(true)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-none border border-white/15 text-white/50 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,32rem)] rounded-none border-white/15 bg-[#0b0b0b] p-0 text-white">
          <div aria-hidden className="h-1 w-full bg-primary" />
          <div className="p-6 sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary">
              DuanMar
            </p>
            <DialogTitle className="mt-2 font-sans text-2xl font-bold uppercase leading-tight tracking-tight text-white">
              {t("avatarTitle")}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-white/60">
              {t("avatarHint")}
            </DialogDescription>

            {presets.length === 0 ? (
              <p className="mt-6 rounded-none border border-dashed border-white/15 p-6 text-center text-sm text-white/50">
                {t("avatarEmpty")}
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {presets.map((preset) => {
                  const selected = user.avatarPresetId === preset._id;
                  return (
                    <button
                      key={preset._id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={preset.name}
                      disabled={saving !== null}
                      onClick={() => void select(preset)}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-none border bg-card transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 disabled:opacity-60",
                        selected
                          ? "border-primary"
                          : "border-white/15 hover:border-white/40"
                      )}
                    >
                      {preset.image?.asset?.url ? (
                        <Image
                          src={preset.image.asset.url}
                          alt={preset.name}
                          fill
                          sizes="(max-width: 640px) 30vw, 112px"
                          className="rounded-none object-cover"
                        />
                      ) : (
                        <UserRound className="mx-auto h-6 w-6 text-white/40" aria-hidden />
                      )}
                      {saving === preset._id && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] uppercase tracking-[0.15em] text-white">
                          {t("avatarSaving")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {failed && (
              <p role="alert" className="mt-4 text-xs font-medium text-primary">
                {t("avatarError")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
