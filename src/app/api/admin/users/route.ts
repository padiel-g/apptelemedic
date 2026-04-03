import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, getQuery } from '@/lib/db';
import { registerSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/auth';
import { User } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    let query = 'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const users = db.prepare(query).all(...params);

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { email, password, full_name, role } = result.data;
    
    const existing = getQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    
    const password_hash = await hashPassword(password);
    
    const insertTransaction = db.transaction(() => {
      const stmt = db.prepare('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)');
      const info = stmt.run(email, password_hash, full_name, role);
      const newUserId = info.lastInsertRowid as number;
      
      if (role === 'patient') {
        db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(newUserId);
        
        // Auto-assign to first available doctor
        const doctor = db.prepare("SELECT id FROM users WHERE role = 'doctor' AND is_active = 1 LIMIT 1").get() as { id: number } | undefined;
        if (doctor) {
          db.prepare("UPDATE patients SET assigned_doctor_id = ? WHERE user_id = ?").run(doctor.id, newUserId);
        }
      }
      
      db.prepare('INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)')
        .run(user.id, 'user.created', 'user', newUserId, JSON.stringify({ email, role }));

        
      return newUserId;
    });

    const newUserId = insertTransaction();
    const newUser = getQuery<User>('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?', [newUserId]);
    
    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
