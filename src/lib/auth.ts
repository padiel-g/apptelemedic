import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, User } from '@/types';
import { getQuery } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod');

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
  } catch (error) {
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

  const user = getQuery<User>('SELECT * FROM users WHERE id = ? AND is_active = 1', [payload.userId]);
  if (user) {
    const { password_hash, ...userWithoutPassword } = user as any;
    if (user.role === 'patient') {
      const patientData = getQuery<any>(`
        SELECT p.*, u.full_name as doctor_name, u.specialization as doctor_spec 
        FROM patients p 
        LEFT JOIN users u ON p.assigned_doctor_id = u.id 
        WHERE p.user_id = ?
      `, [user.id]);
      if (patientData) {
        userWithoutPassword.patient = patientData;
      }
    }
    return userWithoutPassword as User;
  }
  
  return null;
}
