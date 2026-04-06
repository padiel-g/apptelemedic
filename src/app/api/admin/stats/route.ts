export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: patientsCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient');
    const { count: doctorsCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'doctor');
    const { count: devicesCount } = await supabase.from('devices').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: readingsCount } = await supabase.from('readings').select('*', { count: 'exact', head: true });
    
    const { data: logs } = await supabase.from('audit_logs').select('*, user:users!audit_logs_user_id_fkey(full_name)').order('created_at', { ascending: false }).limit(20);

    const formattedLogs = logs?.map(l => ({ ...l, user_name: l.user?.full_name })) || [];

    return NextResponse.json({
      stats: {
        users: usersCount || 0,
        patients: patientsCount || 0,
        doctors: doctorsCount || 0,
        devices: devicesCount || 0,
        readings: readingsCount || 0
      },
      logs: formattedLogs
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
