import type { AssistantLocale, AssistantMessage } from "@/lib/assistant/assistant-types";

export interface StreamAssistantInput {
  systemPrompt: string;
  messages: AssistantMessage[];
  locale: AssistantLocale;
  signal?: AbortSignal;
}

export class AssistantProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "AssistantProviderError";
  }
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// gemini-2.5-flash is retired for new keys; 3.5-flash-lite is the fastest
// stable model that streams on this key (2026-09 verified).
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const MAX_OUTPUT_TOKENS = 512;

/** Live when `GEMINI_API_KEY` is set, otherwise the keyless dry-run path. */
export function isAssistantConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function providerMode(): "gemini" | "dry-run" {
  return isAssistantConfigured() ? "gemini" : "dry-run";
}

/**
 * Gemini streamGenerateContent (`alt=sse`) — plain fetch, zero npm deps
 * (same posture as the Resend adapter in plan 2229). Yields text deltas.
 */
async function* streamGemini(input: StreamAssistantInput): AsyncGenerator<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AssistantProviderError("GEMINI_API_KEY not set");
  const model = process.env.ASSISTANT_MODEL || DEFAULT_MODEL;

  const response = await fetch(
    `${GEMINI_BASE}/${model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: input.systemPrompt }] },
        contents: input.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
      signal: input.signal,
    }
  );

  if (!response.ok) {
    await response.text().catch(() => "");
    throw new AssistantProviderError(
      `Gemini request failed: ${response.status}`,
      response.status
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new AssistantProviderError("Gemini response has no body");

  const decoder = new TextDecoder();
  let buffer = "";
  const parseLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const parsed = JSON.parse(payload) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
      };
      const parts = parsed.candidates?.[0]?.content?.parts ?? [];
      const text = parts
        .filter((part) => typeof part.text === "string" && !part.thought)
        .map((part) => part.text)
        .join("");
      if (text) pending.push(text);
    } catch {
      // partial/keepalive frames — skip
    }
  };
  const pending: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) parseLine(line);
    while (pending.length > 0) yield pending.shift() as string;
  }
  // Flush: decoder tail + any trailing `data:` line without a newline.
  buffer += decoder.decode();
  if (buffer.trim().length > 0) parseLine(buffer);
  while (pending.length > 0) yield pending.shift() as string;
}

/**
 * Keyless fallback: streams a deterministic reply grounded in the CMS context
 * (keyword overlap with the last user message) + a config note. Keeps browser
 * tests and local dev green without `GEMINI_API_KEY`.
 */
async function* streamDryRun(input: StreamAssistantInput): AsyncGenerator<string> {
  const lastUser =
    [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const contextLines = input.systemPrompt
    .split(/=== CMS CONTEXT[^\n]*===/)[1]
    ?.split("\n")
    .filter((line) => line.startsWith("- ")) ?? [];

  const terms = lastUser
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3);
  const ranked = contextLines
    .map((line) => ({ line, hits: terms.filter((t) => line.toLowerCase().includes(t)).length }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map((x) => x.line);

  // Deep links for matched destination/article slugs (≤2, same as live rules).
  const links: string[] = [];
  for (const line of ranked) {
    const destination = line.match(/^- [^(]+\(slug: ([a-z0-9-]+),/);
    if (destination && !links.some((l) => l.endsWith(destination[1]))) {
      links.push(`/${input.locale}/explore/destinations/${destination[1]}`);
    }
    const article = line.match(/\(slug: ([a-z0-9-]+), published/);
    if (article && !links.some((l) => l.endsWith(article[1]))) {
      links.push(`/${input.locale}/blog/${article[1]}`);
    }
    if (links.length >= 2) break;
  }

  const head =
    input.locale === "vi"
      ? "Đây là chế độ thử (chưa cấu hình GEMINI_API_KEY). Dữ liệu từ CMS của chúng tôi:"
      : "This is dry-run mode (GEMINI_API_KEY not configured). From our CMS:";
  const tail =
    input.locale === "vi"
      ? "Cấu hình GEMINI_API_KEY để bật trả lời AI thật. Liên hệ: /contact"
      : "Set GEMINI_API_KEY to enable live AI replies. Contact: /contact";

  const body = ranked.length > 0 ? ranked.join("\n") : `(${input.locale}: no CMS matches)`;
  const linkNote = links.length > 0 ? `\n${links.join("\n")}` : "";
  // Two chunks so the widget visibly streams.
  yield `${head}\n${body.split("\n").slice(0, 2).join("\n")}`;
  yield `${body.split("\n").slice(2).join("\n")}${linkNote}\n${tail}`;
}

/** Streamed assistant reply — Gemini when configured, grounded dry-run otherwise. */
export async function* streamAssistant(
  input: StreamAssistantInput
): AsyncGenerator<string> {
  if (isAssistantConfigured()) {
    yield* streamGemini(input);
  } else {
    yield* streamDryRun(input);
  }
}
