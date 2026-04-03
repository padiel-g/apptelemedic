import { z } from 'zod';

export const symptomSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe', 'critical']),
  body_area: z.string().optional(),
  onset_date: z.string().optional(),
});

export const symptomUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional(),
  body_area: z.string().optional(),
  onset_date: z.string().optional(),
  is_resolved: z.boolean().optional(),
});
