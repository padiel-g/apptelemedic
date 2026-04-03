import { NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validators';
import { db, getQuery } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { User } from '@/types';
import { findBestDoctorForCondition } from '@/lib/doctorAssignment';
import { CONDITION_TO_SPECIALIZATION } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { email, password, full_name, role, specialization, primary_condition, other_conditions } = result.data;

    const existingUser = getQuery<User>('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const password_hash = await hashPassword(password);

    // Build combined conditions string
    const combinedConditions = role === 'patient' && primary_condition
      ? primary_condition + (other_conditions ? ', ' + other_conditions : '')
      : null;

    // Resolve the best doctor before the transaction (uses prepare/get, safe outside tx)
    const assignedDoctor = role === 'patient' && primary_condition
      ? findBestDoctorForCondition(primary_condition)
      : null;

    const insertTransaction = db.transaction(() => {
      let stmt, info;
      if (role === 'doctor') {
        stmt = db.prepare('INSERT INTO users (email, password_hash, full_name, role, specialization) VALUES (?, ?, ?, ?, ?)');
        info = stmt.run(email, password_hash, full_name, role, specialization);
      } else {
        stmt = db.prepare('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)');
        info = stmt.run(email, password_hash, full_name, role);
      }
      const userId = info.lastInsertRowid as number;
      if (role === 'patient') {
        db.prepare('INSERT INTO patients (user_id, conditions) VALUES (?, ?)').run(userId, combinedConditions);
        if (assignedDoctor) {
          db.prepare('UPDATE patients SET assigned_doctor_id = ? WHERE user_id = ?').run(assignedDoctor.id, userId);
        } else {
          // Fallback: assign first available active doctor
          const fallback = db.prepare("SELECT id FROM users WHERE role = 'doctor' AND is_active = 1 LIMIT 1").get() as { id: number } | undefined;
          if (fallback) {
            db.prepare('UPDATE patients SET assigned_doctor_id = ? WHERE user_id = ?').run(fallback.id, userId);
          }
        }
      } else if (role === 'doctor' && specialization) {
        const unassignedPatients = db.prepare(`SELECT p.id, p.conditions FROM patients p WHERE p.assigned_doctor_id IS NULL`).all() as { id: number, conditions: string }[];
        
        for (const p of unassignedPatients) {
          if (!p.conditions) continue;
          const primaryCond = p.conditions.split(',')[0].trim().toLowerCase();
          const mappedSpec = CONDITION_TO_SPECIALIZATION[primaryCond] || 'General Practice';
          
          if (mappedSpec === specialization) {
            db.prepare('UPDATE patients SET assigned_doctor_id = ? WHERE id = ?').run(userId, p.id);
          }
        }
      }
      return userId;
    });

    const newUserId = insertTransaction();
    
    const newUser = getQuery<User>('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?', [newUserId]);
    
    return NextResponse.json({ 
      user: newUser,
      assignedDoctor: assignedDoctor ? { full_name: assignedDoctor.full_name, specialization: assignedDoctor.specialization } : undefined
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
