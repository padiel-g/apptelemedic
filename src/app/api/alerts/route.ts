export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get('resolved') === 'true' ? 1 : 0;

    let sql = `
      SELECT a.*, p.user_id as patient_user_id, u.full_name as patient_name
      FROM alerts a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.is_resolved = ?
    `;
    const params: any[] = [resolved];

    if (user.role === 'doctor') {
      sql += ' AND p.assigned_doctor_id = ?';
      params.push(user.id);
    } else if (user.role === 'patient') {
      sql += ' AND p.user_id = ?';
      params.push(user.id);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT 50';

    const alerts = db.prepare(sql).all(...params);

    return NextResponse.json({ data: alerts });
  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
