import type { PortableTextBlock } from "next-sanity";

/**
 * Portable Text "is there anything to read?" helpers.
 *
 * Sanity keeps a block in the array even when the editor only clicked into the
 * field and typed nothing: `details: [{ _type: "block", children: [{ _type:
 * "span", text: "" }] }]`. A plain `details.length > 0` check therefore treats
 * an empty day as expandable and the accordion opens onto blank space (the
 * "TRẠM" itinerary bug). These helpers inspect the actual leaf content instead.
 *
 * Rules:
 * - strings count only when they have non-whitespace text;
 * - spans count only when their `text` has non-whitespace text;
 * - blocks recurse into `children` (and legacy `text`);
 * - any other typed node (inline image, embed, custom object) counts as
 *   content because it can render something even without text;
 * - `markDefs` are not traversed (a link definition alone is not content).
 */

type UnknownRecord = Record<string, unknown>;

function nodeHasContent(node: unknown): boolean {
  if (typeof node === "string") return node.trim().length > 0;
  if (Array.isArray(node)) return node.some(nodeHasContent);
  if (!node || typeof node !== "object") return false;

  const record = node as UnknownRecord;

  if (record._type === "span") {
    return typeof record.text === "string" && record.text.trim().length > 0;
  }

  // Inline images/embeds/custom inline objects are visible content even when
  // they carry no text. The itinerary schema only allows text today, but the
  // guard stays correct if an editor adds an object later.
  if (typeof record._type === "string" && record._type !== "block") {
    return true;
  }

  return nodeHasContent(record.children) || nodeHasContent(record.text);
}

/** Keep only blocks that actually render something (drops blank paragraphs). */
export function filterPortableTextContent(
  blocks: readonly PortableTextBlock[] | null | undefined
): PortableTextBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter((block) => nodeHasContent(block));
}

/** True when at least one block has visible content (text or an inline object). */
export function hasPortableTextContent(
  blocks: readonly PortableTextBlock[] | null | undefined
): boolean {
  return filterPortableTextContent(blocks).length > 0;
}
