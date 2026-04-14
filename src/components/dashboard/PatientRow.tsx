import { Patient, User, Reading } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { classForVital, cn, formatDate } from '@/lib/utils';
import { TableRow, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useState } from 'react';

export interface PatientWithData extends Patient {
  user: User;
  doctor?: { full_name: string; specialization?: string } | null;
  latestReading: Reading | null;
  deviceLastSeenAt: string | null;
}

function deviceStatus(lastSeen: string | null): { label: string; cls: string } {
  if (!lastSeen) return { label: 'No Device', cls: 'text-slate-400' };
  const online = Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
  return online
    ? { label: 'Online', cls: 'text-emerald-600' }
    : { label: 'Offline', cls: 'text-red-500' };
}

export function PatientRow({ patient, currentUserId, onAssignChange }: { patient: PatientWithData; currentUserId?: string; onAssignChange?: () => void }) {
  const { latestReading } = patient;
  const ds = deviceStatus(patient.deviceLastSeenAt);
  const [assigning, setAssigning] = useState(false);

  const isAssignedToMe = patient.assigned_doctor_id === currentUserId;
  const isUnassigned = !patient.assigned_doctor_id;

  const handleAssign = async () => {
    setAssigning(true);
    try {
      const res = await fetch('/api/doctors/assign-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patient.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to assign patient');
      } else {
        onAssignChange?.();
      }
    } catch {
      alert('Network error');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!confirm('Are you sure you want to unassign this patient?')) return;
    setAssigning(true);
    try {
      const res = await fetch('/api/doctors/assign-patient', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patient.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to unassign patient');
      } else {
        onAssignChange?.();
      }
    } catch {
      alert('Network error');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <TableRow className={cn(latestReading && latestReading.is_abnormal === 1 && "bg-red-50/50")}>
      <TableCell className="font-medium">
        <div>{patient.user.full_name}</div>
        <div className="text-xs text-slate-500">{patient.user.email}</div>
        {patient.conditions && <div className="text-[10px] mt-1 uppercase tracking-wider text-purple-600 bg-purple-50 inline-block px-1.5 py-0.5 rounded">{patient.conditions.split(',')[0]}</div>}
        <div className={cn("text-[10px] mt-1 font-semibold", ds.cls)}>
          {'\u25CF'} Device: {ds.label}
        </div>
        {isAssignedToMe && (
          <div className="text-[10px] mt-1 font-semibold text-blue-600 bg-blue-50 inline-block px-1.5 py-0.5 rounded">Assigned to you</div>
        )}
        {isUnassigned && (
          <div className="text-[10px] mt-1 font-semibold text-amber-600 bg-amber-50 inline-block px-1.5 py-0.5 rounded">Unassigned</div>
        )}
        {!isAssignedToMe && !isUnassigned && (
          <div className="text-[10px] mt-1 font-semibold text-slate-500 bg-slate-50 inline-block px-1.5 py-0.5 rounded">Assigned to another doctor</div>
        )}
      </TableCell>
      <TableCell>
        {latestReading ? (
          <span className={cn("px-2 py-1 rounded text-xs font-semibold", classForVital(latestReading.pulse, 'pulse'))}>
            {latestReading.pulse}
          </span>
        ) : '-'}
      </TableCell>
      <TableCell>
        {latestReading ? (
          <span className={cn("px-2 py-1 rounded text-xs font-semibold", classForVital(latestReading.temperature, 'temperature'))}>
            {latestReading.temperature}
          </span>
        ) : '-'}
      </TableCell>
      <TableCell>
        {latestReading ? (
          <span className={cn("px-2 py-1 rounded text-xs font-semibold", classForVital(latestReading.oxygen, 'oxygen'))}>
            {latestReading.oxygen}
          </span>
        ) : '-'}
      </TableCell>
      <TableCell>
        {latestReading ? (
          latestReading.is_abnormal === 1 ? <Badge variant="danger">Critical</Badge> : <Badge variant="success">Normal</Badge>
        ) : <Badge variant="neutral">No Data</Badge>}
      </TableCell>
      <TableCell className="text-slate-500 text-xs text-right">
        {latestReading ? formatDate(latestReading.recorded_at) : 'Never'}
      </TableCell>
      <TableCell className="text-right space-y-1">
        {isAssignedToMe && (
          <>
            <Link href={`/doctor/${patient.id}`}>
              <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700 w-full">View</Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 w-full text-xs" onClick={handleUnassign} disabled={assigning}>
              {assigning ? '...' : 'Unassign'}
            </Button>
          </>
        )}
        {!isAssignedToMe && (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full text-xs" onClick={handleAssign} disabled={assigning}>
            {assigning ? '...' : 'Assign to Me'}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
