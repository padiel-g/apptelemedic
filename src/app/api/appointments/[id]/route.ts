export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const appointmentId = params.id;

    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId) as any;
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    if (user.role === 'doctor' && appointment.doctor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id) as any;
      if (!patient || appointment.patient_id !== patient.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (appointment.status !== 'pending') {
        return NextResponse.json({ error: 'Cannot update this appointment' }, { status: 400 });
      }
    }

    const body = await request.json();
    const { status, notes } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(appointmentId);

    db.prepare(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error('Appointment PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
