/**
 * Auth simples: JWT assinado com AUTH_SECRET, gravado em cookie httpOnly.
 * Sem libs pesadas — só `jose` (nativo edge).
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-CHANGE-IN-PROD",
);
const COOKIE_NAME = "wp_session";
const ALG = "HS256";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export type Session = { userId: string; handle: string };

export async function createSession(payload: Session) {
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);

  const c = await cookies();
  c.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { userId: String(payload.userId), handle: String(payload.handle) };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
