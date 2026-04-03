"use client";

import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Reading } from '@/types';
import { isAbnormal } from '@/lib/utils';
import { VITAL_THRESHOLDS } from '@/lib/constants';

export function AbnormalAlert({ reading }: { reading: Reading | null }) {
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  useEffect(() => {
    if (reading && reading.id !== dismissedId) {
      setDismissedId(null);
    }
  }, [reading, dismissedId]);

  if (!reading || dismissedId === reading.id || !isAbnormal(reading)) {
    return null;
  }

  const abnormalities = [];
  if (reading.pulse < VITAL_THRESHOLDS.pulse.min || reading.pulse > VITAL_THRESHOLDS.pulse.max) {
    abnormalities.push(`Heart Rate (${reading.pulse} bpm)`);
  }
  if (reading.temperature < VITAL_THRESHOLDS.temperature.min || reading.temperature > VITAL_THRESHOLDS.temperature.max) {
    abnormalities.push(`Temperature (${reading.temperature} °C)`);
  }
  if (reading.oxygen < VITAL_THRESHOLDS.oxygen.min || reading.oxygen > VITAL_THRESHOLDS.oxygen.max) {
    abnormalities.push(`SpO2 (${reading.oxygen}%)`);
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md mt-4 flex items-start justify-between">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-red-800">Critical Vitals Alert</h3>
          <p className="mt-1 text-sm text-red-700">
            Abnormal readings detected: {abnormalities.join(', ')}. Please take necessary action.
          </p>
        </div>
      </div>
      <button 
        className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 rounded-md"
        onClick={() => setDismissedId(reading.id)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
