-- Migration: Assign a patient to a doctor
-- Replace PATIENT_ID with the actual patient id you want to assign

UPDATE patients
SET assigned_doctor_id = '48bc8416523060584330444b10fb33cf'
WHERE id = PATIENT_ID;
