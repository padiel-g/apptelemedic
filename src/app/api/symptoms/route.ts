import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { symptomSchema } from '@/lib/symptomValidators';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const result = symptomSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    const { title, description, severity, body_area, onset_date } = result.data;
    const info = db.prepare(`INSERT INTO symptoms (patient_id, title, description, severity, body_area, onset_date) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(patient.id, title, description, severity, body_area, onset_date);
    return NextResponse.json({ id: info.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error('Symptom POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    let symptoms = [];
    if (user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
      if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      symptoms = db.prepare('SELECT * FROM symptoms WHERE patient_id = ? ORDER BY is_resolved ASC, severity DESC, created_at DESC').all(patient.id);
    } else if (user.role === 'doctor') {
      const patientId = searchParams.get('patient_id');
      if (patientId) {
        symptoms = db.prepare('SELECT * FROM symptoms WHERE patient_id = ? ORDER BY is_resolved ASC, severity DESC, created_at DESC').all(patientId);
      } else {
        // All symptoms for patients assigned to this doctor
        symptoms = db.prepare(`SELECT s.* FROM symptoms s JOIN patients p ON s.patient_id = p.id WHERE p.assigned_doctor_id = ? ORDER BY s.is_resolved ASC, s.severity DESC, s.created_at DESC`).all(user.id);
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ symptoms });
  } catch (error) {
    console.error('Symptom GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
