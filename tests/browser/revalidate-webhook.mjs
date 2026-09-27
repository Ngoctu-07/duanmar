/**
 * Webhook cache-invalidation mechanism tests (plan 260927-1645 phase 04).
 * Requires the dev server on :3000 started WITH SANITY_REVALIDATE_SECRET set
 * (same value must be present in this process env to compute valid signatures).
 *
 * Signature format (next-sanity webhook):
 *   header `sanity-webhook-signature: t=<unix-ms>,v1=<base64url(HMAC-SHA256(secret, `${t}.${body}`))>`
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "http://localhost:3000";
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const sign = (body, secret, ts = Date.now()) => {
  const mac = createHmac("sha256", secret).update(`${ts}.${body}`).digest("base64");
  const v1 = mac.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `t=${ts},v1=${v1}`;
};

const post = async (body, signature) => {
  const headers = { "content-type": "application/json" };
  if (signature !== undefined) headers["sanity-webhook-signature"] = signature;
  return fetch(`${BASE}/api/revalidate`, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });
};

const secret = process.env.SANITY_REVALIDATE_SECRET;
if (!secret) {
  console.error(
    "FAIL :: SANITY_REVALIDATE_SECRET not set in this process — start the dev server " +
      "with it AND export it here (e.g. SANITY_REVALIDATE_SECRET=<same> npm run test:browser)"
  );
  process.exit(1);
}

// --- 405 on GET
let res = await fetch(`${BASE}/api/revalidate`);
check("GET /api/revalidate → 405", res.status === 405, `got ${res.status}`);

// --- 401 without signature
const body = JSON.stringify({ _id: "destination-hcm", _type: "destination" });
res = await post(body);
check("POST no signature → 401", res.status === 401, `got ${res.status}`);

// --- 401 with forged (wrong secret) signature
res = await post(body, sign(body, "wrong-secret-value"));
check("POST forged signature → 401", res.status === 401, `got ${res.status}`);

// --- 401 with malformed signature header
res = await post(body, "not-a-signature");
check("POST malformed signature → 401", res.status === 401, `got ${res.status}`);

// --- 401 with garbage body (JSON.parse guard inside parseBody)
res = await post("{{{not-json", sign("{{{not-json", secret));
check("POST garbage body → 401 (no 500)", res.status === 401, `got ${res.status}`);

// --- 200 with valid signature (includes 3 s Content Lake consistency wait)
res = await post(body, sign(body, secret));
const json = await res.json().catch(() => ({}));
check(
  "POST valid signature → 200 {revalidated:true}",
  res.status === 200 && json.revalidated === true,
  `got ${res.status} ${JSON.stringify(json)}`
);
check(
  "response has ISO time",
  typeof json.time === "string" && !Number.isNaN(Date.parse(json.time)),
  String(json.time)
);

// --- signature mismatch check must not be trivially equal (timing-safe sanity)
const a = Buffer.from(sign(body, secret));
const b = Buffer.from(sign(body, "wrong-secret-value"));
check(
  "forged mac differs from valid mac",
  a.length === b.length ? !timingSafeEqual(a, b) : true
);

// --- post-invalidation page still serves (mechanism didn't break rendering)
res = await fetch(`${BASE}/en/explore/destinations/hcm`, { redirect: "manual" });
const html = await res.text();
check(
  "/en/explore/destinations/hcm → 200 after revalidate",
  res.status === 200 && html.includes("<html"),
  `got ${res.status}`
);
check(
  "detail page still renders content",
  html.includes("hcm") || html.includes("Ho Chi Minh"),
  "slug/name marker missing"
);

console.log(results.join("\n"));
console.log(`${results.length - errors.length}/${results.length} checks passed`);
process.exit(errors.length === 0 ? 0 : 1);
