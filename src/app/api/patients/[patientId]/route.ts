export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { patientId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const patientId = parseInt(params.patientId);

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*, user:users!patients_user_id_fkey(full_name, email)')
      .eq('id', patientId)
      .maybeSingle();

    if (patientError || !patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    if (user.role === 'patient' && patient.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (user.role === 'doctor' && patient.assigned_doctor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: readings } = await supabase
      .from('readings')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      patient: {
        ...patient,
        user: { id: patient.user_id, full_name: patient.user?.full_name, email: patient.user?.email }
      },
      readings: readings || []
    });
  } catch (error) {
    console.error('Patient details GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
