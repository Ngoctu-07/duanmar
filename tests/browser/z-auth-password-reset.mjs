import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Auth regression + recovery flow.
 *
 * A. A legacy account (mixed-case email, prototype SHA-256 hash) can sign in
 *    with its correct password — the exact "email taken but cannot log in" bug.
 * B. Forgot password → 60s OTP → wrong code error → expiry → resend → correct
 *    code → new password → automatic sign-in → sign out → sign in with the NEW
 *    password.
 * C. The OTP is a server-side secret: it is delivered to the recipient mailbox
 *    (dev maildrop file), never rendered in the UI, never returned by the API
 *    and never logged. Wrong / expired codes are rejected server-side with the
 *    exact localized error and never open the new-password step.
 *
 * Runs against `npm run dev`. Without `RESEND_API_KEY` the dev server writes
 * each password-reset email to `data/dev-mail/*.json` — the test reads the code
 * from there instead of from the DOM (the DOM leak this test now guards
 * against).
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const MAILDROP_DIR = fileURLToPath(new URL("../../data/dev-mail", import.meta.url));
const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const BASE = "http://localhost:3000";
const DB_PATH = fileURLToPath(new URL("../../data/article-likes.db", import.meta.url));
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA busy_timeout = 5000");

const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads the newest password-reset message addressed to `to`. */
const readMaildrop = (to) => {
  let found = null;
  try {
    for (const name of readdirSync(MAILDROP_DIR)) {
      if (!name.endsWith(".json")) continue;
      try {
        const message = JSON.parse(readFileSync(`${MAILDROP_DIR}/${name}`, "utf8"));
        if (message.to !== to) continue;
        const at = Date.parse(message.deliveredAt);
        if (!found || at >= found.at) found = { at, message, file: `${MAILDROP_DIR}/${name}` };
      } catch {
        // ignore partially written / foreign files
      }
    }
  } catch {
    return null;
  }
  return found;
};

/** Waits for a maildrop delivery newer than `afterAt` ms. */
const waitForMaildrop = async (to, { afterAt = 0, timeoutMs = 20000 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = readMaildrop(to);
    if (found?.message.code && /^\d{6}$/.test(found.message.code) && found.at > afterAt) {
      return found;
    }
    await sleep(400);
  }
  return null;
};

const deleteMaildrop = (to) => {
  try {
    for (const name of readdirSync(MAILDROP_DIR)) {
      if (!name.endsWith(".json")) continue;
      const file = `${MAILDROP_DIR}/${name}`;
      try {
        if (JSON.parse(readFileSync(file, "utf8")).to === to) rmSync(file, { force: true });
      } catch {
        // ignore
      }
    }
  } catch {
    // folder absent — nothing to clean
  }
};

const postJson = async (path, body) => {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json().catch(() => ({})) };
};

const stamp = Date.now();
const legacyEmailStored = `Legacy.${stamp}@Example.TEST`;
const legacyEmail = legacyEmailStored.toLowerCase();
const legacyPassword = "legacy-pass-123";

const resetEmail = `reset.${stamp}@example.test`;
const initialPassword = "initial-pass-123";
const newPassword = "reset-pass-456";

/** Third fixture: API-level checks (payload shape, wrong / expired codes). */
const probeEmail = `probe.${stamp}@example.test`;
const probePassword = "probe-pass-123";

const insertUser = (email, password, name) => {
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(
    randomUUID(),
    email,
    name,
    createHash("sha256").update(password).digest("hex"),
    new Date().toISOString()
  );
};

const cleanup = () => {
  try {
    db.prepare("DELETE FROM password_reset_otps WHERE email IN (?, ?, ?)").run(
      legacyEmail,
      resetEmail,
      probeEmail
    );
    db.prepare("DELETE FROM users WHERE lower(email) IN (?, ?, ?)").run(
      legacyEmail,
      resetEmail,
      probeEmail
    );
  } catch (error) {
    console.warn("cleanup failed", error.message);
  }
  deleteMaildrop(resetEmail);
  deleteMaildrop(probeEmail);
};

const fill = async (page, selector, value) => {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(selector, value);
};

const clickButton = async (page, needle) => {
  const clicked = await page.evaluate((needle) => {
    const target = needle.toLowerCase();
    const button = [...document.querySelectorAll("button")].find((el) =>
      (el.textContent ?? "").trim().toLowerCase().includes(target)
    );
    if (!button) return false;
    button.click();
    return true;
  }, needle);
  if (!clicked) throw new Error(`button not found: ${needle}`);
};

const waitForSignInCta = (page) =>
  page.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].some((el) =>
        (el.textContent ?? "").toLowerCase().includes("sign in")
      ),
    { timeout: 20000 }
  );

const openAuthModal = async (page) => {
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) =>
      (el.textContent ?? "").toLowerCase().includes("sign in")
    );
    button?.click();
  });
  await page.waitForSelector("#auth-email", { timeout: 10000 });
};

const submitCredentials = async (page, email, password) => {
  await fill(page, "#auth-email", email);
  await page.type("#auth-password", password);
  await page.click('form button[type="submit"]');
};

let browser;
try {
  cleanup();
  insertUser(legacyEmailStored, legacyPassword, "Legacy Tester");

  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1000 } });
  const page = await getPage(browser);

  // ---------------------------------------------------------------- A. legacy login
  await page.goto(`${BASE}/en/account`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);

  await openAuthModal(page);
  await fill(page, "#auth-email", legacyEmail);
  await page.type("#auth-password", legacyPassword);
  const passwordTypeBefore = await page.$eval("#auth-password", (el) => el.type);
  await page.click('[data-testid="password-visibility-toggle"]');
  const passwordRevealed = await page.$eval("#auth-password", (el) => el.type);
  const togglePressed = await page.$eval(
    '[data-testid="password-visibility-toggle"]',
    (el) => el.getAttribute("aria-pressed")
  );
  await page.click('[data-testid="password-visibility-toggle"]');
  const passwordTypeAfter = await page.$eval("#auth-password", (el) => el.type);
  check(
    "sign-in password starts masked, reveals with the eye toggle and hides again",
    passwordTypeBefore === "password" &&
      passwordRevealed === "text" &&
      togglePressed === "true" &&
      passwordTypeAfter === "password",
    JSON.stringify({ passwordTypeBefore, passwordRevealed, togglePressed, passwordTypeAfter })
  );
  await page.click('form button[type="submit"]');
  const loginModalClosed = await page
    .waitForFunction(() => !document.querySelector("#auth-email"), { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  check("legacy account signs in with its correct password", loginModalClosed);

  if (!loginModalClosed) {
    const errorText = await page.evaluate(() => document.body.innerText);
    check("legacy login error text", false, errorText.slice(0, 160));
    throw new Error("legacy login failed — aborting the recovery flow");
  }

  const legacySignedIn = await page
    .waitForFunction(
      (email) => document.body.innerText.toLowerCase().includes(email),
      { timeout: 20000 },
      legacyEmail
    )
    .then(() => true)
    .catch(() => false);
  check("normalized (lower-case) email is shown after login", legacySignedIn, legacyEmail);

  // Sign out so the recovery flow starts from a clean session.
  await clickButton(page, "sign out");
  await waitForSignInCta(page);

  // ---------------------------------------------------------------- B. recovery
  await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Reset Tester", email, password }),
      });
      if (!response.ok) throw new Error(`register ${response.status}`);
    },
    { email: resetEmail, password: initialPassword }
  );

  await page.reload({ waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await openAuthModal(page);
  await clickButton(page, "forgot password");
  await page.waitForSelector("#recovery-email", { timeout: 10000 });

  await fill(page, "#recovery-email", resetEmail);
  await clickButton(page, "send otp");
  try {
    await page.waitForSelector("#recovery-code", { timeout: 20000 });
  } catch {
    const modalText = await page.evaluate(() => document.body.innerText);
    if (/please wait before requesting|wait \d+s before requesting/i.test(modalText)) {
      throw new Error(
        "password-reset IP guard tripped (8 requests / 10 min per IP). Restart the dev " +
          "server (in-memory counter) or start it with PASSWORD_RESET_IP_MAX=200, then rerun."
      );
    }
    throw new Error(`OTP step did not appear after "Send OTP": ${modalText.slice(0, 300)}`);
  }

  const countdown = await page.$eval(
    '[data-testid="otp-countdown"]',
    (el) => el.textContent ?? ""
  );
  check(
    "OTP view shows the 60-second countdown",
    /expires in (1:00|0:5\d)/i.test(countdown),
    countdown
  );

  const previewNotInDom = await page.evaluate(() => {
    const text = document.body.innerText;
    return (
      !/dev preview code/i.test(text) &&
      !/mã xem trước/i.test(text) &&
      !/\b\d{6}\b/.test(text)
    );
  });
  check("no dev OTP preview is rendered in the UI", previewNotInDom);
  await page.screenshot({ path: `${OUT}/auth-otp-step.png` });

  const delivered = await waitForMaildrop(resetEmail);
  check(
    "OTP is delivered to the recipient mailbox (server-side maildrop)",
    Boolean(delivered) && /^\d{6}$/.test(delivered.message.code),
    delivered ? `code=${delivered.message.code.length} digits, file=${delivered.file.split(/[\\/]/).pop()}` : "no message"
  );
  const deliveredMessage = delivered?.message ?? {};
  check(
    "delivered email carries the code and the 1-minute expiry copy",
    typeof deliveredMessage.html === "string" &&
      deliveredMessage.html.includes(deliveredMessage.code) &&
      /reset code/i.test(deliveredMessage.subject ?? "") &&
      /1 minute/i.test(deliveredMessage.text ?? "") &&
      deliveredMessage.to === resetEmail,
    JSON.stringify({ subject: deliveredMessage.subject, to: deliveredMessage.to })
  );

  const bodyText = await page.evaluate(() => document.body.innerText);
  const code = deliveredMessage.code;
  check("OTP is 6 numeric digits", /^\d{6}$/.test(code ?? ""), code);
  check(
    "the OTP never appears in the page text",
    typeof code === "string" && code.length === 6 && !bodyText.includes(code)
  );

  // Wrong code first: must stay on the OTP step with an inline error.
  await fill(page, "#recovery-code", code === "000000" ? "111111" : "000000");
  await clickButton(page, "verify code");
  const wrongMessageShown = await page
    .waitForFunction(
      () => /Invalid OTP code\. Please try again\./.test(document.body.innerText),
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false);
  check("wrong OTP shows the explicit invalid-code error", wrongMessageShown);
  check(
    "wrong OTP does not open the new-password step",
    !(await page.$("#recovery-password"))
  );

  // Wait out the full 60-second TTL: the countdown flips to the expired copy and
  // the resend control unlocks.
  const expiredShown = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="otp-countdown"]');
        return /otp expired/i.test(el?.textContent ?? "");
      },
      { timeout: 75000 }
    )
    .then(() => true)
    .catch(() => false);
  check("OTP expires after 60 seconds", expiredShown);

  const resendEnabled = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) =>
      (el.textContent ?? "").toLowerCase().includes("send a new code")
    );
    return Boolean(button) && !button.disabled;
  });
  check("resend unlocks after expiry", resendEnabled);

  const firstDeliveryAt = delivered?.at ?? 0;
  await clickButton(page, "send a new code");
  const fresh = await waitForMaildrop(resetEmail, { afterAt: firstDeliveryAt });
  const freshCode = fresh?.message.code ?? "";
  check(
    "resending issues a new code",
    freshCode !== "" && freshCode !== code && /^\d{6}$/.test(freshCode),
    `first=${code} fresh=${freshCode}`
  );

  // Correct code → Step C.
  await fill(page, "#recovery-code", freshCode);
  await clickButton(page, "verify code");
  await page.waitForSelector("#recovery-password", { timeout: 20000 });
  check("valid OTP advances to the new-password step", true);

  await fill(page, "#recovery-password", newPassword);
  await fill(page, "#recovery-confirm", newPassword);
  await clickButton(page, "save & sign in");

  const autoSignedIn = await page
    .waitForFunction(
      (email) => !document.querySelector("#recovery-password") &&
        document.body.innerText.toLowerCase().includes(email),
      { timeout: 30000 },
      resetEmail
    )
    .then(() => true)
    .catch(() => false);
  check("saving the password signs the user in automatically", autoSignedIn, resetEmail);

  await page.screenshot({ path: `${OUT}/auth-password-reset.png` });

  // Old password must be dead, new password must work through the real modal.
  await clickButton(page, "sign out");
  await waitForSignInCta(page);
  await page.reload({ waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);

  await openAuthModal(page);
  await submitCredentials(page, resetEmail, newPassword);
  const newModalClosed = await page
    .waitForFunction(() => !document.querySelector("#auth-email"), { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  check("new password signs in after a fresh sign-out", newModalClosed);

  const stored = db
    .prepare("SELECT password_hash FROM users WHERE lower(email) = ?")
    .get(resetEmail);
  check(
    "reset stored a scrypt hash",
    typeof stored?.password_hash === "string" &&
      stored.password_hash.startsWith("scrypt$")
  );

  // -------------------------------------------- C. API-level OTP contract
  // Direct HTTP assertions on a third throwaway account: the payload carries no
  // secret, a wrong code is rejected without a token, and an expired code is
  // rejected even when the digits are correct.
  await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Probe Tester", email, password }),
      });
      if (!response.ok && response.status !== 409) {
        throw new Error(`probe register ${response.status}`);
      }
    },
    { email: probeEmail, password: probePassword }
  );

  const probeRequest = await postJson("/api/auth/password-reset/request", {
    email: probeEmail,
  });
  check(
    "request response is exactly {ok, expiresInSeconds} — no OTP, no preview field",
    probeRequest.status === 200 &&
      JSON.stringify(Object.keys(probeRequest.json).sort()) ===
        JSON.stringify(["expiresInSeconds", "ok"]) &&
      probeRequest.json.expiresInSeconds === 60 &&
      !JSON.stringify(probeRequest.json).match(/\d{6}/),
    JSON.stringify(probeRequest.json)
  );

  const probeDelivery = await waitForMaildrop(probeEmail);
  const probeCode = probeDelivery?.message.code ?? "";
  check(
    "probe OTP is delivered to the mailbox only",
    /^\d{6}$/.test(probeCode),
    probeCode ? "6 digits" : "no delivery"
  );

  const probeWrong = await postJson("/api/auth/password-reset/verify", {
    email: probeEmail,
    code: probeCode === "000000" ? "111111" : "000000",
  });
  check(
    "wrong OTP → 400 invalid_otp, no reset token",
    probeWrong.status === 400 &&
      probeWrong.json.error === "invalid_otp" &&
      !("token" in probeWrong.json),
    JSON.stringify(probeWrong)
  );

  const shortCode = await postJson("/api/auth/password-reset/verify", {
    email: probeEmail,
    code: "12345",
  });
  check(
    "non-6-digit input → 400 invalid_otp",
    shortCode.status === 400 && shortCode.json.error === "invalid_otp",
    JSON.stringify(shortCode)
  );

  // Expire the live row server-side, then present the CORRECT code: the window
  // is what decides, not the digits. `created_at` moves too, otherwise the
  // 60-second resend cooldown (which counts from issue time) still holds and the
  // follow-up request answers 429 instead of minting a fresh code.
  db.prepare(
    "UPDATE password_reset_otps SET expires_at = ?, created_at = ? " +
      "WHERE email = ? AND consumed_at IS NULL"
  ).run(Date.now() - 1000, Date.now() - 120_000, probeEmail);
  const probeExpired = await postJson("/api/auth/password-reset/verify", {
    email: probeEmail,
    code: probeCode,
  });
  check(
    "correct digits after the 60s window → 410 otp_expired, no reset token",
    probeExpired.status === 410 &&
      probeExpired.json.error === "otp_expired" &&
      !("token" in probeExpired.json),
    JSON.stringify(probeExpired)
  );

  const probeSecond = await postJson("/api/auth/password-reset/request", {
    email: probeEmail,
  });
  const probeSecondDelivery = await waitForMaildrop(probeEmail, {
    afterAt: probeDelivery?.at ?? 0,
  });
  const freshProbeCode = probeSecondDelivery?.message.code ?? "";
  check(
    "a new request after expiry issues a different code",
    probeSecond.status === 200 &&
      /^\d{6}$/.test(freshProbeCode) &&
      freshProbeCode !== probeCode,
    `status=${probeSecond.status} first=${probeCode} second=${freshProbeCode || "(none)"}`
  );

  const probeVerified = await postJson("/api/auth/password-reset/verify", {
    email: probeEmail,
    code: freshProbeCode,
  });
  check(
    "exact match inside the window → 200 single-use reset token",
    probeVerified.status === 200 && /^[0-9a-f]{48}$/.test(probeVerified.json.token ?? ""),
    JSON.stringify({ status: probeVerified.status })
  );
} finally {
  cleanup();
  await closeBrowser();
  const failed = results.filter((line) => line.startsWith("FAIL"));
  console.log(results.join("\n"));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exitCode = 1;
}
