export enum UserRole {
  Patient = 'patient',
  Doctor = 'doctor',
  Admin = 'admin'
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: number; // 0 or 1
  created_at: string;
  updated_at: string;
  specialization?: string | null;
}

export interface Patient {
  id: number;
  user_id: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  blood_type: string | null;
  emergency_contact: string | null;
  assigned_doctor_id: string | null;
  conditions: string | null;
  created_at: string;
}

export interface Device {
  id: number;
  device_id: string;
  patient_id: number | null;
  api_key: string;
  label: string | null;
  is_active: number;
  last_seen_at: string | null;
  created_at: string;
}

export interface Reading {
  id: number;
  patient_id: number;
  device_id: number | null;
  pulse: number;
  temperature: number;
  oxygen: number;
  bp_sys: number | null;
  bp_dia: number | null;
  source: 'device' | 'manual';
  notes: string | null;
  is_abnormal: number;
  recorded_at: string;
}

export interface Alert {
  id: number;
  patient_id: number;
  reading_id: number | null;
  message: string;
  is_resolved: number;
  created_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  patient_id: number;
  doctor_id: number;
  content: string;
  is_read: number;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface VitalThresholds {
  min: number;
  max: number;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  specialization?: string;
}

export interface HealthDataPayload {
  device_id: string;
  pulse: number;
  temperature: number;
  oxygen: number;
  bp_sys?: number;
  bp_dia?: number;
}

export interface ManualEntryRequest {
  patient_id: number;
  pulse: number;
  temperature: number;
  oxygen: number;
  bp_sys?: number;
  bp_dia?: number;
  notes?: string;
}

export interface MessageRequest {
  receiver_id: number;
  content: string;
}
