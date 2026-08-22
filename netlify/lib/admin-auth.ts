import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "memansa_admin";

export function validCredentials(username: string, password: string) {
  try {
    const [salt, expectedHex] = (process.env.ADMIN_PASSWORD_HASH || "").split(":");
    if (!salt || !expectedHex || username !== process.env.ADMIN_USERNAME) return false;
    const actual = scryptSync(password, salt, 32);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

function signature(expires: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "missing-secret")
    .update(expires).digest("hex");
}

export function createSessionCookie() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${COOKIE_NAME}=${expires}.${signature(expires)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function hasValidSession(request: Request) {
  const match = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const [expires, supplied] = match[1].split(".");
  if (!expires || !supplied || Number(expires) <= Date.now()) return false;
  const expected = signature(expires);
  const actualBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
