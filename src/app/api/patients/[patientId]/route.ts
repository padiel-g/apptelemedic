import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, getQuery } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { patientId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const patientId = parseInt(params.patientId);

    const patient = getQuery<any>(`
      SELECT p.*, u.full_name, u.email 
      FROM patients p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `, [patientId]);

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    if (user.role === 'patient' && patient.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (user.role === 'doctor' && patient.assigned_doctor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const readings = db.prepare('SELECT * FROM readings WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 20').all(patientId);

    return NextResponse.json({
      patient: {
        ...patient,
        user: { id: patient.user_id, full_name: patient.full_name, email: patient.email }
      },
      readings
    });
  } catch (error) {
    console.error('Patient details GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
