import { usePolling } from './usePolling';
import { Reading } from '@/types';
import { isAbnormal } from '@/lib/utils';
import { POLLING_INTERVAL } from '@/lib/constants';

interface VitalsData {
  latestReading: Reading | null;
  readings: Reading[];
  isAbnormal: boolean;
}

export function useVitals(patientId?: number) {
  const fetcher = async () => {
    const url = patientId 
      ? `/api/health-data?patient_id=${patientId}&limit=50` 
      : `/api/health-data?limit=50`;
      
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch vitals');
    const json = await res.json();
    
    // API returns { data: Reading[], total: number }
    const readings = json.data as Reading[];
    const latestReading = readings.length > 0 ? readings[0] : null;
    const abnormal = latestReading ? isAbnormal(latestReading) : false;
    
    return {
      latestReading,
      readings,
      isAbnormal: abnormal 
    } as VitalsData;
  };

  return usePolling<VitalsData>(fetcher, { interval: POLLING_INTERVAL });
}
