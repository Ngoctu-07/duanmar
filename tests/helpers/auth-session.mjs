import { dismissPromo } from "./promo.mjs";

/** Stable accounts so review fixtures survive repeated local test runs. */
export const REVIEW_OWNER = {
  name: "Review Owner",
  email: "review-owner@example.test",
  password: "review-owner-password-123",
};

export const REVIEW_FOREIGN = {
  name: "Foreign Reviewer",
  email: "review-foreign@example.test",
  password: "review-foreign-password-123",
};

async function signInAccount(page, account, base) {
  const { name, email, password } = account;
  await page.goto(`${base}/en`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.evaluate(
    async ({ name, email, password }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      // 409 = account already exists from a previous run.
      if (!response.ok && response.status !== 409) {
        throw new Error(`register ${response.status}`);
      }
    },
    { name, email, password }
  );

  await page.goto(`${base}/en/account`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) =>
      (el.textContent ?? "").toLowerCase().includes("sign in")
    );
    button?.click();
  });
  await page.waitForSelector("#auth-email", { timeout: 10000 });
  await page.type("#auth-email", email);
  await page.type("#auth-password", password);
  await page.click('form button[type="submit"]');
  await page.waitForFunction(
    async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await response.json();
      return Boolean(session?.user?.id);
    },
    { timeout: 30000 }
  );
  return { name, email, password };
}

/**
 * Register (idempotently) then sign in through the real auth modal. Returns
 * once `/api/auth/session` reports the user id, so follow-up API calls and
 * migrations run with the session cookie.
 */
export async function signInReviewOwner(page, { base = "http://localhost:3000" } = {}) {
  return signInAccount(page, REVIEW_OWNER, base);
}

export async function signInReviewForeign(page, { base = "http://localhost:3000" } = {}) {
  return signInAccount(page, REVIEW_FOREIGN, base);
}
