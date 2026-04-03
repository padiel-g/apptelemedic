"use client";

import { useState } from 'react';
import { usePolling } from '@/hooks/usePolling';
import { PatientWithData } from '@/components/dashboard/PatientRow';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { PatientFilterBar } from '@/components/dashboard/PatientFilterBar';
import { PatientAssignmentTable } from '@/components/dashboard/PatientAssignmentTable';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Users, UserX, AlertCircle, Cpu, Calendar } from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState<'mine' | 'all'>('mine');
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('all');
  const [status, setStatus] = useState('all');
  
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetcher = async () => {
    const params = new URLSearchParams({
      view,
      search,
      condition,
      status
    });
    const res = await fetch(`/api/patients?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch patients');
    }
    return await res.json();
  };

  const { data: responseData, isLoading, refetch } = usePolling(async () => {
    try {
      setError(null);
      return await fetcher();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      return null;
    }
  }, { interval: 10000, deps: [view, search, condition, status] });

  const patients = (responseData?.data || []) as PatientWithData[];
  const stats = responseData?.stats || { myPatients: 0, unassigned: 0, actionRequired: 0, activeDevices: 0 };

  const { data: apptData, isLoading: apptLoading } = usePolling(async () => {
    try {
      const res = await fetch('/api/appointments');
      if (!res.ok) return { appointments: [] };
      return await res.json();
    } catch {
      return { appointments: [] };
    }
  }, { interval: 30000 });

  const appointments = apptData?.appointments || [];
  const todaysAppointments = appointments
    .filter((a: any) => a.status === 'confirmed')
    .filter((a: any) => {
       const today = new Date().toISOString().slice(0, 10);
       return a.appointment_date === today;
    })
    .sort((a: any, b: any) => a.appointment_time.localeCompare(b.appointment_time))
    .slice(0, 4);

  const handleAssign = async (patientId: number, patientName: string, doctorName?: string | null) => {
    if (doctorName && doctorName !== user?.full_name) {
      if (!window.confirm(`This patient is currently under Dr. ${doctorName}. Are you sure you want to assign ${patientName} to your care?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Assign ${patientName} (to your care)?`)) {
        return;
      }
    }

    setActionLoadingId(patientId);
    try {
      const res = await fetch('/api/doctors/assign-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign patient');
      refetch();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (patientId: number, patientName: string) => {
    if (!window.confirm(`Remove ${patientName} from your care? They will become unassigned.`)) {
      return;
    }

    setActionLoadingId(patientId);
    try {
      const res = await fetch('/api/doctors/assign-patient', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove patient');
      refetch();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Patient Overview</h2>
        <p className="text-slate-500">Monitor your assigned patients and discover unassigned cases.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">My Patients</p>
              <p className="text-2xl font-bold text-blue-900">{stats.myPatients}</p>
            </div>
            <Users className="w-8 h-8 text-blue-200" />
          </CardContent>
        </Card>
        
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">Unassigned</p>
              <p className="text-2xl font-bold text-orange-900">{stats.unassigned}</p>
            </div>
            <UserX className="w-8 h-8 text-orange-200" />
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 mb-1">Action Required</p>
              <p className="text-2xl font-bold text-red-900">{stats.actionRequired}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-200" />
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600 mb-1">Active Devices</p>
              <p className="text-2xl font-bold text-emerald-900">{stats.activeDevices}</p>
            </div>
            <Cpu className="w-8 h-8 text-emerald-200" />
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments Mini-Card */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
             Today's Appointments
             {todaysAppointments.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{todaysAppointments.length}</span>}
           </h3>
           <a href="/doctor/appointments" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">View All Schedule &rarr;</a>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {apptLoading && !apptData ? (
             <div className="p-8 text-center text-slate-500 text-sm">Loading schedule...</div>
          ) : todaysAppointments.length === 0 ? (
             <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
                 <Calendar className="w-8 h-8 text-slate-300 mb-3" />
                 No appointments scheduled for today.
             </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todaysAppointments.map((a: any) => (
                <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-4">
                     <span className="font-bold text-slate-900 w-16">{a.appointment_time}</span>
                     <div>
                       <div className="font-bold text-slate-900">{a.patient_name}</div>
                     </div>
                   </div>
                   <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border", 
                     a.type === 'emergency' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200')}>
                     {a.type.replace('_', ' ')}
                   </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mt-8 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setView('mine')}
            className={cn(
              "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors",
              view === 'mine'
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            My Patients
          </button>
          <button
            onClick={() => {
               setView('all');
               setCondition('all');
               setStatus('all');
               setSearch('');
            }}
            className={cn(
              "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors",
              view === 'all'
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            All Patients
          </button>
        </nav>
      </div>

      {view === 'all' && (
        <PatientFilterBar 
          search={search}
          setSearch={setSearch}
          condition={condition}
          setCondition={setCondition}
          status={status}
          setStatus={setStatus}
        />
      )}

      {isLoading && !responseData ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : (
        <PatientAssignmentTable 
          patients={patients} 
          view={view} 
          currentDoctorId={user?.id || 0} 
          onAssign={handleAssign}
          onRemove={handleRemove}
          actionLoadingId={actionLoadingId}
        />
      )}
    </div>
  );
}
