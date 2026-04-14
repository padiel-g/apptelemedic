export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // If patient, attach profile + assigned doctor info
    if (user.role === 'patient') {
      const db = getDb();
      const row = db.prepare(`
        SELECT p.*, doc.full_name as doctor_name, doc.specialization as doctor_spec
        FROM patients p
        LEFT JOIN users doc ON p.assigned_doctor_id = doc.id
        WHERE p.user_id = ?
      `).get(user.id) as any;

      console.log('[auth/me] Patient profile row:', row);

      return NextResponse.json({
        user: {
          ...user,
          patient: row ? {
            id: row.id,
            assigned_doctor_id: row.assigned_doctor_id,
            conditions: row.conditions,
            blood_type: row.blood_type,
            doctor_name: row.doctor_name || null,
            doctor_spec: row.doctor_spec || null,
          } : null,
        },
      }, { status: 200 });
    }
    
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
