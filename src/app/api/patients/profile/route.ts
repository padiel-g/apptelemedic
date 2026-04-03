
import { patientProfileUpdateSchema } from '@/lib/validators';
import { findBestDoctorForCondition } from '@/lib/doctorAssignment';

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
    const updated = getQuery<any>(`SELECT * FROM patients WHERE user_id = ?`, [user.id]);
    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('Patient profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, getQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const patient = getQuery<any>(
      `SELECT p.*, u.full_name, u.email, u.id as user_id FROM patients p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?`,
      [user.id]
    );
    if (!patient) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json({ profile: patient });
  } catch (error) {
    console.error('Patient profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
