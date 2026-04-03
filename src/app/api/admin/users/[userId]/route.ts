import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, getQuery } from '@/lib/db';
import { userUpdateSchema } from '@/lib/validators';
import { patientUpdateSchema } from '@/lib/validators';

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUserId = parseInt(params.userId);
    const body = await request.json();
    const userResult = userUpdateSchema.safeParse(body);
    const patientResult = patientUpdateSchema.safeParse(body);
    
    if (!userResult.success || !patientResult.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: {
          user: userResult.error ? userResult.error.flatten().fieldErrors : {},
          patient: patientResult.error ? patientResult.error.flatten().fieldErrors : {}
        } 
      }, { status: 400 });
    }

    const targetUser = getQuery<any>('SELECT * FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userResult.data.is_active !== undefined && userResult.data.is_active === 0 && targetUserId === user.id) {
       return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    // Check if patient exists for patient updates
    const isPatient = targetUser.role === 'patient';
    let targetPatient: any = null;
    if (isPatient && (patientResult.data.assigned_doctor_id !== undefined || Object.keys(patientResult.data).length > 0)) {
      targetPatient = getQuery('SELECT id, assigned_doctor_id FROM patients WHERE user_id = ?', [targetUserId]);
      if (!targetPatient) {
        return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
      }
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    // User updates
    for (const [key, value] of Object.entries(userResult.data)) {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    // Patient updates
    const patientUpdateFields: string[] = [];
    const patientUpdateValues: any[] = [];
    for (const [key, value] of Object.entries(patientResult.data)) {
      if (value !== undefined) {
        patientUpdateFields.push(`${key} = ?`);
        patientUpdateValues.push(value);
      }
    }

    if (updateFields.length > 0) {
      updateValues.push(targetUserId);
      db.transaction(() => {
        db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
      })();
    }

    // Update patient if applicable
    if (isPatient && patientUpdateFields.length > 0) {
      patientUpdateValues.push(targetPatient.id);
      db.transaction(() => {
        db.prepare(`UPDATE patients SET ${patientUpdateFields.join(', ')} WHERE id = ?`).run(...patientUpdateValues);
        
        db.prepare('INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)')
          .run(user.id, 'patient.updated', 'patient', targetPatient.id, JSON.stringify(patientResult.data));
      })();
    }

    const updatedUser = getQuery('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?', [targetUserId]) as any;
    let updatedPatient: any = null;
    if (isPatient) {
      updatedPatient = getQuery('SELECT assigned_doctor_id, condition FROM patients WHERE user_id = ?', [targetUserId]);
    }

    const updated = {
      ...updatedUser,
      ...(updatedPatient && { patient: updatedPatient })
    };

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Admin user PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUserId = parseInt(params.userId);

    if (targetUserId === user.id) {
       return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    db.transaction(() => {
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(targetUserId);
      db.prepare('INSERT INTO audit_logs (user_id, action, target_type, target_id) VALUES (?, ?, ?, ?)')
        .run(user.id, 'user.deleted', 'user', targetUserId);
    })();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
