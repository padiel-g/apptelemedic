import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { Heart, Thermometer, Wind, Activity } from 'lucide-react';

export type VitalStatus = 'normal' | 'warning' | 'critical' | 'unknown';

export interface VitalCardProps {
  type: 'pulse' | 'temperature' | 'oxygen' | 'blood_pressure';
  value: number | null;
  secondaryValue?: number | null; // for diastolic BP
  status: VitalStatus;
  compact?: boolean;
}

const CONFIG = {
  pulse: {
    label: 'Heart Rate',
    unit: 'bpm',
    icon: Heart,
    iconColor: 'text-red-500',
  },
  temperature: {
    label: 'Temperature',
    unit: '°C',
    icon: Thermometer,
    iconColor: 'text-orange-500',
  },
  oxygen: {
    label: 'SpO2',
    unit: '%',
    icon: Wind,
    iconColor: 'text-blue-500',
  },
  blood_pressure: {
    label: 'Blood Pressure',
    unit: 'mmHg',
    icon: Activity,
    iconColor: 'text-purple-500',
  },
};

const STATUS_STYLES: Record<VitalStatus, string> = {
  normal: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  critical: 'bg-red-50 border-red-200 text-red-900',
  unknown: 'bg-slate-50 border-slate-200 text-slate-600',
};

export function VitalCard({ type, value, secondaryValue, status, compact }: VitalCardProps) {
  const config = CONFIG[type];
  const Icon = config.icon;

  const displayValue =
    type === 'blood_pressure'
      ? value != null && secondaryValue != null
        ? `${value}/${secondaryValue}`
        : '--'
      : value != null
        ? type === 'temperature'
          ? value.toFixed(1)
          : String(value)
        : '--';

  if (displayValue === '--' && status !== 'unknown') {
    // Force unknown styling if no data
    status = 'unknown';
  }

  return (
    <Card className={cn(
      'flex items-center border shadow-sm transition-all duration-200',
      STATUS_STYLES[status],
      compact ? 'p-3 gap-3' : 'p-4 gap-4'
    )}>
      <div className={cn(
        'bg-white/80 rounded-full shadow-sm flex items-center justify-center flex-shrink-0',
        compact ? 'w-10 h-10' : 'w-12 h-12'
      )}>
        <Icon className={cn(config.iconColor, compact ? 'w-4 h-4' : 'w-5 h-5')} />
      </div>
      <div className="min-w-0">
        <p className={cn(
          'font-medium opacity-80 truncate',
          compact ? 'text-[11px]' : 'text-sm'
        )}>
          {config.label}
        </p>
        <div className="flex items-baseline space-x-1">
          <span className={cn('font-bold', compact ? 'text-lg' : 'text-2xl')}>
            {displayValue}
          </span>
          <span className={cn('font-semibold opacity-70', compact ? 'text-[10px]' : 'text-xs')}>
            {config.unit}
          </span>
        </div>
      </div>
    </Card>
  );
}
