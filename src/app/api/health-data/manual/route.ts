export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { manualEntrySchema } from '@/lib/validators';
import { supabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isAbnormal } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const result = manualEntrySchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const { pulse, temperature, oxygen, bp_sys, bp_dia, notes } = result.data;

    const { data: patient } = await supabase.from('patients').select('id, user_id').eq('user_id', user.id).maybeSingle();
    if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });

    const abnormal = isAbnormal({ pulse, temperature, oxygen, bp_sys, bp_dia: bp_dia || undefined }) ? true : false;

    const { data: reading, error } = await supabase.from('readings').insert({
      patient_id: patient.id,
      pulse,
      temperature,
      oxygen,
      bp_sys: bp_sys ?? null,
      bp_dia: bp_dia ?? null,
      source: 'manual',
      notes: notes || null,
      is_abnormal: abnormal
    }).select().single();

    if (error) throw error;

    if (abnormal) {
      await supabase.from('alerts').insert({
        patient_id: patient.id,
        reading_id: reading.id,
        message: 'Abnormal manual vitals recorded'
      });
    }

    return NextResponse.json({ success: true, reading }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
