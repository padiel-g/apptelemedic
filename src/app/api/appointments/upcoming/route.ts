import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const today = new Date().toISOString().slice(0, 10);
    let appointments = [];
    if (user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
      if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      appointments = db.prepare('SELECT a.*, u.full_name as doctor_name FROM appointments a JOIN users u ON a.doctor_id = u.id WHERE a.patient_id = ? AND a.appointment_date >= ? AND a.status IN ("pending", "confirmed") ORDER BY a.appointment_date ASC, a.appointment_time ASC LIMIT 5').all(patient.id, today);
    } else if (user.role === 'doctor') {
      appointments = db.prepare('SELECT a.*, p.full_name as patient_name FROM appointments a JOIN patients pt ON a.patient_id = pt.id JOIN users p ON pt.user_id = p.id WHERE a.doctor_id = ? AND a.appointment_date >= ? AND a.status IN ("pending", "confirmed") ORDER BY a.appointment_date ASC, a.appointment_time ASC LIMIT 5').all(user.id, today);
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Upcoming appointments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
