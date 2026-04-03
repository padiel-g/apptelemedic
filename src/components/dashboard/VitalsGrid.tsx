import { VitalCard, VitalStatus } from './VitalCard';
import { VITAL_THRESHOLDS } from '@/lib/constants';

interface VitalsReading {
  pulse?: number | null;
  temperature?: number | null;
  oxygen?: number | null;
  bp_sys?: number | null;
  bp_dia?: number | null;
}

interface VitalsGridProps {
  reading: VitalsReading | null;
  lastUpdated?: string | null;
  showLabel?: boolean;
  compact?: boolean;
}

function computeStatus(value: number | null | undefined, type: 'pulse' | 'temperature' | 'oxygen' | 'bp_sys' | 'bp_dia'): VitalStatus {
  if (value == null) return 'unknown';
  const t = VITAL_THRESHOLDS[type];
  // Critical: far outside range
  if (value < t.min * 0.85 || value > t.max * 1.15) return 'critical';
  // Warning: slightly outside
  if (value < t.min || value > t.max) return 'warning';
  return 'normal';
}

function bpStatus(sys: number | null | undefined, dia: number | null | undefined): VitalStatus {
  if (sys == null || dia == null) return 'unknown';
  const sysStatus = computeStatus(sys, 'bp_sys');
  const diaStatus = computeStatus(dia, 'bp_dia');
  // Return the worst status
  if (sysStatus === 'critical' || diaStatus === 'critical') return 'critical';
  if (sysStatus === 'warning' || diaStatus === 'warning') return 'warning';
  return 'normal';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function VitalsGrid({ reading, lastUpdated, showLabel = false, compact = false }: VitalsGridProps) {
  if (!reading) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <VitalCard type="pulse" value={null} status="unknown" compact={compact} />
          <VitalCard type="temperature" value={null} status="unknown" compact={compact} />
          <VitalCard type="oxygen" value={null} status="unknown" compact={compact} />
          <VitalCard type="blood_pressure" value={null} secondaryValue={null} status="unknown" compact={compact} />
        </div>
        {showLabel && (
          <p className="text-xs text-slate-400 mt-2">No readings recorded yet</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <VitalCard
          type="pulse"
          value={reading.pulse ?? null}
          status={computeStatus(reading.pulse, 'pulse')}
          compact={compact}
        />
        <VitalCard
          type="temperature"
          value={reading.temperature ?? null}
          status={computeStatus(reading.temperature, 'temperature')}
          compact={compact}
        />
        <VitalCard
          type="oxygen"
          value={reading.oxygen ?? null}
          status={computeStatus(reading.oxygen, 'oxygen')}
          compact={compact}
        />
        <VitalCard
          type="blood_pressure"
          value={reading.bp_sys ?? null}
          secondaryValue={reading.bp_dia ?? null}
          status={bpStatus(reading.bp_sys, reading.bp_dia)}
          compact={compact}
        />
      </div>
      {showLabel && lastUpdated && (
        <p className="text-xs text-slate-400 mt-2">Last updated: {timeAgo(lastUpdated)}</p>
      )}
    </div>
  );
}
