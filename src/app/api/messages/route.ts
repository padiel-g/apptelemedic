export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { messageSchema } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get('patient_id');
    if (!patientIdParam) return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    const patientId = parseInt(patientIdParam);

    if (user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id) as any;
      if (!patient || patient.id !== patientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (user.role === 'doctor') {
      const patient = db.prepare('SELECT id FROM patients WHERE id = ? AND assigned_doctor_id = ?').get(patientId, user.id) as any;
      if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = db.prepare(`
      SELECT m.*, u.full_name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.patient_id = ?
      ORDER BY m.created_at ASC
    `).all(patientId);

    db.prepare(
      'UPDATE messages SET is_read = 1 WHERE patient_id = ? AND receiver_id = ? AND is_read = 0'
    ).run(patientId, user.id);

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const body = await request.json();
    const result = messageSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });

    const { patient_id, content } = result.data;

    let pid = 0;
    let doctor_id = '';
    let actual_receiver_id = '';

    if (user.role === 'patient') {
      const patient = db.prepare('SELECT id, assigned_doctor_id FROM patients WHERE user_id = ?').get(user.id) as any;
      if (!patient || !patient.assigned_doctor_id) return NextResponse.json({ error: 'No assigned doctor' }, { status: 403 });

      pid = patient.id;
      if (patient_id && patient_id !== pid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      doctor_id = patient.assigned_doctor_id;
      actual_receiver_id = doctor_id;
    } else if (user.role === 'doctor') {
      if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 });
      const patient = db.prepare('SELECT id, user_id, assigned_doctor_id FROM patients WHERE id = ? AND assigned_doctor_id = ?').get(patient_id, user.id) as any;
      if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      pid = patient.id;
      doctor_id = user.id;
      actual_receiver_id = patient.user_id;
    } else {
      return NextResponse.json({ error: 'Admins cannot send patient messages' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, patient_id, doctor_id, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, actual_receiver_id, pid, doctor_id, content, now);

    const inserted = db.prepare(`
      SELECT m.*, u.full_name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(info.lastInsertRowid) as any;

    return NextResponse.json({ success: true, message: inserted }, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
