import type { NextResponse } from "next/server";

/**
 * Anonymous visitor identity: `vn_visitor` HttpOnly UUID-v4 cookie.
 * Only route handlers may ISSUE it (RSC `cookies()` is read-only);
 * pages/RSC just validate what is already there. Never logged, never
 * returned in JSON bodies.
 */

export const VISITOR_COOKIE = "vn_visitor";

const V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const ONE_YEAR_SECONDS = 31_536_000;

type CookieReader = { get(name: string): { value: string } | undefined };

export type VisitorSource =
  | { cookies: CookieReader }
  | { headers: Headers }
  | CookieReader;

export function isValidVisitor(value: unknown): value is string {
  return typeof value === "string" && V4_PATTERN.test(value);
}

export function newVisitorId(): string {
  return crypto.randomUUID();
}

export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  };
}

function cookieFromHeader(header: string | null | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq !== -1 && part.slice(0, eq).trim() === VISITOR_COOKIE) {
      return part.slice(eq + 1).trim();
    }
  }
  return undefined;
}

function rawVisitor(source: VisitorSource): string | undefined {
  if ("cookies" in source) return source.cookies.get(VISITOR_COOKIE)?.value;
  if ("headers" in source) return cookieFromHeader(source.headers.get("cookie"));
  return source.get(VISITOR_COOKIE)?.value;
}

/** Valid v4 id from a NextRequest / plain Request / cookie store, else null. */
export function readVisitor(source: VisitorSource): string | null {
  const raw = rawVisitor(source);
  return isValidVisitor(raw) ? raw : null;
}

/** Returns the still-valid id, otherwise mints one and sets it on `response`. */
export function issueVisitor(response: NextResponse, current?: string | null): string {
  if (isValidVisitor(current)) return current;
  const id = newVisitorId();
  response.cookies.set(VISITOR_COOKIE, id, visitorCookieOptions());
  return id;
}
