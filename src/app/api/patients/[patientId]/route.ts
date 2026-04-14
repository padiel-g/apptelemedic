export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { patientId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const patientId = parseInt(params.patientId);

    const patient = db.prepare(`
      SELECT p.*, u.full_name as user_full_name, u.email as user_email
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(patientId) as any;

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    if (user.role === 'patient' && patient.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role === 'doctor' && patient.assigned_doctor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const readings = db.prepare(
      'SELECT * FROM readings WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 20'
    ).all(patientId);

    return NextResponse.json({
      patient: {
        ...patient,
        user: { id: patient.user_id, full_name: patient.user_full_name, email: patient.user_email }
      },
      readings: readings || []
    });
  } catch (error) {
    console.error('Patient details GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
