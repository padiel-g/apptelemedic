"use client";

import { PatientWithData } from './PatientRow';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VitalsGrid } from './VitalsGrid';
import { cn, getInitials } from '@/lib/utils';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface PatientAssignmentTableProps {
  patients: PatientWithData[];
  view: 'mine' | 'all';
  currentDoctorId: string;
  onAssign: (patientId: number, patientName: string, doctorName?: string | null) => void;
  onRemove: (patientId: number, patientName: string) => void;
  actionLoadingId: number | null;
}

function PatientCard({
  p,
  view,
  isMine,
  isUnassigned,
  onAssign,
  onRemove,
  actionLoadingId,
}: {
  p: PatientWithData;
  view: 'mine' | 'all';
  isMine: boolean;
  isUnassigned: boolean;
  onAssign: PatientAssignmentTableProps['onAssign'];
  onRemove: PatientAssignmentTableProps['onRemove'];
  actionLoadingId: number | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const r = p.latestReading;
  const initials = getInitials(p.user.full_name);

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm transition-all hover:shadow-md',
      r?.is_abnormal === 1 ? 'border-red-200' : 'border-slate-200'
    )}>
      {/* Header */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
            r?.is_abnormal === 1
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          )}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 truncate">{p.user.full_name}</span>
              {isUnassigned ? (
                <Badge variant="danger">Unassigned</Badge>
              ) : isMine ? (
                <Badge variant="success">Your Patient</Badge>
              ) : (
                <span className="text-xs text-slate-500 font-medium">Dr. {p.doctor?.full_name}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {p.conditions ? (
                p.conditions.split(',').slice(0, 3).map((c, i) => (
                  <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] uppercase font-semibold rounded-full border border-purple-100">
                    {c.trim()}
                  </span>
                ))
              ) : null}
              {p.blood_type && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold rounded-full border border-slate-200">
                  {p.blood_type}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <Link href={`/doctor/${p.id}`}>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              Details
            </Button>
          </Link>
          {view === 'mine' ? (
            <Button
              variant="secondary"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              isLoading={actionLoadingId === p.id}
              onClick={() => onRemove(p.id, p.user.full_name)}
            >
              Remove
            </Button>
          ) : !isMine ? (
            <Button
              variant="primary"
              size="sm"
              isLoading={actionLoadingId === p.id}
              onClick={() => onAssign(p.id, p.user.full_name, p.doctor?.full_name)}
            >
              Assign to Me
            </Button>
          ) : null}
        </div>
      </div>

      {/* Vitals Grid (collapsible) */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          <VitalsGrid
            reading={r ? {
              pulse: r.pulse,
              temperature: r.temperature,
              oxygen: r.oxygen,
              bp_sys: r.bp_sys,
              bp_dia: r.bp_dia,
            } : null}
            lastUpdated={r?.recorded_at || null}
            showLabel
            compact
          />
        </div>
      )}
    </div>
  );
}

export function PatientAssignmentTable({ patients, view, currentDoctorId, onAssign, onRemove, actionLoadingId }: PatientAssignmentTableProps) {
  if (patients.length === 0) {
    return (
      <div className="text-center p-12 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">👥</span>
        </div>
        <h4 className="text-lg font-bold text-slate-700 mb-1">No patients found</h4>
        <p className="text-slate-500 text-sm">No patients match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patients.map(p => {
        const isMine = p.assigned_doctor_id === currentDoctorId;
        const isUnassigned = !p.assigned_doctor_id;
        return (
          <PatientCard
            key={p.id}
            p={p}
            view={view}
            isMine={isMine}
            isUnassigned={isUnassigned}
            onAssign={onAssign}
            onRemove={onRemove}
            actionLoadingId={actionLoadingId}
          />
        );
      })}
    </div>
  );
}
