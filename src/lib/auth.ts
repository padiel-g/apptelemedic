import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, User } from '@/types';
import { getDb } from '@/lib/db'; // ✅ FIX: import getDb() instead of broken supabase alias

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod'
);

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/);
  return match ? match[2] : null;
}

export async function getCurrentUser(request: Request): Promise<User | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return null;

  // ✅ FIX: use getDb() directly — the old `supabase` export was removed from db.ts
  const db = getDb();
  const user = db
    .prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
    .get(payload.userId) as User | undefined;

  if (!user) return null;

  // ✅ Never expose the password hash to the client
  const { password_hash, ...safeUser } = user as any;
  return safeUser as User;
}