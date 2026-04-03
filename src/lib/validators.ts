export const patientProfileUpdateSchema = z.object({
  blood_type: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  medications: z.string().nullable().optional(),
  medical_notes: z.string().nullable().optional(),
  height_cm: z.number().nullable().optional(),
  weight_kg: z.number().nullable().optional(),
  emergency_contact: z.string().nullable().optional(),
});
import { z } from 'zod';
import { UserRole } from '@/types';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

import { DOCTOR_SPECIALIZATIONS } from './constants';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  full_name: z.string().min(2, 'Full name is required'),
  role: z.nativeEnum(UserRole),
  specialization: z.string().optional(),
  primary_condition: z.string().optional(),
  other_conditions: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === UserRole.Doctor) {
    if (!data.specialization || !DOCTOR_SPECIALIZATIONS.includes(data.specialization as any)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specialization'],
        message: 'Specialization is required for doctors',
      });
    }
  }
  if (data.role === UserRole.Patient) {
    if (!data.primary_condition || data.primary_condition.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['primary_condition'],
        message: 'Please select your primary condition',
      });
    }
  }
});

export const healthDataSchema = z.object({
  device_id: z.string().min(1, 'Device ID is required'),
  pulse: z.number().min(20).max(250, 'Invalid pulse rate'),
  temperature: z.number().min(30).max(45, 'Invalid temperature'),
  oxygen: z.number().min(50).max(100, 'Invalid oxygen saturation'),
  bp_sys: z.number().min(50).max(250, 'Invalid systolic bp').nullable().optional(),
  bp_dia: z.number().min(30).max(150, 'Invalid diastolic bp').nullable().optional(),
});

export const manualEntrySchema = z.object({
  patient_id: z.number().optional(),
  pulse: z.number().min(20).max(250, 'Invalid pulse rate'),
  temperature: z.number().min(30).max(45, 'Invalid temperature'),
  oxygen: z.number().min(50).max(100, 'Invalid oxygen saturation'),
  bp_sys: z.number().min(50).max(250, 'Invalid systolic bp').optional(),
  bp_dia: z.number().min(30).max(150, 'Invalid diastolic bp').optional(),
  notes: z.string().optional(),
});

export const messageSchema = z.object({
  patient_id: z.number().optional(),
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

export const userUpdateSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  is_active: z.number().min(0).max(1).optional(),
});

export const patientUpdateSchema = z.object({
  date_of_birth: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  blood_type: z.string().nullable().optional(),
  emergency_contact: z.string().nullable().optional(),
  assigned_doctor_id: z.number().nullable().optional(),
  conditions: z.string().nullable().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type HealthDataInput = z.infer<typeof healthDataSchema>;
