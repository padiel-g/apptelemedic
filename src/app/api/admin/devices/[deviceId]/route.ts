import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, getQuery } from '@/lib/db';
import { Device } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.deviceId);
    const device = getQuery<Device>('SELECT * FROM devices WHERE id = ?', [id]);
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields: string[] = [];
    const values: any[] = [];

    if ('label' in body) {
      fields.push('label = ?');
      values.push(body.label || null);
    }
    if ('patient_id' in body) {
      fields.push('patient_id = ?');
      values.push(body.patient_id || null);
    }
    if ('is_active' in body) {
      fields.push('is_active = ?');
      values.push(body.is_active ? 1 : 0);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = getQuery<Device>('SELECT * FROM devices WHERE id = ?', [id]);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Admin devices PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.deviceId);
    const device = getQuery<Device>('SELECT * FROM devices WHERE id = ?', [id]);
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM devices WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin devices DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
