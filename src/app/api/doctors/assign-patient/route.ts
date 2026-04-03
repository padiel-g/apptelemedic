import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { CONDITION_TO_SPECIALIZATION } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patient_id } = await request.json();
    if (!patient_id) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const patient = db.prepare('SELECT p.id, p.user_id, p.conditions, p.assigned_doctor_id, u.full_name as patient_name FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(patient_id) as any;
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    const previousDoctorId = patient.assigned_doctor_id;

    if (previousDoctorId && previousDoctorId !== user.id) {
      const prevDoctor = db.prepare('SELECT id, full_name, specialization FROM users WHERE id = ?').get(previousDoctorId) as any;
      if (prevDoctor) {
        const primaryCond = (patient.conditions ? patient.conditions.split(',')[0].trim() : '').toLowerCase();
        const mappedSpec = CONDITION_TO_SPECIALIZATION[primaryCond] || 'General Practice';
        if (prevDoctor.specialization === mappedSpec) {
          return NextResponse.json({ error: 'This patient is already assigned to a matching specialist. Contact admin to override.' }, { status: 403 });
        }
      }
    }

    // Assign
    db.prepare('UPDATE patients SET assigned_doctor_id = ? WHERE id = ?').run(user.id, patient.id);

    // Log
    db.prepare('INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, 'patient.assigned', 'patient', patient.id, JSON.stringify({
        doctor_id: user.id,
        doctor_name: user.full_name,
        previous_doctor_id: previousDoctorId
      }));

    // Alert Patient
    const messageContent = `Hello, I am Dr. ${user.full_name}, your new ${user.specialization || 'General Practice'} specialist. I will be monitoring your health. Please don't hesitate to reach out if you have any concerns.`;
    db.prepare('INSERT INTO messages (sender_id, receiver_id, patient_id, doctor_id, content) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, patient.user_id, patient.id, user.id, messageContent);

    // Alert Previous Doctor if exists
    if (previousDoctorId && previousDoctorId !== user.id) {
      const prevMessageContent = `System Alert: Patient ${patient.patient_name} has been reassigned to Dr. ${user.full_name} due to condition routing optimizations.`;
      db.prepare('INSERT INTO messages (sender_id, receiver_id, patient_id, doctor_id, content) VALUES (?, ?, ?, ?, ?)')
        .run(user.id, previousDoctorId, patient.id, previousDoctorId, prevMessageContent);
    }

    const updatedPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient.id);
    return NextResponse.json({ patient: updatedPatient }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patient_id } = await request.json();
    if (!patient_id) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const info = db.prepare('UPDATE patients SET assigned_doctor_id = NULL WHERE id = ? AND assigned_doctor_id = ?').run(patient_id, user.id);
    if (info.changes === 0) {
      return NextResponse.json({ error: 'Patient not assigned to you' }, { status: 403 });
    }

    db.prepare('INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, 'patient.unassigned', 'patient', patient_id, JSON.stringify({ doctor_id: user.id }));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
