export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { deviceId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const id = parseInt(params.deviceId);
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, any> = {};
    if ('label' in body) updates.label = body.label || null;
    if ('patient_id' in body) updates.patient_id = body.patient_id || null;
    if ('is_active' in body) updates.is_active = body.is_active ? 1 : 0;

    const keys = Object.keys(updates);
    if (keys.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE devices SET ${setClause} WHERE id = ?`).run(...Object.values(updates), id);

    const updated = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Admin device PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { deviceId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = getDb();
    const id = parseInt(params.deviceId);
    const device = db.prepare('SELECT id FROM devices WHERE id = ?').get(id);
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    db.prepare('DELETE FROM devices WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin device DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
