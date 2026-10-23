"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AssistantMessage } from "@/lib/assistant/assistant-types";
import { MAX_CONTENT_CHARS, MAX_MESSAGES } from "@/lib/assistant/assistant-validation";
import { useFabFooterInversion } from "@/components/assistant/use-fab-footer-inversion";
import { useHeroReveal } from "@/components/layout/use-hero-reveal";

type DisplayMessage = AssistantMessage & { seeded?: boolean };

/**
 * Floating tour-assistant widget (plan 260929-2335): trigger bottom-right →
 * chat panel; replies stream from POST /api/assistant (server-side grounded).
 * Mounted in [locale]/layout.tsx on every page; non-modal by design.
 */
export function AssistantWidget() {
  const t = useTranslations("assistant");
  const locale = useLocale();
  // The ghost FAB shares the homepage hero reveal gate: it stays hidden while
  // the transparent hero nav floats over the full-viewport media, and appears
  // with the solid navbar once the visitor scrolls past 50% of the hero height.
  const revealed = useHeroReveal();
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [messages, setMessages] = React.useState<DisplayMessage[]>(() => [
    { role: "assistant", content: t("greeting"), seeded: true },
  ]);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const fabRef = React.useRef<HTMLDivElement>(null);
  const solidRef = React.useRef<HTMLSpanElement>(null);
  const outlineRef = React.useRef<HTMLSpanElement>(null);
  // Footer-boundary inversion paints layer clips directly (rAF, no
  // per-frame state) — see use-fab-footer-inversion.
  useFabFooterInversion(fabRef, solidRef, outlineRef);
  const panelId = "assistant-panel";

  // Abort any in-flight stream on unmount (locale switch / navigation).
  React.useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open]);

  const sendMessage = React.useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setError(false);
    setInput("");
    // Window to the API limit (greeting is display-only; empty bubbles are
    // failed sends that must not poison the next request with a 400). The
    // slice can open on an assistant turn — validation requires a user first.
    let history = messages
      .filter((m) => !m.seeded && m.content.trim().length > 0)
      .slice(-(MAX_MESSAGES - 1));
    while (history.length > 0 && history[0].role === "assistant") history = history.slice(1);
    const payload: AssistantMessage[] = [...history, { role: "user", content: text }];
    setMessages([
      ...messages,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setIsStreaming(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload, locale }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`assistant ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }
    } catch {
      setError(true);
      // Roll back the empty assistant placeholder so retries send valid history.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content.length === 0) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, locale]);

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <div
      data-testid="assistant-widget"
      data-widget-revealed={revealed ? "true" : "false"}
      // Hidden over the hero: fade/lift it out and stop it swallowing clicks on
      // the video (`inert` also drops it from the tab order for keyboard users).
      inert={!revealed}
      className={cn(
        "fixed right-5 bottom-5 z-40 overflow-visible print:hidden transition-all duration-300 ease-in-out",
        revealed
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      {open && (
        <section
          id={panelId}
          data-testid="assistant-panel"
          aria-label={t("title")}
          className="mb-3 flex h-[min(70vh,32rem)] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-none border bg-card shadow-soft"
        >
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">{t("title")}</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("close")}
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </header>

          <div
            ref={listRef}
            data-testid="assistant-messages"
            data-streaming={isStreaming ? "true" : "false"}
            role="log"
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-none px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.content ||
                  (message.role === "assistant" && isStreaming ? t("loading") : "")}
              </div>
            ))}
            {error && (
              <p data-testid="assistant-error" className="text-sm text-destructive">
                {t("error")}
              </p>
            )}
          </div>

          <div className="flex items-end gap-2 border-t px-3 py-3">
            <Textarea
              ref={inputRef}
              data-testid="assistant-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              maxLength={MAX_CONTENT_CHARS}
              rows={2}
              className="min-h-0 resize-none"
            />
            <Button
              data-testid="assistant-send"
              aria-label={t("send")}
              disabled={isStreaming || input.trim().length === 0}
              onClick={() => void sendMessage()}
            >
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </section>
      )}

      {/*
        Ghost FAB: two SVG artworks stacked at identical coords
        (absolute inset-0, `background-size: contain` inside a 64px square box,
        i.e. the artwork is letterboxed — never stretched, cropped or trimmed).
        The solid brand-red ghost (#8B0000) carries the near-black oval eyes and
        the open mouth; the white line-art twin paints over the red
        footer. The root, this wrapper and the button all set `overflow-visible`
        so no container can slice the silhouette, and the snug 20px inset
        (right-5 / bottom-5 on the root) keeps it clear of every viewport edge
        while staying close to the corner. The inner float adds at most 10px of
        lift, so the visual bottom gap stays in a 20–30px band and can never
        touch the edge.
        transition-transform ONLY — clip-path must apply instantly or the seam
        lags scroll and opens a background gap (black streak) / bleeds white
        above the footer boundary. All float/hover/footer-inversion physics is
        unchanged.
      */}
      <div
        ref={fabRef}
        data-overlap="0.00"
        className="animate-assistant-float relative size-16 overflow-visible transition-transform duration-300 hover:scale-110 hover:drop-shadow-[0_4px_14px_rgba(127,29,29,0.55)]"
      >
        <Button
          data-testid="assistant-trigger"
          aria-label={open ? t("close") : t("open")}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          size="icon"
          className="relative size-16 aspect-square overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
          onClick={() => setOpen((value) => !value)}
        >
          {/* Solid brand-red ghost — visible above the footer boundary. */}
          <span
            ref={solidRef}
            data-testid="ghost-body"
            className="assistant-ghost-solid absolute inset-0 top-0 left-0 block size-full"
            aria-hidden
          />
          {/* White line-art ghost — visible inside the footer boundary.
              Starts hidden (below fold) to avoid a pre-paint white flash. */}
          <span
            ref={outlineRef}
            data-testid="ghost-outline"
            className="assistant-ghost-outline absolute inset-0 top-0 left-0 block size-full"
            style={{ clipPath: "inset(100% 0 0 0)" }}
            aria-hidden
          />
        </Button>
      </div>
    </div>
  );
}
