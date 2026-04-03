import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { appointmentSchema } from '@/lib/appointmentValidators';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const result = appointmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    const patient = db.prepare('SELECT id, assigned_doctor_id FROM patients WHERE user_id = ?').get(user.id);
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    const doctor_id = result.data.doctor_id || patient.assigned_doctor_id;
    if (!doctor_id) return NextResponse.json({ error: 'No assigned doctor' }, { status: 400 });
    // Prevent double-booking
    const exists = db.prepare('SELECT 1 FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ("pending", "confirmed")').get(doctor_id, result.data.appointment_date, result.data.appointment_time);
    if (exists) return NextResponse.json({ error: 'Doctor already booked for this slot' }, { status: 409 });
    const info = db.prepare(`INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, reason) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(patient.id, doctor_id, result.data.appointment_date, result.data.appointment_time, result.data.type, result.data.reason);
    return NextResponse.json({ id: info.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error('Appointment POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    let appointments = [];
    if (user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
      if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      appointments = db.prepare('SELECT a.*, u.full_name as doctor_name FROM appointments a JOIN users u ON a.doctor_id = u.id WHERE a.patient_id = ? ORDER BY a.appointment_date DESC, a.appointment_time DESC').all(patient.id);
    } else if (user.role === 'doctor') {
      appointments = db.prepare('SELECT a.*, p.full_name as patient_name FROM appointments a JOIN patients pt ON a.patient_id = pt.id JOIN users p ON pt.user_id = p.id WHERE a.doctor_id = ? ORDER BY a.appointment_date DESC, a.appointment_time DESC').all(user.id);
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Appointment GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
