"use client";

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DOCTOR_SPECIALIZATIONS } from '@/lib/constants';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CONDITIONS = ['hypertension', 'diabetes', 'asthma', 'heart disease', 'epilepsy', 'arthritis', 'hiv', 'tuberculosis', 'malaria', 'cancer', 'depression', 'anxiety', 'other'];

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/patients/profile').then(res => res.json()).then(data => { setProfile(data.profile); setForm({ ...data.profile }); });
  }, []);

  const handleChange = (field: string, value: any) => setForm((prev: any) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess(false);
    try {
      const res = await fetch('/api/patients/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setProfile(data.profile); setSuccess(true);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const bmi = form.height_cm && form.weight_kg ? (form.weight_kg / ((form.height_cm / 100) ** 2)).toFixed(1) : '';
  if (!profile) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Patient Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" value={profile.full_name} disabled />
          <Input label="Date of Birth" value={profile.date_of_birth || ''} disabled />
          <Input label="Gender" value={profile.gender || ''} disabled />
          <Input label="Emergency Contact" value={form.emergency_contact || ''} onChange={e => handleChange('emergency_contact', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Blood Type" value={form.blood_type || ''} onChange={val => handleChange('blood_type', val)} options={BLOOD_TYPES.map(b => ({ value: b, label: b }))} />
          <Input label="Conditions" value={form.conditions || ''} onChange={e => handleChange('conditions', e.target.value)} placeholder={CONDITIONS.join(', ')} />
          <Input label="Allergies" value={form.allergies || ''} onChange={e => handleChange('allergies', e.target.value)} />
          <Input label="Medications" value={form.medications || ''} onChange={e => handleChange('medications', e.target.value)} />
          <Input label="Height (cm)" type="number" value={form.height_cm || ''} onChange={e => handleChange('height_cm', parseFloat(e.target.value) || '')} />
          <Input label="Weight (kg)" type="number" value={form.weight_kg || ''} onChange={e => handleChange('weight_kg', parseFloat(e.target.value) || '')} />
          <Input label="BMI" value={bmi} disabled />
        </div>
        <div className="w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">Medical Notes</label>
          <textarea className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]" value={form.medical_notes || ''} onChange={e => handleChange('medical_notes', e.target.value)} />
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Profile updated!</div>}
        <Button type="submit" isLoading={loading}>Save</Button>
      </form>
    </div>
  );
}
