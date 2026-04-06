"use client";

import { useState } from 'react';
import { DOCTOR_SPECIALIZATIONS, PATIENT_CONDITIONS } from '@/lib/constants';
import { Select } from '@/components/ui/Select';
import { registerSchema } from '@/lib/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types';

export function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: UserRole.Patient,
    specialization: '',
    primary_condition: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setFieldErrors({});

      if (formData.password !== formData.confirm_password) {
        setFieldErrors({ confirm_password: 'Passwords must match' });
        return;
      }
      
      const payload = registerSchema.parse({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        specialization: formData.role === UserRole.Doctor ? formData.specialization : undefined,
        primary_condition: formData.role === UserRole.Patient ? formData.primary_condition : undefined,
      });
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
      
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const errMap: Record<string, string> = {};
        const fieldErrors = (err as z.ZodError).flatten().fieldErrors;
        Object.entries(fieldErrors).forEach(([key, msgs]) => {
           if (Array.isArray(msgs) && msgs.length > 0) errMap[key] = msgs[0];
        });
        setFieldErrors(errMap);
      } else {
        setError(err.message || 'Network error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4 p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
        <h3 className="text-emerald-800 font-semibold text-lg">Registration Successful!</h3>
        <p className="text-emerald-600 text-sm">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-500 rounded-md text-sm">{error}</div>}
      
      <Input
        label="Full Name"
        placeholder="John Doe"
        icon={<UserIcon className="w-5 h-5" />}
        value={formData.full_name}
        onChange={e => setFormData({...formData, full_name: e.target.value})}
        error={fieldErrors.full_name}
      />
      
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        icon={<Mail className="w-5 h-5" />}
        value={formData.email}
        onChange={e => setFormData({...formData, email: e.target.value})}
        error={fieldErrors.email}
      />
      
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        icon={<Lock className="w-5 h-5" />}
        value={formData.password}
        onChange={e => setFormData({...formData, password: e.target.value})}
        error={fieldErrors.password}
      />
      
      <Input
        label="Confirm Password"
        type="password"
        placeholder="••••••••"
        icon={<Lock className="w-5 h-5" />}
        value={formData.confirm_password}
        onChange={e => setFormData({...formData, confirm_password: e.target.value})}
        error={fieldErrors.confirm_password}
      />


      <div className="w-full">
        <label className="block text-sm font-medium text-slate-700 mb-1">I am a</label>
        <select
          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          value={formData.role}
          onChange={e => setFormData({ ...formData, role: e.target.value as UserRole, specialization: '', primary_condition: '' })}
        >
          <option value={UserRole.Patient}>Patient</option>
          <option value={UserRole.Doctor}>Doctor</option>
        </select>
        {fieldErrors.role && <p className="mt-1 text-sm text-red-500">{fieldErrors.role}</p>}
      </div>

      {formData.role === UserRole.Doctor && (
        <div className="w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">Specialization <span className="text-red-500">*</span></label>
          <Select
            value={formData.specialization}
            onChange={val => setFormData({ ...formData, specialization: val })}
            options={DOCTOR_SPECIALIZATIONS.map(s => ({ value: s, label: s }))}
            placeholder="Select specialization"
          />
          {fieldErrors.specialization && <p className="mt-1 text-sm text-red-500">{fieldErrors.specialization}</p>}
        </div>
      )}

      {formData.role === UserRole.Patient && (
        <div className="w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Primary Condition <span className="text-red-500">*</span>
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={formData.primary_condition}
            onChange={e => setFormData({ ...formData, primary_condition: e.target.value })}
            required
          >
            <option value="" disabled>Select your condition</option>
            {PATIENT_CONDITIONS.map(({ group, conditions }) => (
              <optgroup key={group} label={group}>
                {conditions.map(condition => (
                  <option key={condition} value={condition.toLowerCase()}>
                    {condition}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {fieldErrors.primary_condition && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.primary_condition}</p>
          )}
        </div>
      )}
      
      <Button type="submit" className="w-full" isLoading={loading}>
        Create Account
      </Button>

      <div className="text-center text-sm text-slate-500 mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
      </div>
    </form>
  );
}
