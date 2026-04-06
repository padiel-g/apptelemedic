export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getOne, insertOne, updateWhere, query } from '@/lib/db';
import { healthDataSchema } from '@/lib/validators';
import { getCurrentUser } from '@/lib/auth';
import { isAbnormal } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });

    const body = await request.json();
    const result = healthDataSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    
    const { device_id, pulse, temperature, oxygen, bp_sys, bp_dia } = result.data;
    
    const device = getOne('devices', { device_id, is_active: 1 });
    if (!device || !device.patient_id) return NextResponse.json({ error: 'Device not found or unassigned' }, { status: 404 });
    
    if (device.api_key !== apiKey) return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });

    const abnormal = isAbnormal({ pulse, temperature, oxygen, bp_sys, bp_dia: bp_dia || undefined }) ? true : false;
    
    const reading = insertOne('readings', {
      patient_id: device.patient_id,
      device_id: device.id,
      pulse,
      temperature,
      oxygen,
      bp_sys: bp_sys || null,
      bp_dia: bp_dia || null,
      source: 'device',
      is_abnormal: abnormal ? 1 : 0
    });

    if (abnormal) {
       insertOne('alerts', {
         patient_id: device.patient_id,
         reading_id: reading.id,
         message: 'Abnormal device vitals detected'
       });
    }
    updateWhere('devices', { id: device.id }, { last_seen_at: new Date().toISOString() });

    return NextResponse.json({ success: true, reading }, { status: 201 });
  } catch (error) {
    console.error(error);
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
      const patient = getOne('patients', { user_id: user.id });
      if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
      targetPatientId = patient.id;
    } else {
      if (!patientIdParam) return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
      targetPatientId = parseInt(patientIdParam);
      
      if (user.role === 'doctor') {
        const patient = getOne('patients', { id: targetPatientId, assigned_doctor_id: user.id });
        if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const readings = query('SELECT * FROM readings WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT ?', [targetPatientId, limit]);

    return NextResponse.json({ data: readings || [], total: readings?.length || 0 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
