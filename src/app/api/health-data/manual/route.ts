import { NextRequest, NextResponse } from 'next/server';
import { manualEntrySchema } from '@/lib/validators';
import { getQuery, db } from '@/lib/db';
import { Reading } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { isAbnormal } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    console.log('User auth check:', user?.id, user?.role);
    if (!user || user.role !== 'patient') {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Manual reading request received');
    console.log('Request body:', body);
    const result = manualEntrySchema.safeParse(body);

    if (!result.success) {
      console.log('Validation failed:', result.error.flatten().fieldErrors);
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { pulse, temperature, oxygen, bp_sys, bp_dia, notes } = result.data;

    // Patient lookup
    let patient;
    try {
      patient = await getQuery<{id: number, user_id: number}>('SELECT id, user_id FROM patients WHERE user_id = ?', [user.id]);
      console.log('Patient lookup result:', patient);
    } catch (err: any) {
      return NextResponse.json({ error: 'DB error during patient lookup', details: err.message }, { status: 500 });
    }
    if (!patient) {
      console.log('No patient found for user', user.id);
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    const abnormal = isAbnormal({ pulse, temperature, oxygen, bp_sys, bp_dia }) ? 1 : 0;

    let readingId: number;
    try {
      const insertTransaction = db.transaction(() => {
        const stmt = db.prepare('INSERT INTO readings (patient_id, pulse, temperature, oxygen, bp_sys, bp_dia, source, notes, is_abnormal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');  
        const info = stmt.run(
          patient.id,
          pulse,
          temperature,
          oxygen,
          bp_sys ?? null,
          bp_dia ?? null,
          'manual',
          notes || null,
          abnormal
        );

        const newReadingId = Number(info.lastInsertRowid as bigint);

        console.log('Inserted reading ID:', newReadingId);
        if (abnormal === 1) {
          db.prepare('INSERT INTO alerts (patient_id, reading_id, message) VALUES (?, ?, ?)').run(
            patient.id, newReadingId, 'Abnormal manual vitals recorded'
          );
        }
        return newReadingId;
      });
      console.log('About to execute insert transaction');
      readingId = insertTransaction();
    } catch (err: any) {
      console.error('Insert transaction failed:', err);
      return NextResponse.json({ error: 'Failed to save reading', details: err.message }, { status: 500 });
    }

    let reading;
    try {
      reading = await getQuery<Reading>('SELECT * FROM readings WHERE id = ?', [readingId]);
    } catch (err: any) {
      return NextResponse.json({ error: 'DB error during reading fetch', details: err.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reading }, { status: 201 });
  } catch (error: any) {
    console.error('Manual Health Data POST error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message, stack: error.stack }, { status: 500 });
  }
}
