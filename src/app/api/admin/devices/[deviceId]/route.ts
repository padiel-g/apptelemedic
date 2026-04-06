export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { deviceId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = parseInt(params.deviceId);
    const { data: device } = await supabase.from('devices').select('*').eq('id', id).maybeSingle();
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    const body = await request.json();
    const updates: any = {};
    if ('label' in body) updates.label = body.label || null;
    if ('patient_id' in body) updates.patient_id = body.patient_id || null;
    if ('is_active' in body) updates.is_active = !!body.is_active;

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    await supabase.from('devices').update(updates).eq('id', id);

    const { data: updated } = await supabase.from('devices').select('*').eq('id', id).single();
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { deviceId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = parseInt(params.deviceId);
    const { data: device } = await supabase.from('devices').select('id').eq('id', id).maybeSingle();
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    await supabase.from('devices').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
