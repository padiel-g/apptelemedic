-- Migration: Assign Gerald T Padiel to Takudzwa
-- Replace DOCTOR_ID and PATIENT_ID with the actual IDs from your users and patients tables

UPDATE patients
SET assigned_doctor_id = 'DOCTOR_ID'
WHERE id = PATIENT_ID;
