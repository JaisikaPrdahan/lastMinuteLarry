import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'node:crypto';
import { COOKIE, verifyToken } from './session';

export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) throw new Error('Not signed in');
}
