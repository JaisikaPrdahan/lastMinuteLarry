// Edge-safe session helpers (used by the proxy and by server code).
import { SignJWT, jwtVerify } from 'jose';

export const COOKIE = 'tracker_session';
export const SESSION_DAYS = 60;

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET || '');

export function sessionConfigured(): boolean {
  return !!process.env.APP_PASSWORD && (process.env.SESSION_SECRET || '').length >= 32;
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('owner')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function verifyToken(token?: string | null): Promise<boolean> {
  if (!token || (process.env.SESSION_SECRET || '').length < 32) return false;
  try {
    await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}
