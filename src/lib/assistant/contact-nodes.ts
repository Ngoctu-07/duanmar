import enMessages from "@/messages/en.json";
import viMessages from "@/messages/vi.json";
import type { AssistantLocale, GroundingContactNode } from "@/lib/assistant/assistant-types";

const CONTACT_KEYS = ["phone", "email", "facebook", "instagram", "tiktok"] as const;

interface MessagesShape {
  contact?: {
    nodes?: Partial<Record<(typeof CONTACT_KEYS)[number], GroundingContactNode>>;
  };
}

/**
 * Footer contact nodes for a locale (same keys as `contactKeys` in
 * `footer.tsx`) — grounding data for assistant replies about how to reach us.
 */
export function contactNodesFor(locale: AssistantLocale): GroundingContactNode[] {
  const messages = (locale === "vi" ? viMessages : enMessages) as MessagesShape;
  const nodes = messages.contact?.nodes ?? {};
  return CONTACT_KEYS.map((key) => nodes[key]).filter(
    (node): node is GroundingContactNode =>
      Boolean(node && typeof node.value === "string" && node.value.length > 0)
  );
}
