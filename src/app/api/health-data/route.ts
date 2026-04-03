import { NextResponse } from 'next/server';
import { healthDataSchema } from '@/lib/validators';
import { getQuery, db } from '@/lib/db';
import { Device, Reading } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { isAbnormal } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
    }

    const body = await request.json();
    const result = healthDataSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { device_id, pulse, temperature, oxygen, bp_sys, bp_dia } = result.data;
    
    const device = getQuery<Device>('SELECT * FROM devices WHERE device_id = ? AND is_active = 1', [device_id]);
    if (!device || !device.patient_id) {
      return NextResponse.json({ error: 'Device not found or unassigned' }, { status: 404 });
    }
    
    if (device.api_key !== apiKey) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    const abnormal = isAbnormal({ pulse, temperature, oxygen, bp_sys, bp_dia }) ? 1 : 0;
    
    const insertTransaction = db.transaction(() => {
      const stmt = db.prepare('INSERT INTO readings (patient_id, device_id, pulse, temperature, oxygen, bp_sys, bp_dia, source, is_abnormal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(device.patient_id, device.id, pulse, temperature, oxygen, bp_sys || null, bp_dia || null, 'device', abnormal);
      
      const readingId = info.lastInsertRowid;
      
      if (abnormal === 1) {
         db.prepare('INSERT INTO alerts (patient_id, reading_id, message) VALUES (?, ?, ?)').run(
           device.patient_id, readingId, 'Abnormal device vitals detected'
         );
      }
      
      db.prepare('UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?').run(device.id);
      
      return readingId;
    });

    const readingId = insertTransaction();
    const reading = getQuery<Reading>('SELECT * FROM readings WHERE id = ?', [readingId]);

    return NextResponse.json({ success: true, reading }, { status: 201 });
  } catch (error) {
    console.error('Health Data POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const patientIdParam = searchParams.get('patient_id');
    
    let targetPatientId: number | null = null;

    if (user.role === 'patient') {
      const patient = getQuery<{id: number}>('SELECT id FROM patients WHERE user_id = ?', [user.id]);
      if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
      targetPatientId = patient.id;
    } else {
      if (!patientIdParam) {
        return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
      }
      targetPatientId = parseInt(patientIdParam);
      
      if (user.role === 'doctor') {
        const patient = getQuery<{id: number}>('SELECT id FROM patients WHERE id = ? AND assigned_doctor_id = ?', [targetPatientId, user.id]);
        if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const readings = db.prepare('SELECT * FROM readings WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT ?')
                       .all(targetPatientId, limit) as Reading[];

    return NextResponse.json({ data: readings, total: readings.length });
  } catch (error) {
    console.error('Health Data GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
