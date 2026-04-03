import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;
    const body = await request.json();
    const { action, reason, notes, new_date, new_time } = body;

    const appointment = db.prepare('SELECT a.*, p.user_id as patient_user_id, u.full_name as patient_name FROM appointments a JOIN patients p ON a.patient_id = p.id JOIN users u ON p.user_id = u.id WHERE a.id = ?').get(appointmentId) as any;
    
    if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (appointment.doctor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Helper to send message
    const sendMessage = (content: string) => {
       db.prepare(`INSERT INTO messages (sender_id, receiver_id, patient_id, doctor_id, content) VALUES (?, ?, ?, ?, ?)`)
         .run(user.id, appointment.patient_user_id, appointment.patient_id, user.id, content);
    };

    // Helper to log audit
    const logAudit = (details: string) => {
       db.prepare(`INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)`)
         .run(user.id, 'appointment_response', 'appointment', appointmentId, details);
    };

    let newStatus = '';
    
    switch (action) {
      case 'confirm':
        newStatus = 'confirmed';
        db.prepare(`UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(newStatus, appointmentId);
        sendMessage(`Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been confirmed by Dr. ${user.full_name}.`);
        logAudit('Confirmed appointment');
        break;

      case 'decline':
        if (!reason) return NextResponse.json({ error: 'Reason required to decline' }, { status: 400 });
        newStatus = 'declined';
        db.prepare(`UPDATE appointments SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(newStatus, reason, appointmentId);
        sendMessage(`Your appointment request for ${appointment.appointment_date} at ${appointment.appointment_time} was declined by Dr. ${user.full_name}. Reason: ${reason}`);
        logAudit(`Declined appointment: ${reason}`);
        break;

      case 'reschedule':
        if (!new_date || !new_time) return NextResponse.json({ error: 'New date and time required' }, { status: 400 });
        const exists = db.prepare('SELECT 1 FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ("pending", "confirmed")').get(user.id, new_date, new_time);
        if (exists) return NextResponse.json({ error: 'Doctor already booked for this slot' }, { status: 409 });
        
        newStatus = 'rescheduled';
        db.transaction(() => {
          db.prepare(`UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newStatus, appointmentId);
          db.prepare(`INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(appointment.patient_id, user.id, new_date, new_time, appointment.type, appointment.reason, 'pending');
        })();
        sendMessage(`Dr. ${user.full_name} has rescheduled your appointment from ${appointment.appointment_date} ${appointment.appointment_time} to ${new_date} ${new_time}. Please confirm.`);
        logAudit(`Rescheduled appointment from ${appointment.appointment_date} to ${new_date}`);
        break;

      case 'complete':
        newStatus = 'completed';
        const finalNotes = notes || appointment.notes;
        db.prepare(`UPDATE appointments SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(newStatus, finalNotes || null, appointmentId);
        sendMessage(`Your appointment on ${appointment.appointment_date} has been marked as completed by Dr. ${user.full_name}.`);
        logAudit(`Completed appointment`);
        break;

      case 'cancel':
        if (!reason) return NextResponse.json({ error: 'Reason required to cancel' }, { status: 400 });
        newStatus = 'cancelled';
        db.prepare(`UPDATE appointments SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(newStatus, reason, appointmentId);
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
