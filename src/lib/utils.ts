import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { VITAL_THRESHOLDS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function isAbnormal(reading: { pulse: number; temperature: number; oxygen: number; bp_sys?: number | null; bp_dia?: number | null; }): boolean {
  if (reading.pulse < VITAL_THRESHOLDS.pulse.min || reading.pulse > VITAL_THRESHOLDS.pulse.max) return true;
  if (reading.temperature < VITAL_THRESHOLDS.temperature.min || reading.temperature > VITAL_THRESHOLDS.temperature.max) return true;
  if (reading.oxygen < VITAL_THRESHOLDS.oxygen.min || reading.oxygen > VITAL_THRESHOLDS.oxygen.max) return true;
  if (reading.bp_sys != null && (reading.bp_sys < VITAL_THRESHOLDS.bp_sys.min || reading.bp_sys > VITAL_THRESHOLDS.bp_sys.max)) return true;
  if (reading.bp_dia != null && (reading.bp_dia < VITAL_THRESHOLDS.bp_dia.min || reading.bp_dia > VITAL_THRESHOLDS.bp_dia.max)) return true;
  return false;
}

export function classForVital(value: number, type: 'pulse' | 'temperature' | 'oxygen' | 'bp_sys' | 'bp_dia'): string {
  const threshold = VITAL_THRESHOLDS[type];
  if (value < threshold.min || value > threshold.max) {
    return 'text-red-500 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  }
  return 'text-emerald-500 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30';
}

export function getInitials(name: string): string {
  if (!name) return '';
  const names = name.split(' ');
  return names
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
