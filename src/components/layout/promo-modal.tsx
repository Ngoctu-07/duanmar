"use client"

import * as React from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"

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

// Set once the dialog has been shown for the CURRENT document. A full document load
// re-evaluates this module (reset → Option A: initial load / hard refresh can show);
// soft navigations and locale-segment remounts share the module — a fresh instance
// therefore cannot re-open the dialog mid-document, even when navType is still "reload"
// (the flag alone only gates subsequent DOCUMENT loads).
let popupShownThisDocument = false

function PromoModal({ imageSrc, width = 1200, height = 800, enableEntryPopup }: PromoModalProps) {
  const t = useTranslations("promo")
  const [open, setOpen] = React.useState(false)
  const showable = enableEntryPopup !== false && !!imageSrc

  // Opens exactly once per document-load decision (plan 260930-1740): only on a TRUE
  // initial session load (PerformanceNavigationTiming type "navigate" with no prior
  // hasSeenPopup flag) or a hard browser refresh ("reload"). Empty deps = never re-runs
  // on client-side route/locale transitions; the module marker blocks mid-document
  // remounts (locale segment change recreates the subtree); sessionStorage.hasSeenPopup
  // blocks later DOCUMENT loads in the same tab. Replaces the [locale] re-trigger of
  // plan 260929-1617.
  React.useEffect(() => {
    if (!showable || popupShownThisDocument) return
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
    const navType = navEntry?.type
    if (navType && navType !== "navigate" && navType !== "reload") return
    let seen = null
    try { seen = sessionStorage.getItem("hasSeenPopup") } catch { /* private-mode read → fail-open */ }
    if (navType !== "reload" && seen === "true") return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog must open post-hydration to avoid SSR mismatch
    setOpen(true)
    popupShownThisDocument = true
    try { sessionStorage.setItem("hasSeenPopup", "true") } catch { /* private-mode write → fail-open */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props are final at mount (server-fetched site config)
  }, [])

  // Graceful degradation (AC3): disabled or no CMS asset → render nothing.
  if (!showable) return null

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
