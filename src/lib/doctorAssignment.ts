import { getDb } from './db'; // ✅ FIX: use getDb() instead of broken supabase alias
import { CONDITION_TO_SPECIALIZATION } from './constants';

// Utility: Find best matching doctor for a given condition (server-only)
export function findBestDoctorForCondition(condition: string): { id: string, specialization: string } | null {
  const db = getDb(); // ✅ FIX: get live DB instance
  const specialization = CONDITION_TO_SPECIALIZATION[condition?.toLowerCase?.()] || 'General Practice';

  // Find an active doctor with this specialization
  const doctor = db.prepare(
    'SELECT id, specialization FROM users WHERE role = ? AND is_active = 1 AND specialization = ? LIMIT 1'
  ).get('doctor', specialization) as { id: string, specialization: string } | undefined;

  if (doctor) return doctor;

  // Fallback: any general practice doctor
  if (specialization !== 'General Practice') {
    const fallback = db.prepare(
      'SELECT id, specialization FROM users WHERE role = ? AND is_active = 1 AND specialization = ? LIMIT 1'
    ).get('doctor', 'General Practice') as { id: string, specialization: string } | undefined;

    if (fallback) return fallback;
  }

  return null;
}