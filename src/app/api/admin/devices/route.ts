import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, allQuery } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const devices = db.prepare(`
      SELECT
        d.id,
        d.device_id,
        d.label,
        d.is_active,
        d.last_seen_at,
        d.created_at,
        d.patient_id,
        u.full_name AS patient_name,
        u.email    AS patient_email
      FROM devices d
      LEFT JOIN patients p ON d.patient_id = p.id
      LEFT JOIN users u    ON p.user_id    = u.id
      ORDER BY d.created_at DESC
    `).all();

    return NextResponse.json({ data: devices });
  } catch (error) {
    console.error('Admin devices GET error:', error);
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
    const { device_id, patient_id, label } = body;

    if (!device_id || typeof device_id !== 'string' || device_id.trim() === '') {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM devices WHERE device_id = ?').get(device_id.trim());
    if (existing) {
      return NextResponse.json({ error: 'Device ID already registered' }, { status: 409 });
    }

    const apiKey = randomBytes(16).toString('hex'); // 32-char hex

    const info = db.prepare(
      'INSERT INTO devices (device_id, api_key, patient_id, label) VALUES (?, ?, ?, ?)'
    ).run(device_id.trim(), apiKey, patient_id || null, label || null);

    return NextResponse.json({ id: info.lastInsertRowid, device_id: device_id.trim(), api_key: apiKey }, { status: 201 });
  } catch (error) {
    console.error('Admin devices POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
