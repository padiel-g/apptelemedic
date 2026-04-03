import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { appointmentUpdateSchema } from '@/lib/appointmentValidators';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const appointmentId = parseInt(params.id);
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId) as any;
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    // Only doctor or patient can update
    if (user.role === 'doctor' && appointment.doctor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id) as any;
      if (!patient || appointment.patient_id !== patient.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      // Patient can only cancel if pending
      if (appointment.status !== 'pending') return NextResponse.json({ error: 'Cannot update this appointment' }, { status: 400 });
    }
    const body = await request.json();
    const result = appointmentUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    const updateFields = result.data;
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    const setClause = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updateFields);
    db.prepare(`UPDATE appointments SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, appointmentId);
    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error('Appointment PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
