import { z } from 'zod';

export const appointmentSchema = z.object({
  doctor_id: z.number().optional(),
  appointment_date: z.string().min(1),
  appointment_time: z.string().min(1),
  type: z.enum(['consultation', 'follow_up', 'emergency', 'checkup']),
  reason: z.string().optional(),
});

export const appointmentUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
});
