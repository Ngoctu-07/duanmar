"use client"

import * as React from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

type PromoModalProps = {
  imageSrc?: string | null
  width?: number
  height?: number
  enableEntryPopup?: boolean
}

function PromoModal({ imageSrc, width = 1200, height = 800, enableEntryPopup }: PromoModalProps) {
  const t = useTranslations("promo")
  const locale = useLocale()
  const [open, setOpen] = React.useState(false)

  // Opens post-hydration on mount AND re-triggers whenever the EN/VI toggle
  // changes the locale (plan 260929-1617): same instance → effect re-runs;
  // segment remount → fresh instance runs it anyway. imageSrc/width/height
  // arrive with the re-executed [locale] layout in the same soft navigation.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog must open post-hydration to avoid SSR mismatch
    setOpen(true)
  }, [locale])

  // Graceful degradation (AC3): disabled or no CMS asset → render nothing.
  if (enableEntryPopup === false || !imageSrc) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-slot="promo-modal"
        closeSlot="promo-modal-close"
        closeLabel={t("close")}
        className="w-[min(90vw,50.4rem)] border-0 bg-transparent p-0 shadow-none"
        closeClassName="border-0 bg-black/60 text-white hover:bg-black/80 hover:text-white focus-visible:ring-white/60"
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <Image
          src={imageSrc}
          alt={t("imageAlt")}
          width={width}
          height={height}
          priority
          className="h-auto w-full rounded-xl"
        />
      </DialogContent>
    </Dialog>
  )
}

export { PromoModal }
