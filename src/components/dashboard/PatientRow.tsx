import { Patient, User, Reading } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { classForVital, cn, formatDate } from '@/lib/utils';
import { TableRow, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

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

export function PatientRow({ patient }: { patient: PatientWithData }) {
  const { latestReading } = patient;
  const ds = deviceStatus(patient.deviceLastSeenAt);
  
  return (
    <TableRow className={cn(latestReading && latestReading.is_abnormal === 1 && "bg-red-50/50")}>
      <TableCell className="font-medium">
        <div>{patient.user.full_name}</div>
        <div className="text-xs text-slate-500">{patient.user.email}</div>
        {patient.conditions && <div className="text-[10px] mt-1 uppercase tracking-wider text-purple-600 bg-purple-50 inline-block px-1.5 py-0.5 rounded">{patient.conditions.split(',')[0]}</div>}
        <div className={cn("text-[10px] mt-1 font-semibold", ds.cls)}>
          ● Device: {ds.label}
        </div>
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
      <TableCell className="text-right">
        <Link href={`/doctor/${patient.id}`}>
          <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">View</Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}
