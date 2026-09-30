const SESSION_COOKIE = "prioriza_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function toBase64Url(value: string) {
  return btoa(value).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
}

async function sign(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado.");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createSession(email: string) {
  const payload = toBase64Url(JSON.stringify({ email, exp: Date.now() + SESSION_MAX_AGE * 1000 }));
  const signature = await sign(payload);
  return { value: `${payload}.${signature}`, maxAge: SESSION_MAX_AGE };
}

export async function verifySession(value?: string | null) {
  if (!value) return false;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;

  try {
    const expected = await sign(payload);
    if (expected !== signature) return false;

    const data = JSON.parse(fromBase64Url(payload)) as { email?: string; exp?: number };
    return Boolean(data.email && data.exp && data.exp > Date.now());
  } catch {
    return false;
  }
}

export function getAuthEmail() {
  return process.env.AUTH_EMAIL?.trim().toLowerCase() ?? "";
}

export async function hashPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function authenticate(email: string, password: string) {
  const expectedEmail = getAuthEmail();
  const expectedHash = process.env.AUTH_PASSWORD_HASH;

  if (!expectedEmail || !expectedHash) return false;

  const passwordHash = await hashPassword(password);
  return email.trim().toLowerCase() === expectedEmail && passwordHash === expectedHash;
}

export const authCookieName = SESSION_COOKIE;
