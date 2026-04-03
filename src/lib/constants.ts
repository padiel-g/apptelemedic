// (findBestDoctorForCondition moved to server-only file)
export const DOCTOR_SPECIALIZATIONS = [
  'General Practice',
  'Cardiology',
  'Pulmonology',
  'Endocrinology',
  'Neurology',
  'Orthopedics',
  'Dermatology',
  'Pediatrics',
  'Psychiatry',
  'Oncology',
  'Gastroenterology',
  'Infectious Disease',
  'Other'
] as const;

export const CONDITION_TO_SPECIALIZATION: Record<string, string> = {
  // Cardiology
  'heart disease': 'Cardiology',
  'hypertension': 'Cardiology',
  'arrhythmia': 'Cardiology',
  'heart failure': 'Cardiology',
  // Pulmonology
  'asthma': 'Pulmonology',
  'copd': 'Pulmonology',
  'pneumonia': 'Pulmonology',
  'bronchitis': 'Pulmonology',
  // Endocrinology
  'diabetes type 1': 'Endocrinology',
  'diabetes type 2': 'Endocrinology',
  'diabetes': 'Endocrinology',
  'thyroid disorder': 'Endocrinology',
  'hormonal imbalance': 'Endocrinology',
  // Neurology
  'epilepsy': 'Neurology',
  'migraine': 'Neurology',
  'stroke': 'Neurology',
  "parkinson's": 'Neurology',
  // Orthopedics
  'arthritis': 'Orthopedics',
  'back pain': 'Orthopedics',
  'fracture': 'Orthopedics',
  'osteoporosis': 'Orthopedics',
  // Dermatology
  'eczema': 'Dermatology',
  'psoriasis': 'Dermatology',
  'skin infection': 'Dermatology',
  'acne': 'Dermatology',
  // Psychiatry
  'depression': 'Psychiatry',
  'anxiety': 'Psychiatry',
  'ptsd': 'Psychiatry',
  'bipolar disorder': 'Psychiatry',
  // Oncology
  'cancer - breast': 'Oncology',
  'cancer - lung': 'Oncology',
  'cancer - prostate': 'Oncology',
  'cancer - other': 'Oncology',
  'cancer': 'Oncology',
  // Gastroenterology
  'ibs': 'Gastroenterology',
  'ulcer': 'Gastroenterology',
  "crohn's disease": 'Gastroenterology',
  'liver disease': 'Gastroenterology',
  // Infectious Disease
  'hiv/aids': 'Infectious Disease',
  'hiv': 'Infectious Disease',
  'tuberculosis': 'Infectious Disease',
  'malaria': 'Infectious Disease',
  'hepatitis': 'Infectious Disease',
  'covid-19': 'Infectious Disease',
  // Pediatrics
  'general pediatric care': 'Pediatrics',
  // General Practice
  'general checkup': 'General Practice',
  'other / not sure': 'General Practice',
};

export const PATIENT_CONDITIONS: { group: string; conditions: string[] }[] = [
  { group: 'Cardiology',        conditions: ['Heart Disease', 'Hypertension', 'Arrhythmia', 'Heart Failure'] },
  { group: 'Pulmonology',       conditions: ['Asthma', 'COPD', 'Pneumonia', 'Bronchitis'] },
  { group: 'Endocrinology',     conditions: ['Diabetes Type 1', 'Diabetes Type 2', 'Thyroid Disorder', 'Hormonal Imbalance'] },
  { group: 'Neurology',         conditions: ['Epilepsy', 'Migraine', 'Stroke', "Parkinson's"] },
  { group: 'Orthopedics',       conditions: ['Arthritis', 'Back Pain', 'Fracture', 'Osteoporosis'] },
  { group: 'Dermatology',       conditions: ['Eczema', 'Psoriasis', 'Skin Infection', 'Acne'] },
  { group: 'Psychiatry',        conditions: ['Depression', 'Anxiety', 'PTSD', 'Bipolar Disorder'] },
  { group: 'Oncology',          conditions: ['Cancer - Breast', 'Cancer - Lung', 'Cancer - Prostate', 'Cancer - Other'] },
  { group: 'Gastroenterology',  conditions: ['IBS', 'Ulcer', "Crohn's Disease", 'Liver Disease'] },
  { group: 'Infectious Disease',conditions: ['HIV/AIDS', 'Tuberculosis', 'Malaria', 'Hepatitis', 'COVID-19'] },
  { group: 'Pediatrics',        conditions: ['General Pediatric Care'] },
  { group: 'General Practice',  conditions: ['General Checkup', 'Other / Not Sure'] },
];
import { UserRole, VitalThresholds } from '@/types';

export const VITAL_THRESHOLDS: Record<'pulse' | 'temperature' | 'oxygen' | 'bp_sys' | 'bp_dia', VitalThresholds> = {
  pulse: { min: 60, max: 100 },
  temperature: { min: 36.1, max: 37.2 },
  oxygen: { min: 95, max: 100 },
  bp_sys: { min: 90, max: 120 },
  bp_dia: { min: 60, max: 80 },
};

export const USER_ROLES = UserRole;

export const POLLING_INTERVAL = Number(process.env.NEXT_PUBLIC_POLLING_INTERVAL) || 5000;

export const ROUTE_MAP: Record<UserRole | 'public', string[]> = {
  public: ['/', '/login', '/register', '/api/auth/login', '/api/auth/register', '/api/health-data'],
  patient: ['/patient', '/patient/history', '/api/auth/logout', '/api/auth/me', '/api/patients/.*'],
  doctor: ['/doctor', '/doctor/.*', '/api/auth/logout', '/api/auth/me', '/api/patients.*'],
  admin: ['/admin', '/admin/.*', '/api/auth/logout', '/api/auth/me', '/api/patients.*', '/api/admin/users.*'],
};
