"use client";

import { useCallback, useEffect, useRef } from "react";
import { CRT_ACTION_MS, prefersReducedMotion } from "@/lib/crt-static";

const SOUND_GAIN = 0.04;

/**
 * Synthesises a short, low-volume TV-static burst for the CRT overlay.
 * Duration follows the visual burst (300ms for CTAs, 500ms for the landing
 * splash). The AudioContext is warmed on the first pointer gesture (autoplay
 * policies otherwise suspend it) and the noise buffer is generated on demand
 * in a few thousand samples — no network asset, no decode/playback latency.
 */
export function useStaticBurstAudio(): (durationMs?: number) => void {
  const audioRef = useRef<AudioContext | null>(null);

  const playStatic = useCallback((durationMs: number = CRT_ACTION_MS) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }

    const duration = Math.max(0.05, durationMs / 1000);
    const samples = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      // White noise; the band-pass below turns it into TV static rather than
      // a harsh full-spectrum hiss.
      data[index] = (Math.random() * 2 - 1) * 0.55;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2600;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    const startAt = ctx.currentTime + 0.005;

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(SOUND_GAIN, startAt + 0.015);
    gain.gain.setValueAtTime(SOUND_GAIN, startAt + duration - 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(startAt);
    source.stop(startAt + duration);
  }, []);

  useEffect(() => {
    const warm = () => {
      if (prefersReducedMotion()) return;
      try {
        const AudioCtor =
          window.AudioContext ??
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtor) return;
        if (!audioRef.current) audioRef.current = new AudioCtor();
        if (audioRef.current.state === "suspended") {
          void audioRef.current.resume().catch(() => undefined);
        }
      } catch {
        // Audio is decorative: a blocked context never breaks the interaction.
      }
    };
    window.addEventListener("pointerdown", warm, { once: true, passive: true });
    return () => window.removeEventListener("pointerdown", warm);
  }, []);

  useEffect(
    () => () => {
      const ctx = audioRef.current;
      audioRef.current = null;
      if (ctx && ctx.state !== "closed") {
        void ctx.close().catch(() => undefined);
      }
    },
    []
  );

  return playStatic;
}
