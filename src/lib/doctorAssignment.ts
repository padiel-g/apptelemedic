import { db } from './db';
import { CONDITION_TO_SPECIALIZATION } from './constants';

// Utility: Find best matching doctor for a given condition (server-only)
export function findBestDoctorForCondition(condition: string): { id: number, full_name: string, specialization: string } | null {
  const specialization = CONDITION_TO_SPECIALIZATION[condition?.toLowerCase?.()] || 'General Practice';
  // Find an active doctor with this specialization and the least number of assigned patients
  const doctor = db.prepare(`
    SELECT u.id, u.full_name, u.specialization, COUNT(p.id) as patient_count
    FROM users u
    LEFT JOIN patients p ON p.assigned_doctor_id = u.id
    WHERE u.role = 'doctor' AND u.is_active = 1 AND u.specialization = ?
    GROUP BY u.id
    ORDER BY patient_count ASC
    LIMIT 1
  `).get(specialization);
  if (doctor) return doctor as any;
  
  // Fallback: any general practice doctor with least patients
  if (specialization !== 'General Practice') {
    const fallback = db.prepare(`
      SELECT u.id, u.full_name, u.specialization, COUNT(p.id) as patient_count
      FROM users u
      LEFT JOIN patients p ON p.assigned_doctor_id = u.id
      WHERE u.role = 'doctor' AND u.is_active = 1 AND u.specialization = 'General Practice'
      GROUP BY u.id
      ORDER BY patient_count ASC
      LIMIT 1
    `).get();
    if (fallback) return fallback as any;
  }
  return null;
}
