import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { patientProfileUpdateSchema } from '@/lib/validators';
import { findBestDoctorForCondition } from '@/lib/doctorAssignment';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = getDb();
    const patient = db.prepare(`
      SELECT p.*, u.full_name, u.email, u.id as user_id,
             doc.full_name as doctor_name, doc.specialization as doctor_spec
      FROM patients p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users doc ON p.assigned_doctor_id = doc.id
      WHERE p.user_id = ?
    `).get(user.id) as any;
    if (!patient) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    console.log('[patients/profile] Assigned doctor:', patient.doctor_name, patient.assigned_doctor_id);
    return NextResponse.json({ profile: patient });
  } catch (error) {
    console.error('Patient profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = getDb();
    const body = await request.json();
    const result = patientProfileUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    const updateFields = result.data;
    // Update patient profile
    const setClause = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updateFields);
    if (setClause) {
      db.prepare(`UPDATE patients SET ${setClause} WHERE user_id = ?`).run(...values, user.id);
    }
    // Doctor assignment logic (if conditions updated)
    if (updateFields.conditions) {
      const cond = updateFields.conditions.split(',')[0]?.trim().toLowerCase();
      const doctor = findBestDoctorForCondition(cond);
      db.prepare('UPDATE patients SET assigned_doctor_id = ? WHERE user_id = ?').run(doctor ? doctor.id : null, user.id);
    }
    const updated = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(user.id);
    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('Patient profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
