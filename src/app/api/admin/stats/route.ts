export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();

    const cnt = (sql: string) => (db.prepare(sql).get() as any)?.count ?? 0;

    const usersCount = cnt('SELECT COUNT(*) as count FROM users');
    const patientsCount = cnt("SELECT COUNT(*) as count FROM users WHERE role = 'patient'");
    const doctorsCount = cnt("SELECT COUNT(*) as count FROM users WHERE role = 'doctor'");
    const devicesCount = cnt('SELECT COUNT(*) as count FROM devices WHERE is_active = 1');
    const readingsCount = cnt('SELECT COUNT(*) as count FROM readings');

    const logs = db.prepare(`
      SELECT al.*, u.full_name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 20
    `).all();

    return NextResponse.json({
      stats: {
        users: usersCount,
        patients: patientsCount,
        doctors: doctorsCount,
        devices: devicesCount,
        readings: readingsCount
      },
      logs
    });
  } catch (error) {
    console.error('Admin stats GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
