export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { userUpdateSchema, patientUpdateSchema } from '@/lib/validators';

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const targetUserId = parseInt(params.userId);
    const body = await request.json();
    const userResult = userUpdateSchema.safeParse(body);
    const patientResult = patientUpdateSchema.safeParse(body);
    
    if (!userResult.success || !patientResult.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { data: targetUser } = await supabase.from('users').select('*').eq('id', targetUserId).maybeSingle();
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const activeCheck: any = userResult.data.is_active;
    if (activeCheck !== undefined && (activeCheck === false || activeCheck === 0) && targetUserId === user.id) {
       return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    const isPatient = targetUser.role === 'patient';
    let targetPatientId = null;

    if (isPatient && (patientResult.data.assigned_doctor_id !== undefined || Object.keys(patientResult.data).length > 0)) {
       const { data: pData } = await supabase.from('patients').select('id, assigned_doctor_id').eq('user_id', targetUserId).maybeSingle();
       if (!pData) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
       targetPatientId = pData.id;
    }

    if (Object.keys(userResult.data).length > 0) {
       const updates: Record<string, any> = { ...userResult.data };
       // handle is_active correctly as boolean for PG
       if (updates.is_active !== undefined) updates.is_active = !!updates.is_active;
       await supabase.from('users').update(updates).eq('id', targetUserId);
    }

    if (isPatient && targetPatientId && Object.keys(patientResult.data).length > 0) {
       await supabase.from('patients').update(patientResult.data).eq('id', targetPatientId);
       await supabase.from('audit_logs').insert({
          user_id: user.id, action: 'patient.updated', target_type: 'patient', target_id: targetPatientId, details: patientResult.data
       });
    }

    const { data: updatedUser } = await supabase.from('users').select('id, email, full_name, role, is_active').eq('id', targetUserId).single();
    let updatedPatient = null;
    if (isPatient) {
       const { data: up } = await supabase.from('patients').select('assigned_doctor_id, conditions').eq('user_id', targetUserId).maybeSingle();
       updatedPatient = up;
    }

    return NextResponse.json({ user: { ...updatedUser, ...(updatedPatient && { patient: updatedPatient }) } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const targetUserId = parseInt(params.userId);
    if (targetUserId === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

    await supabase.from('users').update({ is_active: false }).eq('id', targetUserId);
    await supabase.from('audit_logs').insert({
       user_id: user.id, action: 'user.deleted', target_type: 'user', target_id: targetUserId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
