export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/db';
import { registerSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    let query = supabase.from('users').select('id, email, full_name, role, is_active, created_at');

    if (role) query = query.eq('role', role);
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data: users, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: users || [] });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    
    const { email, password, full_name, role } = result.data;
    
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    
    const password_hash = await hashPassword(password);
    
    const { data: newUser, error } = await supabase.from('users').insert({
       email, password_hash, full_name, role, is_active: true
    }).select('id, email, full_name, role, is_active').single();
    if (error) throw error;

    if (role === 'patient') {
        const { data: firstDoc } = await supabase.from('users').select('id').eq('role', 'doctor').eq('is_active', true).limit(1).maybeSingle();
        await supabase.from('patients').insert({
           user_id: newUser.id, assigned_doctor_id: firstDoc ? firstDoc.id : null
        });
    }
    
    await supabase.from('audit_logs').insert({
       user_id: user.id, action: 'user.created', target_type: 'user', target_id: newUser.id, details: { email, role }
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
