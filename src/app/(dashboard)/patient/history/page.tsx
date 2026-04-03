"use client";

import { useState } from 'react';
import { useVitals } from '@/hooks/useVitals';
import { ReadingsChart } from '@/components/dashboard/ReadingsChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { classForVital, cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function HistoryPage() {
  const { data, isLoading } = useVitals();
  const [timeRange, setTimeRange] = useState('24h');

  const readings = data?.readings || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Health History</h2>
          <p className="text-slate-500">View your past vital sign readings.</p>
        </div>
        <div className="bg-white border rounded-lg p-1 flex">
          {['1h', '6h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                timeRange === range ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
             <ReadingsChart data={readings} height={400} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reading Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Blood Pressure</TableHead>
                <TableHead>Heart Rate</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>SpO2</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">No recent readings found.</TableCell>
                </TableRow>
              )}
              {readings.map((reading) => (
                <TableRow key={reading.id}>
                  <TableCell className="font-medium">{formatDate(reading.recorded_at)}</TableCell>
                  <TableCell>
                    <span className="capitalize text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{reading.source}</span>
                  </TableCell>
                  <TableCell>
                    {reading.bp_sys && reading.bp_dia ? (
                       <span className={cn("px-2 py-1 rounded font-semibold text-xs", classForVital(reading.bp_sys, 'bp_sys'))}>
                         {reading.bp_sys}/{reading.bp_dia} <span className="font-normal opacity-70">mmHg</span>
                       </span>
                    ) : (
                       <span className="text-slate-400 text-xs">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-1 rounded font-semibold text-xs", classForVital(reading.pulse, 'pulse'))}>
                      {reading.pulse} bpm
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-1 rounded font-semibold text-xs", classForVital(reading.temperature, 'temperature'))}>
                      {reading.temperature} °C
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-1 rounded font-semibold text-xs", classForVital(reading.oxygen, 'oxygen'))}>
                      {reading.oxygen}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {reading.is_abnormal === 1 ? <Badge variant="danger">Critical</Badge> : <Badge variant="success">Normal</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
