export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'doctor') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const appointmentId = params.id;
    const body = await request.json();
    const { action, reason, notes, new_date, new_time } = body;

    const appointment = db.prepare(`
      SELECT a.*, pt.user_id as patient_user_id
      FROM appointments a
      JOIN patients pt ON a.patient_id = pt.id
      WHERE a.id = ?
    `).get(appointmentId) as any;

    if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (appointment.doctor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date().toISOString();

    const sendMessage = (content: string) => {
      db.prepare(`
        INSERT INTO messages (sender_id, receiver_id, patient_id, doctor_id, content, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user.id, appointment.patient_user_id, appointment.patient_id, user.id, content, now);
    };

    const logAudit = (details: string) => {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
        VALUES (?, 'appointment_response', 'appointment', ?, ?, ?)
      `).run(user.id, appointmentId, details, now);
    };

    let newStatus = '';

    switch (action) {
      case 'confirm':
        newStatus = 'confirmed';
        db.prepare('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, appointmentId);
        sendMessage(`Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been confirmed by Dr. ${user.full_name}.`);
        logAudit('Confirmed appointment');
        break;

      case 'decline':
        if (!reason) return NextResponse.json({ error: 'Reason required to decline' }, { status: 400 });
        newStatus = 'declined';
        db.prepare('UPDATE appointments SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(newStatus, reason, now, appointmentId);
        sendMessage(`Your appointment request for ${appointment.appointment_date} at ${appointment.appointment_time} was declined by Dr. ${user.full_name}. Reason: ${reason}`);
        logAudit(`Declined appointment: ${reason}`);
        break;

      case 'reschedule':
        if (!new_date || !new_time) return NextResponse.json({ error: 'New date and time required' }, { status: 400 });
        const existing = db.prepare(`
          SELECT id FROM appointments
          WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ('pending', 'confirmed')
        `).get(user.id, new_date, new_time);
        if (existing) return NextResponse.json({ error: 'Doctor already booked for this slot' }, { status: 409 });

        newStatus = 'rescheduled';
        db.prepare('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, appointmentId);
        db.prepare(`
          INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, reason, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).run(appointment.patient_id, user.id, new_date, new_time, appointment.type, appointment.reason, now, now);

        sendMessage(`Dr. ${user.full_name} has rescheduled your appointment from ${appointment.appointment_date} ${appointment.appointment_time} to ${new_date} ${new_time}. Please confirm.`);
        logAudit(`Rescheduled appointment from ${appointment.appointment_date} to ${new_date}`);
        break;

      case 'complete':
        newStatus = 'completed';
        const finalNotes = notes || appointment.notes;
        db.prepare('UPDATE appointments SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(newStatus, finalNotes || null, now, appointmentId);
        sendMessage(`Your appointment on ${appointment.appointment_date} has been marked as completed by Dr. ${user.full_name}.`);
        logAudit('Completed appointment');
        break;

      case 'cancel':
        if (!reason) return NextResponse.json({ error: 'Reason required to cancel' }, { status: 400 });
        newStatus = 'cancelled';
        db.prepare('UPDATE appointments SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(newStatus, reason, now, appointmentId);
        sendMessage(`Your appointment on ${appointment.appointment_date} has been cancelled by Dr. ${user.full_name}. Reason: ${reason}`);
        logAudit(`Cancelled appointment: ${reason}`);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('Appointment respond error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
