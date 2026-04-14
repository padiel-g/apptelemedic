export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { userUpdateSchema, patientUpdateSchema } from '@/lib/validators';

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const targetUserId = params.userId;
    const body = await request.json();
    const userResult = userUpdateSchema.safeParse(body);
    const patientResult = patientUpdateSchema.safeParse(body);

    if (!userResult.success || !patientResult.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const activeCheck: any = userResult.data.is_active;
    if (activeCheck !== undefined && (activeCheck === false || activeCheck === 0) && targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    const isPatient = targetUser.role === 'patient';
    let targetPatientId: number | null = null;

    if (isPatient && Object.keys(patientResult.data).length > 0) {
      const pData = db.prepare('SELECT id, assigned_doctor_id FROM patients WHERE user_id = ?').get(targetUserId) as any;
      if (!pData) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      targetPatientId = pData.id;
    }

    // Update users table
    const userUpdates = { ...userResult.data } as Record<string, any>;
    if (userUpdates.is_active !== undefined) userUpdates.is_active = userUpdates.is_active ? 1 : 0;
    const userKeys = Object.keys(userUpdates);
    if (userKeys.length > 0) {
      const setClause = userKeys.map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...Object.values(userUpdates), targetUserId);
    }

    // Update patients table
    if (isPatient && targetPatientId && Object.keys(patientResult.data).length > 0) {
      const pKeys = Object.keys(patientResult.data);
      const pSetClause = pKeys.map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE patients SET ${pSetClause} WHERE id = ?`).run(...Object.values(patientResult.data), targetPatientId);

      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
        VALUES (?, 'patient.updated', 'patient', ?, ?, ?)
      `).run(user.id, String(targetPatientId), JSON.stringify(patientResult.data), now);
    }

    const updatedUser = db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?').get(targetUserId) as any;
    let updatedPatient = null;
    if (isPatient) {
      updatedPatient = db.prepare('SELECT assigned_doctor_id, conditions FROM patients WHERE user_id = ?').get(targetUserId) as any;
    }

    return NextResponse.json({ user: { ...updatedUser, ...(updatedPatient && { patient: updatedPatient }) } });
  } catch (error) {
    console.error('Admin user PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const targetUserId = params.userId;
    if (targetUserId === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(targetUserId);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, target_type, target_id, created_at)
      VALUES (?, 'user.deleted', 'user', ?, ?)
    `).run(user.id, targetUserId, now);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
