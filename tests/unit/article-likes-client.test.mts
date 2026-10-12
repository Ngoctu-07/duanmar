import assert from "node:assert/strict";

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

// ---- window fakes for the client module ----
class FakeStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}
(globalThis as Record<string, unknown>).window = {
  localStorage: new FakeStorage(),
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

const likes = await import("../../src/lib/article-likes.ts");

check("C1 clearLegacyLikedArticles drops the retired vote key", () => {
  window.localStorage.setItem(likes.LIKED_ARTICLES_STORAGE_KEY, JSON.stringify(["starup"]));
  likes.clearLegacyLikedArticles();
  assert.equal(window.localStorage.getItem(likes.LIKED_ARTICLES_STORAGE_KEY), null);
});

check("C2 clearLegacyLikedArticles tolerates throwing storage", () => {
  const globals = globalThis as Record<string, unknown>;
  const original = globals.window;
  try {
    globals.window = {
      localStorage: {
        removeItem: () => {
          throw new Error("denied");
        },
      },
    };
    likes.clearLegacyLikedArticles();
  } finally {
    globals.window = original;
  }
});

check("C3 clearLegacyLikedArticles without window is a no-op", () => {
  const globals = globalThis as Record<string, unknown>;
  const original = globals.window;
  try {
    delete globals.window;
    likes.clearLegacyLikedArticles();
  } finally {
    globals.window = original;
  }
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
