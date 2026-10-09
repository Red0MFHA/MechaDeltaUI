/**
 * Signed mock session token. Runs on the server only (route handler and proxy);
 * the browser receives it as an httpOnly cookie and never reads it.
 */

export const SESSION_COOKIE = "md_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionClaims {
  sub: string;
  email: string;
  name?: string;
  exp: number;
}

const encoder = new TextEncoder();

function secret() {
  return process.env.MOCK_SESSION_SECRET || "mechadelta-mock-session-dev-secret";
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function key() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(claims: SessionClaims) {
  const body = toBase64Url(encoder.encode(JSON.stringify(claims)));
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(), encoder.encode(body)),
  );
  return `${body}.${toBase64Url(signature)}`;
}

export async function verifySession(
  token: string | undefined,
  now = Date.now(),
): Promise<SessionClaims | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(),
      fromBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionClaims;
    if (typeof claims.exp !== "number" || claims.exp * 1000 <= now) return null;
    return claims;
  } catch {
    return null;
  }
}

export function userIdForEmail(email: string) {
  let h = 2166136261;
  for (const c of email.toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return `usr-${(h >>> 0).toString(36)}`;
}

export { DEMO_ACCOUNT } from "./demo";
