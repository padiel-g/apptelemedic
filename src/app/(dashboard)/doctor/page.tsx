"use client";

import { useState, useCallback } from 'react';
import { PatientList } from '@/components/dashboard/PatientList';
import { usePolling } from '@/hooks/usePolling';
import { PatientWithData } from '@/components/dashboard/PatientRow';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function DoctorDashboard() {
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetcher = async () => {
    const res = await fetch(`/api/patients?search=${search}&condition=${condition}`);
    if (!res.ok) {
      throw new Error('Failed to fetch patients');
    }
    const json = await res.json();
    return json.data as PatientWithData[];
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.user?.id);
      }
    } catch {}
  };

  // Fetch current user on mount
  useState(() => { fetchCurrentUser(); });

  const { data: patients, isLoading, refetch } = usePolling(async () => {
    try {
      setError(null);
      return await fetcher();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      return [];
    }
  }, { interval: 10000 });

  const handleAssignChange = useCallback(() => {
    setRefreshKey(k => k + 1);
    refetch?.();
  }, [refetch]);

  const pts = patients || [];
  const myPatients = pts.filter(p => currentUserId != null && Number(p.assigned_doctor_id) === currentUserId);
  const abnormalCount = myPatients.filter(p => p.latestReading?.is_abnormal).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Patient Overview</h2>
        <p className="text-slate-500">Monitor and manage your patients. Assign unassigned patients to yourself.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-blue-600">My Patients</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">{myPatients.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-red-600">Action Required</p>
            <p className="mt-2 text-3xl font-bold text-red-900">{abnormalCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-emerald-600">Total Patients in System</p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">{pts.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="w-full max-w-sm">
          <Input
            placeholder="Search patients..."
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full max-w-[200px]">
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={condition}
            onChange={e => setCondition(e.target.value)}
          >
            <option value="">All Conditions</option>
            <option value="Hypertension">Hypertension</option>
            <option value="Diabetes">Diabetes</option>
            <option value="Asthma">Asthma</option>
            <option value="COPD">COPD</option>
          </select>
        </div>
      </div>

      {isLoading && !patients ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : (
        <PatientList patients={pts} currentUserId={currentUserId} onAssignChange={handleAssignChange} />
      )}
    </div>
  );
}
