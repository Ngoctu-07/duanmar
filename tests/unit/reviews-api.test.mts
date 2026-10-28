import assert from "node:assert/strict";
import { migrateLegacyReviews } from "../../src/lib/reviews-api.ts";
import { REVIEWS_STORAGE_KEY } from "../../src/lib/reviews.ts";

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => Promise<void> | void) => {
  const run = async () => {
    try {
      await fn();
      passed += 1;
      console.log(`ok   ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`FAIL ${name} :: ${(error as Error).message}`);
    }
  };
  return run();
};

const entry = (reference: string) => ({
  reference,
  tourSlug: "hcm",
  authorName: "Probe",
  authorEmail: "probe@example.com",
  rating: 4,
  comment: "Migrated entry",
  images: [],
  createdAt: "2026-10-07T10:00:00.000Z",
  bookingReference: reference.split(":")[0],
});

type Stub = {
  store: Map<string, string>;
  events: string[];
  calls: Array<{ url: string; status: number; body: string | null }>;
  restore: () => void;
  list: () => unknown[];
};

function stubRuntime(initial: unknown[] | undefined, statuses: Array<number | "throw">): Stub {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(REVIEWS_STORAGE_KEY, JSON.stringify(initial));
  const events: string[] = [];
  const calls: Array<{ url: string; status: number; body: string | null }> = [];
  const queue = [...statuses];
  const prevWindow = (globalThis as { window?: unknown }).window;
  const prevFetch = globalThis.fetch;
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
    dispatchEvent: (event: { type: string }) => {
      events.push(event.type);
      return true;
    },
  };
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const next = queue.length > 0 ? queue.shift()! : 201;
    if (next === "throw") throw new Error("network down");
    calls.push({
      url: String(url),
      status: next,
      body: typeof init?.body === "string" ? init.body : null,
    });
    return { status: next };
  }) as typeof fetch;
  return {
    store,
    events,
    calls,
    restore: () => {
      if (prevWindow === undefined) delete (globalThis as { window?: unknown }).window;
      else (globalThis as { window?: unknown }).window = prevWindow;
      globalThis.fetch = prevFetch;
    },
    list: () => {
      const raw = store.get(REVIEWS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as unknown[]) : [];
    },
  };
}

await check("M1 empty list → resolves, fetch never called", async () => {
  const stub = stubRuntime(undefined, []);
  try {
    await migrateLegacyReviews();
    assert.equal(stub.calls.length, 0);
    assert.equal(stub.events.length, 0);
  } finally {
    stub.restore();
  }
});

await check("M2 accepted entries dropped one by one, key cleared, change notified", async () => {
  const stub = stubRuntime([entry("VN-M1:hcm"), entry("VN-M2:hcm")], [201, 201]);
  try {
    await migrateLegacyReviews();
    assert.equal(stub.calls.length, 2);
    assert.equal(stub.store.has(REVIEWS_STORAGE_KEY), false);
    assert.ok(stub.events.includes("vn-reviews:changed"));
    const body = JSON.parse(stub.calls[0].body ?? "{}") as Record<string, unknown>;
    assert.equal("authorName" in body, false);
    assert.equal("authorEmail" in body, false);
  } finally {
    stub.restore();
  }
});

await check("M3 canonical rejection (400) is dropped, run continues", async () => {
  const stub = stubRuntime([entry("VN-M1:hcm"), entry("VN-M2:hcm")], [400, 201]);
  try {
    await migrateLegacyReviews();
    assert.equal(stub.calls.length, 2);
    assert.equal(stub.store.has(REVIEWS_STORAGE_KEY), false);
  } finally {
    stub.restore();
  }
});

await check("M4 rate-limit (429) stops the run, data kept for retry", async () => {
  const stub = stubRuntime([entry("VN-M1:hcm"), entry("VN-M2:hcm")], [429]);
  try {
    await migrateLegacyReviews();
    assert.equal(stub.calls.length, 1);
    assert.equal(stub.list().length, 2);
    assert.equal(stub.events.length, 0);
  } finally {
    stub.restore();
  }
});

await check("M5 network failure stops the run, data kept", async () => {
  const stub = stubRuntime([entry("VN-M1:hcm")], ["throw"]);
  try {
    await migrateLegacyReviews();
    assert.equal(stub.list().length, 1);
    assert.equal(stub.events.length, 0);
  } finally {
    stub.restore();
  }
});

await check("M6 concurrent callers share one inflight run", async () => {
  const stub = stubRuntime([entry("VN-M1:hcm"), entry("VN-M2:hcm")], [201, 201]);
  try {
    await Promise.all([migrateLegacyReviews(), migrateLegacyReviews()]);
    assert.equal(stub.calls.length, 2);
    assert.equal(stub.store.has(REVIEWS_STORAGE_KEY), false);
  } finally {
    stub.restore();
  }
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
