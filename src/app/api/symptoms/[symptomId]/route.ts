import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { symptomUpdateSchema } from '@/lib/symptomValidators';

export async function PATCH(request: Request, { params }: { params: { symptomId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const symptomId = parseInt(params.symptomId);
    const symptom = db.prepare('SELECT * FROM symptoms WHERE id = ?').get(symptomId);
    if (!symptom) return NextResponse.json({ error: 'Symptom not found' }, { status: 404 });
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
    if (!patient || symptom.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const result = symptomUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 });
    }
    const updateFields = result.data;
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    const setClause = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updateFields);
    db.prepare(`UPDATE symptoms SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, symptomId);
    const updated = db.prepare('SELECT * FROM symptoms WHERE id = ?').get(symptomId);
    return NextResponse.json({ symptom: updated });
  } catch (error) {
    console.error('Symptom PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { symptomId: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const symptomId = parseInt(params.symptomId);
    const symptom = db.prepare('SELECT * FROM symptoms WHERE id = ?').get(symptomId);
    if (!symptom) return NextResponse.json({ error: 'Symptom not found' }, { status: 404 });
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
    if (!patient || symptom.patient_id !== patient.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    db.prepare('DELETE FROM symptoms WHERE id = ?').run(symptomId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Symptom DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
