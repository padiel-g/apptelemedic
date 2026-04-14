export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { registerSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    let sql = 'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (search) {
      sql += ' AND (full_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';
    const users = db.prepare(sql).all(...params);

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

    const db = getDb();
    const body = await request.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });

    const { email, password, full_name, role, specialization } = result.data;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

    const password_hash = await hashPassword(password);

    const insertTransaction = db.transaction(() => {
      if (role === 'doctor') {
        db.prepare('INSERT INTO users (email, password_hash, full_name, role, specialization) VALUES (?, ?, ?, ?, ?)').run(email, password_hash, full_name, role, specialization || null);
      } else {
        db.prepare('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run(email, password_hash, full_name, role);
      }

      const newRow = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string };
      const userId = newRow.id;

      if (role === 'patient') {
        const firstDoc = db.prepare("SELECT id FROM users WHERE role = 'doctor' AND is_active = 1 LIMIT 1").get() as { id: string } | undefined;
        db.prepare('INSERT INTO patients (user_id, assigned_doctor_id) VALUES (?, ?)').run(userId, firstDoc ? firstDoc.id : null);
      }

      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at)
        VALUES (?, 'user.created', 'user', ?, ?, ?)
      `).run(user.id, userId, JSON.stringify({ email, role }), now);

      return userId;
    });

    const newUserId = insertTransaction();
    const newUser = db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?').get(newUserId);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
