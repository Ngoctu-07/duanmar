import type { NextRequest } from "next/server";
import {
  streamAssistant,
  providerMode,
  AssistantProviderError,
} from "@/lib/assistant/assistant-provider";
import { buildGroundingContext } from "@/lib/assistant/grounding-fetch";
import { buildSystemPrompt } from "@/lib/assistant/system-prompt";
import {
  validateAssistantRequest,
  toAssistantRequest,
} from "@/lib/assistant/assistant-validation";
import { checkRateLimit } from "@/lib/assistant/rate-limit";
import { PayloadTooLargeError, readBodyTextCapped } from "@/lib/assistant/body-limit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32_000;

/**
 * Client key for the rate limiter: `x-real-ip` (proxy-set) wins, else the
 * rightmost `x-forwarded-for` hop (appended by the nearest trusted proxy),
 * else `local` (direct dev). Trust assumption: a spoofing client can only
 * control entries its own proxy does not append — document in ai-assistant.md.
 */
function resolveClientKey(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return "local";
}

/**
 * Streaming assistant endpoint: rate limit → guards → capped body read →
 * server-side grounding → provider stream (Gemini or keyless dry-run) as
 * `text/plain` chunks. The first delta is pulled BEFORE headers go out so
 * provider failures can still return a real 502.
 */
export async function POST(req: NextRequest) {
  const logBase = { at: new Date().toISOString() };

  // Rate limit first so oversized/garbage spam still consumes budget.
  const ip = resolveClientKey(req);
  if (!checkRateLimit(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return Response.json({ error: "Unsupported media type" }, { status: 415 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let text: string;
  try {
    text = await readBodyTextCapped(req.body, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const errors = validateAssistantRequest(body);
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  const request = toAssistantRequest(body);
  const startedAt = Date.now();
  const logMeta = {
    ...logBase,
    locale: request.locale,
    messageCount: request.messages.length,
    totalChars: request.messages.reduce((n, m) => n + m.content.length, 0),
    mode: providerMode(),
  };

  const abort = new AbortController();
  const onAbort = () => abort.abort();
  req.signal.addEventListener("abort", onAbort);
  if (req.signal.aborted) abort.abort();

  let systemPrompt: string;
  try {
    const context = await buildGroundingContext(request.locale);
    systemPrompt = buildSystemPrompt(request.locale, context);
  } catch {
    console.warn("[assistant] grounding failed", { ...logMeta, ms: Date.now() - startedAt });
    req.signal.removeEventListener("abort", onAbort);
    return Response.json({ error: "assistant unavailable" }, { status: 502 });
  }

  const generator = streamAssistant({
    systemPrompt,
    messages: request.messages,
    locale: request.locale,
    signal: abort.signal,
  });

  let first: IteratorResult<string>;
  try {
    first = await generator.next();
  } catch (error) {
    console.warn("[assistant] provider failed before first chunk", {
      ...logMeta,
      reason: error instanceof AssistantProviderError ? error.status ?? "error" : "error",
      ms: Date.now() - startedAt,
    });
    abort.abort();
    req.signal.removeEventListener("abort", onAbort);
    return Response.json({ error: "assistant unavailable" }, { status: 502 });
  }
  if (first.done) {
    console.warn("[assistant] empty provider stream", {
      ...logMeta,
      ms: Date.now() - startedAt,
    });
    abort.abort();
    req.signal.removeEventListener("abort", onAbort);
    return Response.json({ error: "assistant unavailable" }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const interruptedNote =
    request.locale === "vi"
      ? "\n[trả lời bị gián đoạn — thử lại]"
      : "\n[reply interrupted — please retry]";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let failed = false;
      try {
        controller.enqueue(encoder.encode(first.value));
        let step = await generator.next();
        while (!step.done) {
          controller.enqueue(encoder.encode(step.value));
          step = await generator.next();
        }
      } catch {
        failed = true;
        if (!abort.signal.aborted) controller.enqueue(encoder.encode(interruptedNote));
      } finally {
        console.info("[assistant]", {
          ...logMeta,
          interrupted: failed,
          ms: Date.now() - startedAt,
        });
        req.signal.removeEventListener("abort", onAbort);
        controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function GET() {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
