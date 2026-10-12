/**
 * Shared transport for the API-backed browser suites (plan 261007-2145).
 * Node-side `fetch` with an explicit `vn_visitor` cookie header (deterministic
 * per-file UUIDs live in each suite file, so crashed-run rows stay deletable),
 * plus jar helpers for reusing the browser's own cookie in batch assertions.
 */

const V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function apiRequest(
  origin,
  path,
  { method = "GET", cookie = null, body = undefined } = {}
) {
  const headers = {};
  if (cookie) headers.Cookie = `vn_visitor=${cookie}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${origin}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  return { status: response.status, json, setCookies };
}

/** Extract the visitor id a route just minted via Set-Cookie (null when absent). */
export function visitorIdFromSetCookie(setCookies) {
  for (const entry of setCookies ?? []) {
    const match = entry.match(/(?:^|;\s*)vn_visitor=([^;]*)/);
    if (match && V4_RE.test(match[1])) return match[1];
  }
  return null;
}

/** Assert the `vn_visitor` Set-Cookie attributes (Secure reported, not required in dev). */
export function checkVisitorCookie(setCookies) {
  const entry = (setCookies ?? []).find((line) => line.startsWith("vn_visitor="));
  if (!entry) return { ok: false, detail: "no vn_visitor Set-Cookie", visitor: null };
  const visitor = visitorIdFromSetCookie([entry]);
  const missing = [];
  if (!visitor) missing.push("valid-uuid");
  if (!/httponly/i.test(entry)) missing.push("HttpOnly");
  if (!/path=\//i.test(entry)) missing.push("Path=/");
  if (!/samesite=lax/i.test(entry)) missing.push("SameSite=Lax");
  return {
    ok: missing.length === 0,
    detail: `${entry}${missing.length ? ` :: missing ${missing.join(",")}` : ""}`,
    visitor,
  };
}

/** Stamp the fixed visitor cookie into the browser jar before the first navigation. */
export async function setPageVisitorCookie(page, value, origin) {
  await page.setCookie({
    name: "vn_visitor",
    value,
    url: `${origin}/`,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
}

/** Reuse the browser jar's cookies as a Node `Cookie` header (batch-GET assertions). */
export async function pageCookieHeader(page) {
  const jar = await page.cookies();
  return jar.map((entry) => `${entry.name}=${entry.value}`).join("; ");
}

/** GET /api/reviews?slug= — parsed body (caller asserts on rows/aggregate). */
export async function listSlugReviews(origin, slug, cookie) {
  return apiRequest(origin, `/api/reviews?slug=${encodeURIComponent(slug)}`, { cookie });
}

/** DELETE one review reference; tolerant (404/403) so pre-clean never throws. */
export async function deleteReviewRef(origin, reference, cookie) {
  try {
    const result = await apiRequest(
      origin,
      `/api/reviews/${encodeURIComponent(reference)}`,
      { method: "DELETE", cookie }
    );
    return result.status;
  } catch {
    return -1;
  }
}

/** Best-effort pre/post-clean of every reference; returns remaining statuses. */
export async function cleanupReviewRefs(origin, references, cookie) {
  const leftovers = [];
  for (const reference of references) {
    const status = await deleteReviewRef(origin, reference, cookie);
    if (status !== 200 && status !== 404 && status !== 403) leftovers.push({ reference, status });
  }
  return leftovers;
}

/** GET /api/ratings?slugs= — batch AVG/COUNT aggregates. */
export async function getRatings(origin, slugs) {
  return apiRequest(origin, `/api/ratings?slugs=${encodeURIComponent(slugs.join(","))}`);
}

/** POST one like toggle for a visitor (cookie null = fresh visitor). */
export async function postLikeToggle(origin, slug, cookie) {
  return apiRequest(origin, `/api/articles/${encodeURIComponent(slug)}/like`, {
    method: "POST",
    cookie,
  });
}

/** GET /api/articles/likes?slugs= — `{counts, liked}` for one visitor. */
export async function getLikesBatch(origin, slugs, cookieHeader) {
  const headers = cookieHeader ? { Cookie: cookieHeader } : {};
  const response = await fetch(
    `${origin}/api/articles/likes?slugs=${encodeURIComponent(slugs.join(","))}`,
    { headers }
  );
  return { status: response.status, json: await response.json().catch(() => null) };
}
