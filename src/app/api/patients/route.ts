import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role === 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const condition = searchParams.get('condition') || '';

    let query = `
      SELECT p.*,
             u.full_name as user_full_name,
             u.email as user_email,
             r.id as reading_id,
             r.pulse, r.temperature, r.oxygen, r.bp_sys, r.bp_dia, r.source, r.recorded_at as last_reading_at, r.is_abnormal,
             d.last_seen_at as device_last_seen_at,
             doc.full_name as doctor_full_name,
             doc.specialization as doctor_specialization
      FROM patients p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users doc ON p.assigned_doctor_id = doc.id
      LEFT JOIN readings r ON r.id = (
        SELECT r2.id FROM readings r2 WHERE r2.patient_id = p.id ORDER BY r2.recorded_at DESC LIMIT 1
      )
      LEFT JOIN devices d ON d.patient_id = p.id AND d.is_active = 1
      WHERE u.is_active = 1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (condition) {
      query += ` AND p.conditions LIKE ?`;
      params.push(`%${condition}%`);
    }

    query += ` ORDER BY p.assigned_doctor_id IS NOT NULL DESC, u.full_name ASC`;

    const patientsRaw = db.prepare(query).all(...params) as any[];

    const patientsWithData = patientsRaw.map(p => {
      const latestReading = p.reading_id ? {
        id: p.reading_id,
        patient_id: p.id,
        pulse: p.pulse,
        temperature: p.temperature,
        oxygen: p.oxygen,
        bp_sys: p.bp_sys,
        bp_dia: p.bp_dia,
        source: p.source,
        recorded_at: p.last_reading_at,
        is_abnormal: p.is_abnormal
      } : null;

      return {
        id: p.id,
        user_id: p.user_id,
        date_of_birth: p.date_of_birth,
        gender: p.gender,
        blood_type: p.blood_type,
        emergency_contact: p.emergency_contact,
        assigned_doctor_id: p.assigned_doctor_id,
        conditions: p.conditions,
        created_at: p.created_at,
        user: {
          id: p.user_id,
          full_name: p.user_full_name,
          email: p.user_email
        },
        doctor: p.doctor_full_name ? { full_name: p.doctor_full_name, specialization: p.doctor_specialization } : null,
        latestReading,
        deviceLastSeenAt: p.device_last_seen_at || null,
      };
    });

    return NextResponse.json({ data: patientsWithData });
  } catch (error) {
    console.error('[API/patients] Full error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
