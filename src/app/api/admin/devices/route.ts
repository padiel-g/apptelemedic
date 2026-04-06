export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: devices } = await supabase.from('devices').select('id, device_id, label, is_active, last_seen_at, created_at, patient_id, patient:patients!devices_patient_id_fkey(user:users!patients_user_id_fkey(full_name, email))').order('created_at', { ascending: false });

    const formattedDevices = devices?.map((d: any) => ({
       id: d.id, device_id: d.device_id, label: d.label, is_active: d.is_active, last_seen_at: d.last_seen_at, created_at: d.created_at, patient_id: d.patient_id,
       patient_name: d.patient?.user?.full_name, patient_email: d.patient?.user?.email
    })) || [];

    return NextResponse.json({ data: formattedDevices });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { device_id, patient_id, label } = body;

    if (!device_id || typeof device_id !== 'string' || device_id.trim() === '') return NextResponse.json({ error: 'device_id is required' }, { status: 400 });

    const { data: existing } = await supabase.from('devices').select('id').eq('device_id', device_id.trim()).maybeSingle();
    if (existing) return NextResponse.json({ error: 'Device ID already registered' }, { status: 409 });

    const apiKey = randomBytes(16).toString('hex');

    const { data: inserted, error } = await supabase.from('devices').insert({
       device_id: device_id.trim(), api_key: apiKey, patient_id: patient_id || null, label: label || null
    }).select('id').single();
    if (error) throw error;

    return NextResponse.json({ id: inserted.id, device_id: device_id.trim(), api_key: apiKey }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
