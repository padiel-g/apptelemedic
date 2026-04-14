export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    let appointments: any[] = [];

    if (user.role === 'doctor') {
      appointments = db.prepare(`
        SELECT a.*,
               u.full_name as patient_name,
               u.email as patient_email
        FROM appointments a
        JOIN patients pt ON a.patient_id = pt.id
        JOIN users u ON pt.user_id = u.id
        WHERE a.doctor_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `).all(user.id);
    } else if (user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id) as any;
      if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
      appointments = db.prepare(`
        SELECT a.*,
               du.full_name as doctor_name
        FROM appointments a
        JOIN users du ON a.doctor_id = du.id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `).all(patient.id);
    } else if (user.role === 'admin') {
      appointments = db.prepare(`
        SELECT a.*,
               pu.full_name as patient_name,
               du.full_name as doctor_name
        FROM appointments a
        JOIN patients pt ON a.patient_id = pt.id
        JOIN users pu ON pt.user_id = pu.id
        JOIN users du ON a.doctor_id = du.id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `).all();
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Appointments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const body = await request.json();
    const { doctor_id, appointment_date, appointment_time, type, reason } = body;

    if (!appointment_date || !appointment_time || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let patientId: number;
    let doctorId: string;

    if (user.role === 'patient') {
      const patient = db.prepare('SELECT id, assigned_doctor_id FROM patients WHERE user_id = ?').get(user.id) as any;
      if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
      patientId = patient.id;
      doctorId = doctor_id || patient.assigned_doctor_id;
      if (!doctorId) return NextResponse.json({ error: 'No doctor assigned' }, { status: 400 });
    } else if (user.role === 'doctor') {
      patientId = body.patient_id;
      doctorId = user.id;
      if (!patientId) return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for conflicts
    const existing = db.prepare(`
      SELECT id FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ('pending', 'confirmed')
    `).get(doctorId, appointment_date, appointment_time);

    if (existing) {
      return NextResponse.json({ error: 'This time slot is already booked' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, reason, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(patientId, doctorId, appointment_date, appointment_time, type, reason || null, now, now);

    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Appointments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
