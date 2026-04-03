import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const users = db.prepare("SELECT count(*) as c FROM users").get() as any;
    const patients = db.prepare("SELECT count(*) as c FROM users WHERE role='patient'").get() as any;
    const doctors = db.prepare("SELECT count(*) as c FROM users WHERE role='doctor'").get() as any;
    const devices = db.prepare("SELECT count(*) as c FROM devices WHERE is_active=1").get() as any;
    const readings = db.prepare("SELECT count(*) as c FROM readings").get() as any;
    
    const logs = db.prepare("SELECT l.*, u.full_name as user_name FROM audit_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 20").all();

    return NextResponse.json({
      stats: {
        users: users.c,
        patients: patients.c,
        doctors: doctors.c,
        devices: devices.c,
        readings: readings.c
      },
      logs
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
