export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { messageSchema } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get('patient_id');
    if (!patientIdParam) return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    const patientId = parseInt(patientIdParam);

    if (user.role === 'patient') {
      const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user.id).maybeSingle();
      if (!patient || patient.id !== patientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (user.role === 'doctor') {
      const { data: patient } = await supabase.from('patients').select('id').eq('id', patientId).eq('assigned_doctor_id', user.id).maybeSingle();
      if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: messages } = await supabase.from('messages').select('*, sender:users!messages_sender_id_fkey(full_name)').eq('patient_id', patientId).order('created_at', { ascending: true });
    
    await supabase.from('messages').update({ is_read: true }).eq('patient_id', patientId).eq('receiver_id', user.id).eq('is_read', false);

    const formattedMessages = messages?.map(m => ({ ...m, sender_name: m.sender?.full_name })) || [];
    return NextResponse.json({ data: formattedMessages });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const result = messageSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    
    const { patient_id, content } = result.data;
    
    let pid = 0;
    let doctor_id = 0;
    let actual_receiver_id = 0;
    
    if (user.role === 'patient') {
      const { data: patient } = await supabase.from('patients').select('id, assigned_doctor_id').eq('user_id', user.id).maybeSingle();
      if (!patient || !patient.assigned_doctor_id) return NextResponse.json({ error: 'No assigned doctor' }, { status: 403 });
      
      pid = patient.id;
      if (patient_id && patient_id !== pid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      
      doctor_id = patient.assigned_doctor_id;
      actual_receiver_id = doctor_id;
    } else if (user.role === 'doctor') {
      if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 });
      const { data: patient } = await supabase.from('patients').select('id, user_id, assigned_doctor_id').eq('id', patient_id).eq('assigned_doctor_id', user.id).maybeSingle();
      if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      
      pid = patient.id;
      doctor_id = user.id;
      actual_receiver_id = patient.user_id;
    } else {
      return NextResponse.json({ error: 'Admins cannot send patient messages' }, { status: 403 });
    }

    const { data: inserted, error } = await supabase.from('messages').insert({
      sender_id: user.id, receiver_id: actual_receiver_id, patient_id: pid, doctor_id, content
    }).select('*, sender:users!messages_sender_id_fkey(full_name)').single();
    
    if (error) throw error;
    
    const formatted = { ...inserted, sender_name: inserted.sender?.full_name };
    return NextResponse.json({ success: true, message: formatted }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
