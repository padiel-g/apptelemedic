export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'doctor') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { patient_id } = await request.json();
    if (!patient_id) return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });

    const db = getDb();

    const patient = db.prepare(`
      SELECT p.id, p.user_id, p.conditions, p.assigned_doctor_id, u.full_name as patient_name
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(patient_id) as any;

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    // Assign the patient to this doctor
    db.prepare('UPDATE patients SET assigned_doctor_id = ? WHERE id = ?').run(user.id, patient.id);

    // Audit log
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
      VALUES (?, 'patient.assigned', 'patient', ?, ?, ?)
    `).run(user.id, patient.id, JSON.stringify({ doctor_id: user.id, doctor_name: user.full_name, previous_doctor_id: patient.assigned_doctor_id }), now);

    // Send welcome message
    const messageContent = `Hello, I am Dr. ${user.full_name}, your new ${user.specialization || 'General Practice'} specialist. I will be monitoring your health. Please don't hesitate to reach out if you have any concerns.`;
    db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, patient_id, doctor_id, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, patient.user_id, patient.id, user.id, messageContent, now);

    const updatedPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient.id);
    return NextResponse.json({ patient: updatedPatient }, { status: 200 });
  } catch (err: any) {
    console.error('Assign patient error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'doctor') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { patient_id } = await request.json();
    if (!patient_id) return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });

    const db = getDb();

    const currentPatient = db.prepare('SELECT id, assigned_doctor_id FROM patients WHERE id = ?').get(patient_id) as any;
    if (!currentPatient || currentPatient.assigned_doctor_id !== user.id) {
      return NextResponse.json({ error: 'Patient not assigned to you' }, { status: 403 });
    }

    db.prepare('UPDATE patients SET assigned_doctor_id = NULL WHERE id = ?').run(patient_id);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
      VALUES (?, 'patient.unassigned', 'patient', ?, ?, ?)
    `).run(user.id, patient_id, JSON.stringify({ doctor_id: user.id }), now);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Unassign patient error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
