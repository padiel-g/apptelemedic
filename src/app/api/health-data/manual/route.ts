export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { manualEntrySchema } from '@/lib/validators';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isAbnormal } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const body = await request.json();
    const result = manualEntrySchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const { pulse, temperature, oxygen, bp_sys, bp_dia, notes } = result.data;

    const patient = db.prepare('SELECT id, user_id FROM patients WHERE user_id = ?').get(user.id) as any;
    if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });

    const abnormal = isAbnormal({ pulse, temperature, oxygen, bp_sys, bp_dia: bp_dia || undefined }) ? 1 : 0;

    const info = db.prepare(`
      INSERT INTO readings (patient_id, pulse, temperature, oxygen, bp_sys, bp_dia, source, notes, is_abnormal)
      VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?)
    `).run(patient.id, pulse, temperature, oxygen, bp_sys ?? null, bp_dia ?? null, notes || null, abnormal);

    const reading = db.prepare('SELECT * FROM readings WHERE id = ?').get(info.lastInsertRowid);

    if (abnormal) {
      db.prepare(`
        INSERT INTO alerts (patient_id, reading_id, message)
        VALUES (?, ?, 'Abnormal manual vitals recorded')
      `).run(patient.id, info.lastInsertRowid);
    }

    return NextResponse.json({ success: true, reading }, { status: 201 });
  } catch (error: any) {
    console.error('Manual entry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
