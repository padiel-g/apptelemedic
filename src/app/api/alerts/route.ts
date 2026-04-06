export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get('resolved') === 'true';

    let validPids = null;
    if (user.role === 'doctor') {
       const { data: pids } = await supabase.from('patients').select('id').eq('assigned_doctor_id', user.id);
       validPids = pids?.map(p => p.id) || [];
    } else if (user.role === 'patient') {
       const { data: pids } = await supabase.from('patients').select('id').eq('user_id', user.id);
       validPids = pids?.map(p => p.id) || [];
    }

    let fetchQuery = supabase.from('alerts').select('*, patient:patients!alerts_patient_id_fkey(user_id, user:users!patients_user_id_fkey(full_name))').eq('is_resolved', resolved).order('created_at', { ascending: false }).limit(50);

    if (validPids !== null) {
       if (validPids.length === 0) return NextResponse.json({ data: [] });
       fetchQuery = fetchQuery.in('patient_id', validPids);
    }

    const { data: alerts, error } = await fetchQuery;
    if (error) throw error;

    const formattedAlerts = alerts?.map((a: any) => ({
      ...a, patient_user_id: a.patient?.user_id, patient_name: a.patient?.user?.full_name
    })) || [];

    return NextResponse.json({ data: formattedAlerts });
  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
