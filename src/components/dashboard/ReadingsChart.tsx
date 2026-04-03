"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { Reading } from '@/types';
import { VITAL_THRESHOLDS } from '@/lib/constants';

interface ReadingsChartProps {
  data: Reading[];
  height?: number;
}

export function ReadingsChart({ data, height = 300 }: ReadingsChartProps) {
  const chartData = [...data].reverse().map(r => ({
    time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    pulse: r.pulse,
    temperature: r.temperature,
    oxygen: r.oxygen,
    bp_sys: r.bp_sys || null,
    bp_dia: r.bp_dia || null,
  }));

  if (chartData.length === 0) {
    return (
      <div className={`w-full flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg`} style={{ height }}>
        <p className="text-slate-400">No data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="time" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="pulse" orientation="left" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="temp" orientation="right" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} hide />
          
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '4px' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />

          <ReferenceLine yAxisId="pulse" y={VITAL_THRESHOLDS.pulse.max} stroke="#EF4444" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine yAxisId="pulse" y={VITAL_THRESHOLDS.pulse.min} stroke="#EF4444" strokeDasharray="3 3" strokeOpacity={0.5} />

          <Line yAxisId="pulse" type="monotone" dataKey="pulse" name="Heart Rate" stroke="#EF4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
          <Line yAxisId="pulse" type="monotone" dataKey="bp_sys" name="Sys BP" stroke="#8B5CF6" strokeWidth={3} dot={false} />
          <Line yAxisId="pulse" type="monotone" dataKey="bp_dia" name="Dia BP" stroke="#C4B5FD" strokeWidth={2} strokeDasharray="3 3" dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#F59E0B" strokeWidth={3} dot={false} />
          <Line yAxisId="pulse" type="monotone" dataKey="oxygen" name="SpO2 (%)" stroke="#3B82F6" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
