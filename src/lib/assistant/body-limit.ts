/** Hard byte cap for request bodies — plan 260929-2335 (review fix: do not
 * trust `content-length`, chunked requests can omit it). Pure wrt the stream
 * input, so unit tests drive it with `new Response(...).body`. */

export class PayloadTooLargeError extends Error {
  constructor(readonly max: number) {
    super(`Payload larger than ${max} bytes`);
    this.name = "PayloadTooLargeError";
  }
}

/** Read the full body as UTF-8 text, aborting as soon as `max` is exceeded. */
export async function readBodyTextCapped(
  body: ReadableStream<Uint8Array> | null,
  max: number
): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      throw new PayloadTooLargeError(max);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}
