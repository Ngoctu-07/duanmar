import type { AssistantRequest } from "@/lib/assistant/assistant-types";

export const MAX_MESSAGES = 8;
export const MAX_CONTENT_CHARS = 1000;
const LOCALES = new Set(["en", "vi"]);
const ROLES = new Set(["user", "assistant"]);

/**
 * Validate the `/api/assistant` payload. Returns `{field: message}` —
 * non-empty means 400. Pure: unit-tested in phase-04.
 */
export function validateAssistantRequest(body: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (typeof body !== "object" || body === null) {
    return { body: "Expected a JSON object" };
  }
  const { messages, locale } = body as { messages?: unknown; locale?: unknown };

  if (typeof locale !== "string" || !LOCALES.has(locale)) {
    errors.locale = 'locale must be "en" or "vi"';
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    errors.messages = "messages must be a non-empty array";
    return errors;
  }
  if (messages.length > MAX_MESSAGES) {
    errors.messages = `messages limited to ${MAX_MESSAGES}`;
    return errors;
  }

  messages.forEach((raw, index) => {
    const message = raw as { role?: unknown; content?: unknown };
    if (typeof message !== "object" || message === null) {
      errors[`messages.${index}`] = "must be an object";
      return;
    }
    if (typeof message.role !== "string" || !ROLES.has(message.role)) {
      errors[`messages.${index}.role`] = 'role must be "user" or "assistant"';
    }
    if (typeof message.content !== "string" || message.content.trim().length === 0) {
      errors[`messages.${index}.content`] = "content must be a non-empty string";
    } else if (message.content.length > MAX_CONTENT_CHARS) {
      errors[`messages.${index}.content`] = `content limited to ${MAX_CONTENT_CHARS} chars`;
    }
  });

  const first = messages[0] as { role?: unknown } | null;
  if (first && typeof first === "object" && first.role !== "user") {
    errors["messages.0.role"] = "conversation must start with a user message";
  }

  return errors;
}

/** Narrow a validated body into the request type (call after validation).
 * Consecutive same-role messages are merged — Gemini only accepts strictly
 * alternating user/model turns and would 400 the whole request. */
export function toAssistantRequest(body: unknown): AssistantRequest {
  const { messages, locale } = body as AssistantRequest;
  const normalized: AssistantRequest["messages"] = [];
  for (const message of messages) {
    const role = message.role === "assistant" ? "assistant" : "user";
    const previous = normalized[normalized.length - 1];
    if (previous && previous.role === role) {
      previous.content = `${previous.content}\n${message.content}`;
    } else {
      normalized.push({ role, content: message.content });
    }
  }
  return {
    locale: locale === "vi" ? "vi" : "en",
    messages: normalized,
  };
}
