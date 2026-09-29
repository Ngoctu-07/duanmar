import assert from "node:assert/strict";
import {
  EDIT_WINDOW_MS,
  isEditWindowExpired,
  fetchServerNow,
} from "../../src/lib/edit-window.ts";

let passed = 0;
let failed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
}

const CREATED = "2026-09-28T00:00:00.000Z";
const originalFetch = globalThis.fetch;

async function withFetch(
  stub: typeof globalThis.fetch,
  run: () => Promise<void>
) {
  globalThis.fetch = stub;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  (async () => Response.json(body, { status })) as unknown as typeof globalThis.fetch;

async function main() {
  await check("a: EDIT_WINDOW_MS is exactly 3 hours", () => {
    assert.equal(EDIT_WINDOW_MS, 10_800_000);
  });

  await check("b/c/d: boundary 2h59 fresh, 3h00 expired, 3h01 expired", () => {
    assert.equal(isEditWindowExpired(CREATED, "2026-09-28T02:59:00.000Z"), false);
    assert.equal(isEditWindowExpired(CREATED, "2026-09-28T03:00:00.000Z"), true);
    assert.equal(isEditWindowExpired(CREATED, "2026-09-28T03:01:00.000Z"), true);
  });

  await check("e/f: unparsable createdAt or now fails closed", () => {
    assert.equal(isEditWindowExpired("not-a-date", "2026-09-28T03:00:00.000Z"), true);
    assert.equal(isEditWindowExpired(CREATED, "nope"), true);
    assert.equal(isEditWindowExpired("", "2026-09-28T03:00:00.000Z"), true);
  });

  await check("g: injectable windowMs (999ms fresh, 1000ms expired)", () => {
    assert.equal(
      isEditWindowExpired("2026-09-28T00:00:00.000Z", "2026-09-28T00:00:00.999Z", 1000),
      false
    );
    assert.equal(
      isEditWindowExpired("2026-09-28T00:00:00.000Z", "2026-09-28T00:00:01.000Z", 1000),
      true
    );
  });

  await check("h: fetchServerNow returns ISO on 200 valid payload", async () => {
    const iso = "2026-09-28T10:00:00.000Z";
    await withFetch(jsonResponse({ time: iso }), async () => {
      assert.equal(await fetchServerNow(), iso);
    });
  });

  await check("h: fetchServerNow null on 500", async () => {
    const failing = (async () =>
      new Response("err", { status: 500 })) as unknown as typeof globalThis.fetch;
    await withFetch(failing, async () => {
      assert.equal(await fetchServerNow(), null);
    });
  });

  await check("h: fetchServerNow null on non-string / missing / unparsable time", async () => {
    await withFetch(jsonResponse({ time: 123 }), async () => {
      assert.equal(await fetchServerNow(), null);
    });
    await withFetch(jsonResponse({}), async () => {
      assert.equal(await fetchServerNow(), null);
    });
    await withFetch(jsonResponse({ time: "not-a-date" }), async () => {
      assert.equal(await fetchServerNow(), null);
    });
  });

  await check("h: fetchServerNow null when fetch throws", async () => {
    const rejects = (() =>
      Promise.reject(new Error("network"))) as unknown as typeof globalThis.fetch;
    await withFetch(rejects, async () => {
      assert.equal(await fetchServerNow(), null);
    });
  });

  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
