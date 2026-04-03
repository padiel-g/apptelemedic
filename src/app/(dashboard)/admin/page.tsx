"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminDashboard() {
  const [data, setData] = useState<{stats: any, logs: any[]}>({ stats: {}, logs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
        <p className="text-slate-500">Manage users, devices, and view system logs.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm font-medium text-slate-500">Total Users</p><p className="text-2xl font-bold">{data.stats?.users || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm font-medium text-slate-500">Patients</p><p className="text-2xl font-bold">{data.stats?.patients || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm font-medium text-slate-500">Doctors</p><p className="text-2xl font-bold">{data.stats?.doctors || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm font-medium text-slate-500">Total Readings</p><p className="text-2xl font-bold">{data.stats?.readings || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm font-medium text-slate-500">Active Devices</p><p className="text-2xl font-bold">{data.stats?.devices || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                  <TableCell>{log.user_name || 'System'}</TableCell>
                  <TableCell><span className="font-mono text-xs p-1 bg-slate-100 rounded text-slate-600">{log.action}</span></TableCell>
                  <TableCell>{log.target_type} ({log.target_id})</TableCell>
                  <TableCell className="text-xs text-slate-500">{log.details ? log.details.substring(0, 80) + '...' : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
