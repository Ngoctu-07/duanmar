import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Password-reset delivery contract.
 *
 * The OTP is a secret: it goes to the recipient's mailbox and nowhere else.
 * These checks pin the transport (live Resend dispatch / dev maildrop), the
 * payload shape and — critically — that no code ever reaches a log, a response
 * body or the client UI.
 */

const dir = mkdtempSync(join(tmpdir(), "duanmar-maildrop-"));
process.env.PASSWORD_RESET_MAILDROP_DIR = dir;
delete process.env.RESEND_API_KEY;
const originalNodeEnv = process.env.NODE_ENV;
const originalFrom = process.env.EMAIL_FROM;

const {
  MAILDROP_DIR_ENV,
  renderPasswordResetEmail,
  sendPasswordResetEmail,
} = await import("../../src/lib/email/password-reset-email.ts");
const { EmailDeliveryError } = await import("../../src/lib/email/email-provider.ts");

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (relative: string) => readFileSync(join(root, relative), "utf8");

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void | Promise<void>) => {
  const done = (error?: unknown) => {
    if (error) {
      failed += 1;
      console.log(`FAIL ${name} :: ${(error as Error).message}`);
    } else {
      passed += 1;
      console.log(`ok   ${name}`);
    }
  };
  try {
    const result = fn();
    if (result instanceof Promise) return result.then(() => done(), done);
    done();
  } catch (error) {
    done(error);
  }
};

const maildropFiles = () => readdirSync(dir).filter((name) => name.endsWith(".json"));

const readMaildrop = () => JSON.parse(readFileSync(join(dir, maildropFiles()[0]), "utf8"));

/** Newest maildrop message addressed to `to`. */
const maildropFor = (to: string) => {
  const messages = maildropFiles()
    .map((name) => JSON.parse(readFileSync(join(dir, name), "utf8")))
    .filter((message) => message.to === to);
  return messages.at(-1) ?? null;
};

const CODE = "284984";

check("template carries the code, the brand copy and the 1-minute expiry", () => {
  const rendered = renderPasswordResetEmail({ code: CODE, expiresInSeconds: 60 });
  assert.ok(rendered.html.includes(CODE));
  assert.ok(rendered.text.includes(CODE));
  assert.match(rendered.subject, /Password reset code/);
  assert.match(rendered.subject, /Mã đặt lại mật khẩu/);
  assert.match(rendered.text, /1 minute/);
  assert.match(rendered.text, /1 phút/);
  assert.match(rendered.html, /Nếu bạn không yêu cầu/);
});

await check("development delivery writes a server-side maildrop file, not a response field", async () => {
  assert.equal(process.env[MAILDROP_DIR_ENV], dir);
  const result = await sendPasswordResetEmail({
    to: "dev.user@example.test",
    code: CODE,
    expiresInSeconds: 60,
  });
  assert.equal(result.mode, "dry-run");
  assert.equal(maildropFiles().length, 1);
  const message = readMaildrop();
  assert.equal(message.to, "dev.user@example.test");
  assert.equal(message.code, CODE);
  assert.ok(message.html.includes(CODE));
  assert.equal(message.subject, "[DuanMar] Password reset code / Mã đặt lại mật khẩu");
});

await check("the OTP never reaches the console, the logs or a client payload", async () => {
  const logged: string[] = [];
  const originalInfo = console.info;
  const originalError = console.error;
  console.info = (...args: unknown[]) => logged.push(JSON.stringify(args));
  console.error = (...args: unknown[]) => logged.push(JSON.stringify(args));
  try {
    await sendPasswordResetEmail({
      to: "log.user@example.test",
      code: "515253",
      expiresInSeconds: 60,
    });
  } finally {
    console.info = originalInfo;
    console.error = originalError;
  }
  assert.ok(logged.length > 0, "expected a metadata line");
  for (const line of logged) {
    assert.ok(!line.includes("515253"), `log leaked the OTP: ${line}`);
    assert.match(line, /dev-maildrop/);
    assert.match(line, /example\.test/);
  }
});

await check("stale maildrop files are pruned on the next delivery", async () => {
  const stale = join(dir, "stale-old.json");
  writeFileSync(stale, JSON.stringify({ to: "old@example.test", code: "999999" }), "utf8");
  const twoHoursAgo = (Date.now() - 2 * 60 * 60 * 1000) / 1000;
  utimesSync(stale, twoHoursAgo, twoHoursAgo);

  await sendPasswordResetEmail({
    to: "prune.user@example.test",
    code: "606162",
    expiresInSeconds: 60,
  });
  assert.ok(!maildropFiles().includes("stale-old.json"), "stale message survived");
});

await check("live mode dispatches through Resend and writes nothing locally", async () => {
  const before = maildropFiles().length;
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "no-reply@duanmar.test";
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ id: "resend-test-id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const result = await sendPasswordResetEmail({
      to: "live.user@example.test",
      code: "737475",
      expiresInSeconds: 60,
    });
    assert.equal(result.mode, "live");
    assert.equal(result.id, "resend-test-id");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM = originalFrom;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");
  const body = JSON.parse(String(calls[0].init.body)) as {
    from: string;
    to: string[];
    html: string;
  };
  assert.equal(body.from, "no-reply@duanmar.test");
  assert.deepEqual(body.to, ["live.user@example.test"]);
  assert.ok(body.html.includes("737475"), "the code must be inside the delivered mail body");
  assert.equal(maildropFiles().length, before, "live mode must not write a maildrop file");
});

await check("production without a mail provider fails loudly instead of faking delivery", async () => {
  process.env.NODE_ENV = "production";
  delete process.env.RESEND_API_KEY;
  try {
    await assert.rejects(
      sendPasswordResetEmail({ to: "prod@example.test", code: "848586", expiresInSeconds: 60 }),
      /RESEND_API_KEY/
    );
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

await check("a rejected live send falls back to the maildrop in development, never in production", async () => {
  const before = maildropFiles().length;
  const originalFetch = globalThis.fetch;
  const warnings: string[] = [];
  const originalWarn = console.warn;
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "no-reply@duanmar.test";
  process.env.NODE_ENV = "development";
  globalThis.fetch = (async () =>
    new Response("The duanmar.test domain is not verified", { status: 403 })) as typeof fetch;
  console.warn = (...args: unknown[]) => warnings.push(JSON.stringify(args));

  try {
    const result = await sendPasswordResetEmail({
      to: "fallback.user@example.test",
      code: "919293",
      expiresInSeconds: 60,
    });
    assert.equal(result.mode, "dry-run");
    assert.equal(maildropFiles().length, before + 1);
    const message = maildropFor("fallback.user@example.test");
    assert.equal(message?.code, "919293");
    assert.ok(warnings.length > 0 && warnings.every((line) => !line.includes("919293")));

    // Production: same failure must surface to the caller (route → 502).
    process.env.NODE_ENV = "production";
    const productionMaildropCount = maildropFiles().length;
    await assert.rejects(
      sendPasswordResetEmail({
        to: "prod.fail@example.test",
        code: "313233",
        expiresInSeconds: 60,
      }),
      /not verified|403/
    );
    assert.equal(maildropFiles().length, productionMaildropCount);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM = originalFrom;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

await check("unverified sender domain is classified, not swallowed", async () => {
  const originalFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "no-reply@duanmar.test";
  process.env.NODE_ENV = "production";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        message:
          "The duanmar.test domain is not verified. Please, add and verify your domain on https://resend.com/domains",
        name: "validation_error",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    )) as typeof fetch;

  try {
    await assert.rejects(
      sendPasswordResetEmail({
        to: "unverified@example.test",
        code: "414243",
        expiresInSeconds: 60,
      }),
      (error: unknown) => {
        assert.ok(error instanceof EmailDeliveryError, "expected a typed delivery error");
        assert.equal(error.reason, "sender_domain_unverified");
        assert.equal(error.status, 403);
        assert.match(error.message, /not verified/i);
        assert.match(String(error.providerDetail), /duanmar\.test domain is not verified/);
        assert.ok(!JSON.stringify(error).includes("414243"), "provider error leaked the OTP");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM = originalFrom;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

await check("missing sender is a typed configuration failure", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.NODE_ENV = "production";
  delete process.env.EMAIL_FROM;
  delete process.env.SENDER_EMAIL;
  try {
    await assert.rejects(
      sendPasswordResetEmail({
        to: "config@example.test",
        code: "454647",
        expiresInSeconds: 60,
      }),
      (error: unknown) => {
        assert.ok(error instanceof EmailDeliveryError);
        assert.equal(error.reason, "missing_sender");
        assert.match(error.message, /EMAIL_FROM/);
        return true;
      }
    );
  } finally {
    delete process.env.RESEND_API_KEY;
    delete process.env.SENDER_EMAIL;
    process.env.EMAIL_FROM = originalFrom;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

check("request route surfaces a reason + safe message on dispatch failure", () => {
  const requestRoute = read("src/app/api/auth/password-reset/request/route.ts");
  assert.match(requestRoute, /error: "email_failed"/);
  assert.match(requestRoute, /reason,/);
  assert.match(requestRoute, /failure\?\.message/);
  assert.match(requestRoute, /email_not_configured/);
  assert.match(requestRoute, /hasLiveEmailConfig/);
  assert.match(requestRoute, /providerDetail/);
});

check("recovery UI maps delivery reasons to actionable copy", () => {
  const recovery = read("src/components/auth/password-recovery.tsx");
  for (const key of [
    "emailSenderUnverified",
    "emailAuthFailed",
    "emailNotConfigured",
    "emailSenderInvalid",
    "emailRecipientNotAllowed",
    "emailRateLimited",
    "emailNetworkError",
  ]) {
    assert.match(recovery, new RegExp(key), `missing UI mapping for ${key}`);
  }
  const en = read("src/messages/en.json");
  const vi = read("src/messages/vi.json");
  for (const key of [
    "emailSenderUnverified",
    "emailAuthFailed",
    "emailNotConfigured",
    "emailSenderInvalid",
    "emailRecipientNotAllowed",
    "emailRateLimited",
    "emailNetworkError",
  ]) {
    assert.match(en, new RegExp(`"${key}"`), `missing EN copy for ${key}`);
    assert.match(vi, new RegExp(`"${key}"`), `missing VI copy for ${key}`);
  }
});

check("no OTP preview survives anywhere in the shipped source", () => {
  const steps = read("src/components/auth/password-recovery-steps.tsx");
  const recovery = read("src/components/auth/password-recovery.tsx");
  const requestRoute = read("src/app/api/auth/password-reset/request/route.ts");
  const email = read("src/lib/email/password-reset-email.ts");
  const en = read("src/messages/en.json");
  const vi = read("src/messages/vi.json");

  for (const [name, source] of Object.entries({ steps, recovery, requestRoute, email })) {
    assert.doesNotMatch(source, /previewCode/, `${name} still references previewCode`);
    assert.doesNotMatch(source, /devCode/, `${name} still references devCode`);
  }
  assert.doesNotMatch(en, /"devCode"/);
  assert.doesNotMatch(vi, /"devCode"/);
  // The OTP step renders the countdown + the code INPUT only — nothing that
  // prints a stored code value.
  assert.doesNotMatch(steps, /\{t\("[^"]*code[^"]*", \{ code/, "the OTP step interpolates a code value");
  assert.match(steps, /data-testid="otp-countdown"/);
  assert.doesNotMatch(email, /console\.(info|log|error)\([^)]*\bcode\b(?!_hash)/);
});

check("the request route answers with the expiry only", () => {
  const requestRoute = read("src/app/api/auth/password-reset/request/route.ts");
  assert.match(
    requestRoute,
    /return NextResponse\.json\(\{\s*ok: true,\s*expiresInSeconds: result\.expiresInSeconds,\s*\}\)/
  );
  // `code` may only flow into the email payload — never into control flow or a
  // response body. Failure handling uses the `reason` discriminant.
  assert.equal((requestRoute.match(/result\.code/g) ?? []).length, 1);
  assert.match(requestRoute, /code: result\.code,/);
  assert.doesNotMatch(requestRoute, /result\.reason\s*\)/);
  assert.match(requestRoute, /result\.reason === "db_unavailable"/);
});

rmSync(dir, { recursive: true, force: true });
console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exitCode = 1;
